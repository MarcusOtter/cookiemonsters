import { getBrowser } from "$lib/server/getBrowser";
import type { ElementHandle, Page } from "puppeteer";
import type { RequestHandler } from "./$types";
import AnalysisResult from "$lib/AnalysisResult";
import CLD from "cld";

type LanguagePhrases = {
	[key: string]: string[];
};

const commonPhrases: LanguagePhrases = {
	fi: ["eväste", "salli", "kiellä", "hyväksy", "tunniste"],
	en: ["cookie", "Accept", "Decline"],
	es: ["cookie", "Aceptar", "Rechazar"],
	fr: ["cookie", "Accepter", "Refuser"],
	sv: ["cookie", "Godkänn", "Avvisa", "Neka", "Hantera cookies"],
};

export const GET = ((request) => {
	let url = request.url.searchParams.get("url");
	if (!url) {
		return new Response("No URL provided", { status: 400 });
	}

	if (!url.startsWith("http")) {
		url = `https://${url}`;
	}

	return puppeteerAnalysis(url);
}) satisfies RequestHandler;

async function detectLanguage(text: string) {
	const result = await CLD.detect(text);
	return result["languages"][0]["code"];
}

async function puppeteerAnalysis(url: string) {
	console.time("Function total");

	console.time("Puppeteer init");
	const browser = await getBrowser();
	const page = await browser.newPage();
	console.timeEnd("Puppeteer init");

	console.time("Request");
	/*await page.setExtraHTTPHeaders({
        'Accept-Language': 'en'
    });*/
	await page.goto(url, { waitUntil: "networkidle0" });
	await waitTillHTMLRendered(page);

	//const screenshot = await page.screenshot({ encoding: "base64" });

	const headings = await page.$$("h1, h2, h3, h4, h5, h6");
	const headingStructure = await getHeadingStructure(headings);

	console.timeEnd("Request");

	// TODO: add analysis code

	// Code analysis starts

	const body = await page.waitForSelector("body"); // select the element

	if (!body) {
		return new Response("Body not found", { status: 400 }); // Temporary
	}
	const bodyText = await getVisibleText(body);

	if (!bodyText) {
		return new Response("Body text empty, could not detect language", { status: 400 }); // Temporary
	}

	let language = await detectLanguage(bodyText);
	console.log(`Found language: ${language}`);

	if (!(language in commonPhrases)) {
		language = "en"; // Temporary, while we don't have all languages.
	}

	const xpathExpression = commonPhrases[language].map((phrase) => `//*[contains(text(), '${phrase}')]`).join(" | ");

	const elementsWithKeyWords = (await page.$x(xpathExpression)) as ElementHandle<Element>[];

	const cookieBannerElements: ElementHandle<Element>[] = [];

	// Checks if the element is visible in the current viewport. This is to exclude for example hidden cookie settings from the initial banner detection.
	for (let i = 0; i < elementsWithKeyWords.length; i++) {
		if (await elementsWithKeyWords[i].isIntersectingViewport()) {
			console.log(await getElementOpeningTag(elementsWithKeyWords[i]));
			cookieBannerElements.push(elementsWithKeyWords[i]);
		}
	}

	console.log(`Found ${cookieBannerElements.length} elements`);

	const cookieBanner = await findMostCommonAncestorWithBackgroundColor(cookieBannerElements);

	if (!cookieBanner) {
		return new Response("Cookie banner not found", { status: 400 }); // Temporary
	}

	console.log(`Found cookie banner in ${url}:`);

	const screenshot = (await cookieBanner.screenshot({ encoding: "base64" })) as string;

	// Code analysis ends

	await page.close();

	console.timeEnd("Function total");

	const result = new AnalysisResult(headingStructure, screenshot);
	return new Response(JSON.stringify(result));
}

async function getHeadingStructure(headings: ElementHandle<HTMLHeadingElement>[]) {
	let output = ".\n";
	for (let i = 0; i < headings.length; i++) {
		const heading = headings[i];

		const tag = await heading.getProperty("tagName");
		const tagAsString = await tag.jsonValue();
		const level = parseInt(tagAsString.slice(1));

		const nextHeadingTag = ((await headings[i + 1]?.getProperty("tagName")) ?? Promise.resolve()).toString();
		const nextLevel = parseInt(nextHeadingTag.slice(1)) ?? 0;

		const indentation = "    ".repeat(level - 1);
		const tree = nextLevel === level ? "├── " : "└── ";

		const headingText = (await (await heading.getProperty("innerText")).jsonValue()).toString().replaceAll("\n", " ");

		if (headingText.trim() === "") {
			continue;
		}

		output += `${indentation}${tree}(h${level}) ${headingText.trim()}\n`;
	}

	return output;
}

/**
 * Finds the most common ancestor element with a background color among the provided elements.
 * The function counts the occurrences of each ancestor element with a background color
 * and returns the element that appears most frequently.
 *
 * @param {ElementHandle<Element>[]} elements - Array of ElementHandles to find the common ancestor for
 * @returns {Promise<ElementHandle | null>} Resolves to the most common ancestor element with a background color, or null if not found
 */
async function findMostCommonAncestorWithBackgroundColor(
	elements: ElementHandle<Element>[],
): Promise<ElementHandle | null> {
	const ancestorCounter = new Map<string, { element: ElementHandle; count: number }>();

	for (const element of elements) {
		const ancestor = await findAncestorWithBackgroundColor(element);
		if (ancestor !== null) {
			const objectId = await getElementOpeningTag(ancestor);
			const counterEntry = ancestorCounter.get(objectId);
			if (counterEntry) {
				counterEntry.count += 1;
			} else {
				ancestorCounter.set(objectId, { element: ancestor, count: 1 });
			}
		}
	}

	console.log(ancestorCounter.entries());

	if (ancestorCounter.size > 0) {
		const mostCommonAncestorEntry = Array.from(ancestorCounter.values()).reduce((a, b) => (a.count > b.count ? a : b));
		return mostCommonAncestorEntry.element;
	} else {
		return null;
	}
}

/**
 * Traverses up the DOM tree from the given element and finds the first ancestor element with a background color.
 *
 * @param {ElementHandle} element - Starting ElementHandle to find the ancestor with a background color
 * @returns {Promise<ElementHandle | null>} Resolves to the first ancestor element with a background color, or null if not found
 */
async function findAncestorWithBackgroundColor(element: ElementHandle): Promise<ElementHandle | null> {
	let currentElement = element;

	while ((await currentElement.evaluate((el) => el.tagName)) !== "HTML") {
		currentElement = (await currentElement.$$("xpath/.."))[0];
		if (await hasBackground(currentElement)) {
			return currentElement;
		}
	}

	return null;
}

/**
 * Checks whether the given element has a background color that is not fully transparent.
 *
 * @param {ElementHandle} element - ElementHandle to check for the background color
 * @returns {Promise<boolean>} Resolves to true if the element has a non-transparent background color, false otherwise
 */
async function hasBackground(element: ElementHandle): Promise<boolean> {
	const style = await element.evaluate((el) => {
		const style = getComputedStyle(el);
		const backgroundColor = style.getPropertyValue("background-color");
		const background = style.getPropertyValue("background");
		const display = style.getPropertyValue("display");
		return { backgroundColor, background, display };
	});

	if (style.display == "none") {
		return false;
	}

	return !style.backgroundColor.includes("rgba(0, 0, 0, 0)");
}

/**
 * Extracts visible text from the given element and its descendants, excluding text from hidden elements.
 * The function recursively traverses through the element's child nodes and collects text content,
 * ignoring any text from elements with styles such as display: none, visibility: hidden, or opacity: 0.
 *
 * @param {ElementHandle} element - ElementHandle to extract visible text from
 * @returns {Promise<string>} Resolves to the visible text content of the element
 */
async function getVisibleText(element: ElementHandle): Promise<string> {
	return await element.evaluate((el) => {
		const collectVisibleText = (element: HTMLElement): string => {
			let visibleText = "";

			Array.from(element.childNodes).forEach((child) => {
				if (child.nodeType === Node.TEXT_NODE) {
					visibleText += (child as Text).textContent;
				} else if (child.nodeType === Node.ELEMENT_NODE) {
					const childElement = child as HTMLElement;
					const style = getComputedStyle(childElement);
					if (
						style.display !== "none" &&
						style.visibility !== "hidden" &&
						style.opacity !== "0" &&
						childElement.tagName.toLowerCase() !== "script" &&
						childElement.tagName.toLowerCase() !== "style"
					) {
						visibleText += collectVisibleText(childElement);
					}
				}
			});

			return visibleText;
		};

		return collectVisibleText(el as HTMLElement);
	});
}

/**
 * Retrieves the opening tag of an element, including its tag name and attributes.
 * The function returns a string representation of the opening tag, e.g., '<div id="example" class="test">'.
 *
 * @param {ElementHandle} element - ElementHandle to get the opening tag for
 * @returns {Promise<string>} Resolves to the opening tag of the element as a string
 */
async function getElementOpeningTag(element: ElementHandle): Promise<string> {
	return await element.evaluate((el) => {
		const openingTag = `<${el.tagName.toLowerCase()}${[...el.attributes]
			.map((attr) => ` ${attr.name}="${attr.value}"`)
			.join("")}>`;

		return openingTag;
	});
}

/**
 * Waits for the HTML content of the page to stabilize/render completely.
 * The function checks if the size of the HTML content remains the same for
 * a given number of iterations (minStableSizeIterations) with a specified
 * duration between checks (checkDurationMsecs). If the size remains stable
 * for the minimum iterations, the function assumes the content is fully rendered.
 *
 * @param {Page} page - Puppeteer Page object to monitor
 * @param {number} timeout - Maximum time (in ms) to wait for the HTML to stabilize (default: 30000 ms)
 * @returns {Promise<void>} Resolves when the HTML content is considered stable
 */
async function waitTillHTMLRendered(page: Page, timeout = 30000): Promise<void> {
	const checkDurationMsecs = 1000;
	const maxChecks = timeout / checkDurationMsecs;
	let lastHTMLSize = 0;
	let checkCounts = 1;
	let countStableSizeIterations = 0;
	const minStableSizeIterations = 3;

	while (checkCounts++ <= maxChecks) {
		const html = await page.content();
		const currentHTMLSize = html.length;

		const bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);

		console.log("last: ", lastHTMLSize, " <> curr: ", currentHTMLSize, " body html size: ", bodyHTMLSize);

		if (lastHTMLSize !== 0 && currentHTMLSize === lastHTMLSize) {
			countStableSizeIterations++;
		} else {
			countStableSizeIterations = 0; // reset the counter
		}

		if (countStableSizeIterations >= minStableSizeIterations) {
			console.log("Page rendered fully..");
			break;
		}

		lastHTMLSize = currentHTMLSize;
		await page.waitForTimeout(checkDurationMsecs);
	}
}
