import { getBrowsers } from "$lib/server/getBrowsers";
import type { ElementHandle } from "puppeteer";
import type { RequestHandler } from "./$types";
import AnalysisResult from "$lib/AnalysisResult";

const commonPhrases = [
	{ language: "fi", phrases: ["eväste", "salli", "kiellä", "hyväksy", "tunniste"] },
	{ language: "en", phrases: ["cookie", "Accept", "Decline"] },
	{ language: "es", phrases: ["cookie", "Aceptar", "Rechazar"] },
	{ language: "fr", phrases: ["cookie", "Accepter", "Refuser"] },
	{ language: "sv", phrases: ["cookie", "Godkänn", "Avvisa", "Neka", "Hantera cookies"] },
];

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

async function puppeteerAnalysis(url: string) {
	console.time("Function total");
	const browsers = await getBrowsers();
	const results = [];

	for (const browser of browsers) {
		console.time("Puppeteer new page");
		const page = await browser.newPage();
		console.timeEnd("Puppeteer new page");

		console.time("Request");
		await page.goto(url, { waitUntil: "networkidle0" });
		console.timeEnd("Request");

		console.time("Find banner");
		const allPhrases = [...new Set(commonPhrases.flatMap((phrases) => phrases.phrases))];
		const xpathExpression = allPhrases.map((phrase) => `//*[contains(text(), '${phrase}')]`).join(" | ");
		const elementsWithKeyWords = (await page.$x(xpathExpression)) as ElementHandle<Element>[];
		const cookieBannerElements: ElementHandle<Element>[] = [];

		// Checks if the element is visible in the current viewport. This is to exclude for example hidden cookie settings from the initial banner detection.
		for (let i = 0; i < elementsWithKeyWords.length; i++) {
			if (await elementsWithKeyWords[i].isIntersectingViewport()) {
				console.log(await getElementOpeningTag(elementsWithKeyWords[i]));
				cookieBannerElements.push(elementsWithKeyWords[i]);
			}
		}

		const browserResolution = `${page.viewport()?.width}x${page.viewport()?.height}`;

		console.log(`Found ${cookieBannerElements.length} elements`);
		const cookieBanner = await findMostCommonAncestorWithBackgroundColor(cookieBannerElements);
		if (!cookieBanner) {
			const screenshot = (await page.screenshot({ encoding: "base64" })) as string;
			const result = new AnalysisResult(browserResolution, screenshot, false);
			results.push(result);
			console.timeEnd("Find banner");

			await page.close();

			continue;
		}

		console.log(`Found cookie banner in ${url}:`);
		const screenshot = (await cookieBanner.screenshot({ encoding: "base64" })) as string;
		console.timeEnd("Find banner");

		await page.close();
		const result = new AnalysisResult(browserResolution, screenshot, true);
		results.push(result);
	}

	console.timeEnd("Function total");
	return new Response(JSON.stringify(results));
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
 * Retrieves the opening tag of an element, including its tag name and attributes.
 * The function returns a string representation of the opening tag, e.g., \<div id="example" class="test">.
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
