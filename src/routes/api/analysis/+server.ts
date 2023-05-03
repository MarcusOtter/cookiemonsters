import type { RequestHandler } from "./$types";
import { getDesktopPage, getMobilePage } from "$lib/server/getPage";
import getErrorMessage from "$lib/utils/getErrorMessage";
import Db from "$lib/server/db/Db";
import getChecksum from "$lib/utils/getChecksum";
import isValidUrl from "$lib/utils/getURL";
import { getElementOpeningTag, getViewportSizeIndividually, getUniqueCssSelector } from "$lib/server/puppeteerHelpers";
import type { ElementHandle, Page, Protocol } from "puppeteer";
import { encode } from "gpt-3-encoder";
import { OPENAI_API_KEY } from "$env/static/private";
import { Configuration, OpenAIApi } from "openai";
import type CheckResult from "$lib/utils/CheckResult";
import { findCheckResult } from "$lib/utils/findCheckResult";
import type { CookieResult } from "$lib/CookieResult";
const configuration = new Configuration({
	apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
let desktopPage: Page;

const systemPrompt = `You are a legal assistant and your job is to:

1. Determine whether the text contains legal jargon. The text should be readable by anyone without legal knowledge. Give the result as boolean.

2. Determine whether cookies' purposes are described clearly.
For example "user experience enhancement" and "We use cookies to deliver the best possible web experience" are too vague  or misleading.

3. Determine what the main language of the text is (in ISO 639-1).

4. Determine which clickable element is used to REJECT ALL UNNECESSARY cookies.
Answer with the id provided for the element. Set to null if there is no clickable element to reject all unnecessary cookies.
Here are some examples of Reject All buttons:
{ID}-a: "Reject All"
{ID}-button: "Reject"
{ID}-a: "Kiellä"
{ID}-button: "Only allow essential cookies"
{ID}-button: "Decline optional cookies"
Buttons to "manage settings" etc are NOT considered Reject All -buttons.

5. Determine which clickable element is used to ACCEPT ALL cookies.
Answer with the id provided for the element. Set to null if there is no clickable element to accept all cookies.
Here are some examples of Accept All buttons:
{ID}-a: "Accept All"
{ID}-button: "Accept"
{ID}-a: "Salli"

6. Determine whether this cookie banner assumes a user's implied consent. Make sure that consent is not implied from normal website usage such as scrolling or using the website, and that a button click is required to give consent. Consent has to always be opt-in, not opt-out.

Give the result as boolean.

Here is an example of a cookie banner that assumes implied consent:
{ID}-p:"Our website uses cookies to make the website work well for you.", {ID}-a:"Read more about cookies.", {ID}-button:"OK"

The input is from a HTML DOM and has an index number and it's HTML-tag marked before the text of the element. Each element has the following structure:
{ID}-{TAG}:"{TEXT}"

Note that the input might contain special characters, these can be ignored. Elements are separated by commas.

Provide the output as follows:
{"legal-jargon": true, "purpose-described": false, "lang": "en", "reject-btn": 3, "accept-btn": 8, "implied-consent": true}
DO NOT OUTPUT ANY EXPLANATION OR NOTES. JUST THE JSON-OUTPUT.`;

const languageCheckPrompt = `Your job is to determine what the main language of the user's text is (in ISO 639-1). Please simply provide the language code as the ouput. DO NOT OUTPUT ANY EXPLANATION OR NOTES. JUST THE ISO 639-1 LANGUAGE CODE.

Example output: "en"`;

const apiTotalTokenLimit = 4000;
const longestPossibleOutput = 50;

export const GET = (async (request): Promise<Response> => {
	console.log(request.url.searchParams);
	let urlString = request.url.searchParams.get("url") ?? "";
	if (!urlString.startsWith("http")) {
		urlString = `https://${urlString}`;
	}

	const selector = request.url.searchParams.get("selector") ?? "";

	if (!isValidUrl(urlString)) {
		return new Response("Invalid URL", { status: 400 });
	}

	if (!selector) {
		return new Response("Selector is required", { status: 400 });
	}

	const url = new URL(urlString);

	try {
		const database = new Db();
		await database.init();
		const results = await getResults(url, selector, database);
		return new Response(JSON.stringify(results));
	} catch (e) {
		// TODO: Do not return the error message to the client for security reasons
		console.error(e);
		return new Response(getErrorMessage(e), { status: 500 });
	}
}) satisfies RequestHandler;

async function getResults(url: URL, selector: string, database: Db): Promise<unknown[]> {
	const results: unknown[] = [];

	// We have two separate pages instead of one that we resize, because according to
	// https://pptr.dev/api/puppeteer.page.setviewport a lot of websites don't expect
	// phones to change viewport size

	// On second thought, maybe we can start with a desktop page and then resize it to
	// mobile size? It would be a performance improvement and probably work (?)
	desktopPage = await getDesktopPage();
	const mobilePage = await getMobilePage();

	const requestTimeStart = performance.now();
	await desktopPage.goto(url.href, { waitUntil: "networkidle0" });
	await mobilePage.goto(url.href, { waitUntil: "networkidle0" });
	const requestTimeMs = performance.now() - requestTimeStart;

	// Add delay for debugging purposes
	// This is hardcoded now, but Oliver had a great idea:
	// we should probably retry once after a delay of 5-10s if the immediate scan did not find anything.
	// But we should only to this if the DOM has changed when waiting.
	await new Promise((r) => setTimeout(r, 5000));

	results.push({ test: `Analysis is TODO, selector: ${selector}`, hi: [], compile: requestTimeMs });
	// for (const finder of getBannerFinders()) {
	// 	const desktopResult = await finder.findBanner(desktopPage);
	// 	const mobileResult = await finder.findBanner(mobilePage);

	// 	const analysisResult = new AnalysisResult(finder.constructor.name, [desktopResult, mobileResult], requestTimeMs);
	// 	results.push(analysisResult);
	// }

	const analysisResults = await analyzeBanner(selector, database);
	console.log(JSON.stringify(analysisResults));
	await desktopPage.close();
	await mobilePage.close();

	return results;
}

/**
 * Runs the analyses for the cookie banner using the given selector.
 * @async
 * @param {string} selector - CSS selector to find the cookie banner.
 * @returns {Promise<Object>} An object containing information about the cookie banner, such as the reject button status and the nudging status.
 */
async function analyzeBanner(selector: string, database: Db): Promise<CheckResult[] | null> {
	const analysisResults: CheckResult[] = [
		{
			id: "banner-size",
			name: "Banner Size",
			description: "",
			category: "Design",
			status: "Undefined",
			resultSummary: "",
			details: null,
		},
		{
			id: "reject-button-layer",
			name: "Reject Button Layer",
			description: "Checks whether a button to reject all cookies exists and how difficult it is to get to.",
			category: "Functionality",
			status: "Undefined",
			resultSummary: "",
			details: null,
		} as CheckResult,
		{
			id: "nudging",
			name: "Nudging",
			description: "",
			category: "Design",
			status: "Undefined",
			resultSummary: "",
			details: null,
		} as CheckResult,
		{
			id: "blocking",
			name: "Blocking",
			description: "",
			category: "Design",
			status: "Undefined",
			resultSummary: "",
			details: null,
		} as CheckResult,
		{
			id: "clarity",
			name: "Text Clarity",
			description: "Checks whether the text does not contain legal jargon and that it is generally clear.",
			category: "Information",
			status: "Undefined",
			resultSummary: "",
			details: null,
		} as CheckResult,
		{
			id: "language-consistency",
			name: "Language Consistency",
			description: "Checks whether the cookie banner's language is the same as the page's.",
			category: "Accessibility",
			status: "Undefined",
			resultSummary: "",
			details: null,
		} as CheckResult,
		{
			id: "purpose",
			name: "Cookie Purpose",
			description: "Checks whether cookies' purpose is described clearly.",
			category: "Information",
			status: "Undefined",
			resultSummary: "",
			details: null,
		} as CheckResult,
		{
			id: "implied-consent",
			name: "Implied Consent",
			description: "Checks that the cookie banner doesn't assume implied consent.",
			category: "Functionality",
			status: "Undefined",
			resultSummary: "",
			details: null,
		} as CheckResult,
		{
			id: "color-contrast",
			name: "Color Contrast",
			description: "Checks that the cookie banner follows accessibility standards in color contrast.",
			category: "Accessibility",
			status: "Undefined",
			resultSummary: "",
			details: null,
		} as CheckResult,
		{
			id: "choices-respected",
			name: "Choices Respected",
			description: "Checks that the user's consent choices are respected after declining consent.",
			category: "Functionality",
			status: "Undefined",
			resultSummary: "",
			details: null,
		} as CheckResult,
		{
			id: "cookies-before-consent",
			name: "Cookies Before Consent",
			description: "Checks whether cookies are set before consent is obtained from the website’s user.",
			category: "Functionality",
			status: "Undefined",
			resultSummary: "",
			details: null,
		} as CheckResult,
	];

	/*
	
	TODO:
	- reword implied consent prompt
	- color-contrast
	- choices-respected
	- blocking check
	*/

	const cookies = await desktopPage.cookies();

	const desktopBanner = await desktopPage.$(selector);

	if (!desktopBanner) {
		return null; // TODO: Implement error handling if banner can't be found.
	}

	let cookiesBeforeConsentCheckResult = findCheckResult(analysisResults, "cookies-before-consent");
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	cookiesBeforeConsentCheckResult = await getCookiesBeforeConsent(cookies, cookiesBeforeConsentCheckResult, database);

	const bannerSizePercentage = desktopBanner ? await getBannerAreaPercentage(desktopBanner, desktopPage) : 0;
	const bannerSizeCheckResult = findCheckResult(analysisResults, "banner-size");

	bannerSizeCheckResult.resultSummary = `The cookie banner takes up ${Math.round(
		bannerSizePercentage,
	)}% of the screen.`;
	if (Math.round(bannerSizePercentage) >= 25) {
		bannerSizeCheckResult.status = "Warning";
	} else {
		bannerSizeCheckResult.status = "Pass";
	}

	const textAndTypeDesktop = await getTextAndType(desktopBanner);

	const results = [];
	const chunkSizes = [];

	for (const chunk of textAndTypeDesktop["chunks"]) {
		const gptResult = await sendChatAPIRequest(systemPrompt, chunk, longestPossibleOutput);
		if (gptResult) {
			chunkSizes.push(calculateTokens(chunk));
			results.push(JSON.parse(gptResult.content));
		}
	}

	const gptResultMerged = mergeResults(results, chunkSizes);
	console.log(`Final result: ${JSON.stringify(gptResultMerged)}`);

	const textClarityCheckResult = findCheckResult(analysisResults, "clarity");

	if (gptResultMerged["legal-jargon"]) {
		textClarityCheckResult.resultSummary = `The cookie banner seems to contain legal jargon or unclear text.`;
		textClarityCheckResult.status = "Warning";
	} else {
		textClarityCheckResult.resultSummary = `The cookie banner seems to have clear text and does not contain legal jargon.`;
		textClarityCheckResult.status = "Pass";
	}

	const purposeCheckResult = findCheckResult(analysisResults, "purpose");

	if (gptResultMerged["purpose-described"]) {
		purposeCheckResult.resultSummary = `The cookie banner seems to describe the purpose of the cookies clearly.`;
		purposeCheckResult.status = "Pass";
	} else {
		purposeCheckResult.resultSummary = `The cookie banner does not seem to describe the purpose of the cookies.`;
		purposeCheckResult.status = "Warning";
	}

	const impliedConsentCheckResult = findCheckResult(analysisResults, "implied-consent");

	if (gptResultMerged["implied-consent"]) {
		impliedConsentCheckResult.resultSummary = `The cookie banner contains wording that suggests that the user has no say in consent i.e. Implied consent.`;
		impliedConsentCheckResult.status = "Fail";
	} else {
		impliedConsentCheckResult.resultSummary = `The cookie banner does not seem contain wording of implied consent.`;
		impliedConsentCheckResult.status = "Pass";
	}

	const languageCheckResult = findCheckResult(analysisResults, "language-consistency");
	if (await checkLanguageDifference(gptResultMerged["lang"], selector)) {
		languageCheckResult.resultSummary = "The cookie banner has the same language as the website.";
		languageCheckResult.status = "Pass";
	} else {
		languageCheckResult.resultSummary = "The cookie banner's language is not the same as the website's.";
		languageCheckResult.status = "Fail";
	}

	const acceptButtonElement = textAndTypeDesktop.elementList.find(
		(element) => element.id == gptResultMerged["accept-btn"],
	);
	const rejectButtonElement = textAndTypeDesktop.elementList.find(
		(element) => element.id == gptResultMerged["reject-btn"],
	);

	const rejectButtonLayerCheckResult = findCheckResult(analysisResults, "reject-button-layer");

	if (rejectButtonElement) {
		console.log(`Reject button selector: ${JSON.stringify(rejectButtonElement.element)}`);

		rejectButtonLayerCheckResult.resultSummary = `A button to Reject All cookies was found within the cookie banner, but not on the first layer.`;
		rejectButtonLayerCheckResult.status = "Warning";

		const rejectButtonDOMElement = await desktopPage.$(rejectButtonElement.element);

		if (rejectButtonDOMElement && (await rejectButtonDOMElement.isIntersectingViewport())) {
			rejectButtonLayerCheckResult.resultSummary = `A button to Reject All cookies was found on the first layer of the cookie banner.`;
			rejectButtonLayerCheckResult.status = "Pass";
		}
	} else {
		rejectButtonLayerCheckResult.resultSummary = `A button to Reject All cookies was not found within the cookie banner.`;
		rejectButtonLayerCheckResult.status = "Fail";
	}

	const nudgingCheckResult = findCheckResult(analysisResults, "nudging");

	nudgingCheckResult.resultSummary = `This check was skipped due to the accept/decline button missing or being on different layers.`;
	nudgingCheckResult.status = "Skipped";

	if (rejectButtonElement && acceptButtonElement && rejectButtonLayerCheckResult.status == "Pass") {
		// Reject Pass check so that it isn't on another layer.
		const nudgingCheck = await checkNudging(rejectButtonElement, acceptButtonElement);
		if (nudgingCheck == "pass") {
			nudgingCheckResult.resultSummary = "The cookie banner does not nudge the user's consent decision by design.";
			nudgingCheckResult.status = "Pass";
		} else if (nudgingCheck == "warning") {
			nudgingCheckResult.resultSummary =
				"The cookie banner seems to nudge the user's consent decision by differentiating the styling of the accept/decline buttons.";
			nudgingCheckResult.status = "Warning";
		}
	}

	return analysisResults;
}

async function checkLanguageDifference(bannerLanguage: string, selector: string): Promise<boolean> {
	// TODO: Adjust these limits to strike a balance between used credits and enough linguistic information.
	const charLimit = 50;
	const numSnippets = 10;
	const snippets = await extractRandomText(desktopPage, selector, charLimit, numSnippets);

	const pageLanguage = (await sendChatAPIRequest(languageCheckPrompt, snippets.join(" "), 10))?.content;

	return pageLanguage == bannerLanguage;
}

async function extractRandomText(
	page: Page,
	selectorToExclude: string,
	charLimit: number,
	numSnippets: number,
): Promise<string[]> {
	return await page.$$eval(
		"*",
		(elements, excludeSelector, limit, count) => {
			const textTags = [
				"p",
				"h1",
				"h2",
				"h3",
				"h4",
				"h5",
				"h6",
				"span",
				"li",
				"a",
				"strong",
				"em",
				"blockquote",
				"figcaption",
				"label",
				"td",
			];
			elements = elements.filter(
				(el) =>
					textTags.includes(el.tagName.toLowerCase()) &&
					!el.closest(excludeSelector) &&
					el.textContent &&
					el.textContent.trim().length > 0,
			);
			const snippets: string[] = [];
			for (let i = 0; i < count && elements.length > 0; i++) {
				const randomIndex = Math.floor(Math.random() * elements.length);
				const randomElement = elements.splice(randomIndex, 1)[0];
				const text = randomElement.textContent!.trim().substring(0, limit);
				snippets.push(text.replace(/\s+/g, " ").trim());
			}
			return snippets;
		},
		selectorToExclude,
		charLimit,
		numSnippets,
	);
}

async function getCookiesBeforeConsent(
	cookies: Protocol.Network.Cookie[],
	cookiesBeforeConsentCheckResult: CheckResult,
	database: Db,
): Promise<CheckResult> {
	const foundCookies: CookieResult[] = [];

	for (const clientCookie of cookies) {
		const foundClientCookie = <CookieResult>{
			ClientCookie: clientCookie,
			CookieObject: undefined,
		};
		foundClientCookie.CookieObject = await database.getCookie({ cookieName: clientCookie.name });
		foundCookies.push(foundClientCookie);
	}

	const unknownCookies = foundCookies.filter((el) => el.CookieObject == undefined);
	const knownNecessaryCookies = foundCookies.filter(
		(el) => el.CookieObject != undefined && el.CookieObject.category == "Functional",
	);
	const knownUnnecessaryCookies = foundCookies.filter(
		(el) => el.CookieObject != undefined && el.CookieObject.category != "Functional",
	);

	if (knownUnnecessaryCookies.length > 0) {
		cookiesBeforeConsentCheckResult.resultSummary = `Found ${
			knownUnnecessaryCookies.length
		} known unnecessary cookie(s) ${
			unknownCookies.length > 0 ? `and ${unknownCookies.length} unknown cookie(s) ` : ""
		}before consent choice.`;
		cookiesBeforeConsentCheckResult.status = "Fail";
	} else if (unknownCookies.length > 0) {
		cookiesBeforeConsentCheckResult.resultSummary = `Found ${unknownCookies.length} unknown cookie(s) before consent choice. The necessity of these cookies should be manually checked.`;
		cookiesBeforeConsentCheckResult.status = "Warning";
	} else {
		if (knownNecessaryCookies.length > 0) {
			cookiesBeforeConsentCheckResult.resultSummary = `Found ${knownNecessaryCookies.length} cookie(s) before consent choice, but they all are known "Functional" cookies.`;
		} else {
			cookiesBeforeConsentCheckResult.resultSummary = "No cookies were set before consent choice.";
		}

		cookiesBeforeConsentCheckResult.status = "Pass";
	}

	return cookiesBeforeConsentCheckResult;
}

async function checkNudging(
	rejectButtonElement: { id?: number; tag?: string; text?: string; element: any },
	acceptButtonElement: { id?: number; tag?: string; text?: string; element: any },
) {
	const rejectButtonDOMElement = await desktopPage.$(rejectButtonElement.element);
	const acceptButtonDOMElement = await desktopPage.$(acceptButtonElement.element);

	let result = "skipped";

	if (rejectButtonDOMElement && acceptButtonDOMElement) {
		result = "warning";

		type StyleProperties = {
			background: string;
			color: string;
			fontSize: string;
			fontWeight: string;
			fontFamily: string;
			opacity: string;
		};

		const propertyList: (keyof StyleProperties)[] = [
			"background",
			"color",
			"fontSize",
			"fontWeight",
			"fontFamily",
			"opacity",
		];

		const rejectButtonStyle = await rejectButtonDOMElement.evaluate((el, propertyList) => {
			const style = getComputedStyle(el);
			const styleObject: StyleProperties = {
				background: "",
				color: "",
				fontSize: "",
				fontWeight: "",
				fontFamily: "",
				opacity: "",
			};

			for (const property of propertyList) {
				styleObject[property] = style.getPropertyValue(property);
			}
			return styleObject;
		}, propertyList);

		const acceptButtonStyle = await acceptButtonDOMElement.evaluate((el, propertyList) => {
			const style = getComputedStyle(el);
			const styleObject: StyleProperties = {
				background: "",
				color: "",
				fontSize: "",
				fontWeight: "",
				fontFamily: "",
				opacity: "",
			};

			for (const property of propertyList) {
				styleObject[property] = style.getPropertyValue(property);
			}
			return styleObject;
		}, propertyList);

		console.log(JSON.stringify(rejectButtonStyle));
		console.log(JSON.stringify(acceptButtonStyle));

		if (JSON.stringify(rejectButtonStyle) === JSON.stringify(acceptButtonStyle)) {
			result = "pass";
		}
	}
	return result;
}

/**
 * Sends a request to the OpenAI Chat API.
 * @async
 * @param {string} system - System message for the Chat API.
 * @param {string} input - User message for the Chat API.
 * @param {number} maxOutputTokens - Maximum number of tokens for the API response.
 * @returns {Promise<Object>} The message object from the API response.
 */
async function sendChatAPIRequest(system: string, input: string, maxOutputTokens: number) {
	const completion = await openai.createChatCompletion({
		model: "gpt-3.5-turbo",
		messages: [
			{ role: "system", content: system },
			{ role: "user", content: input },
		],
		max_tokens: maxOutputTokens,
		temperature: 0,
	});
	console.log(completion.data.usage);
	return completion.data.choices[0].message;
}

/**
 * Calculates the number of tokens in a given text string.
 * @param {string} text - The input text.
 * @returns {number} The number of tokens in the input text.
 */
function calculateTokens(text: string): number {
	const encoded = encode(text);

	return encoded.length;
}

/**
 * Calculates the maximum number of tokens that can be sent as input to the Chat API.
 * @returns {number} The maximum number of input tokens.
 */
function calculateInputMaxTokens(): number {
	return apiTotalTokenLimit - calculateTokens(systemPrompt) - longestPossibleOutput;
}

/**
 * Calculates the percentage of the viewport area occupied by the cookie banner.
 * @async
 * @param {ElementHandle} banner - The ElementHandle representing the cookie banner.
 * @param {Page} page - The Puppeteer Page object.
 * @returns {Promise<number>} The percentage of the viewport area occupied by the cookie banner.
 */
async function getBannerAreaPercentage(banner: ElementHandle, page: Page): Promise<number> {
	const boundingBox = await banner.boundingBox();
	const boundingBoxArea =
		(boundingBox?.width ? boundingBox?.width : 0) * (boundingBox?.height ? boundingBox?.height : 0);

	const viewportSize = getViewportSizeIndividually(page);
	const viewportArea = (viewportSize[0] ? viewportSize[0] : 0) * (viewportSize[1] ? viewportSize[1] : 0);

	return (boundingBoxArea / viewportArea) * 100;
}

/**
 * Extracts text and type information and a selector from the given element.
 * @async
 * @param {ElementHandle} element - The ElementHandle representing the element to extract information from.
 * @returns {Promise<Object>} An object containing elementList and chunks.
 */
async function getTextAndType(element: ElementHandle): Promise<{
	elementList: { id: number; tag: string; text: string; element: string }[];
	chunks: string[];
}> {
	const semanticTags = ["a", "button", "input", "select", "textarea"];

	async function traverse(
		node: ElementHandle<Element>,
		result: [string, string, string][],
		semanticTags: string[],
	): Promise<([string, string, string] | null)[]> {
		const nodeType = await node.evaluate((el) => el.nodeType);
		const textNodeType = await node.evaluate(() => Node.TEXT_NODE);
		const elementNodeType = await node.evaluate(() => Node.ELEMENT_NODE);

		if (nodeType === textNodeType) {
			const text = await node.evaluate((el) => el.textContent?.trim());
			if (text) {
				const nearestElement = await node.evaluateHandle((textNode) => {
					let currentNode = textNode.parentNode;
					while (currentNode && currentNode.nodeType !== Node.ELEMENT_NODE) {
						currentNode = currentNode.parentNode;
					}
					return currentNode;
				});

				const nearestElementHandle = nearestElement as ElementHandle<HTMLElement>;
				const tagName = await nearestElementHandle.evaluate((el) => el.tagName.toLowerCase());
				result.push([
					tagName,
					text.replace(/\s+/g, " ").trim(),
					await getUniqueCssSelector(nearestElementHandle, desktopPage),
				]);
			}
		} else if (nodeType === elementNodeType) {
			const tagName = await node.evaluate((el) => el.tagName.toLowerCase());
			if (semanticTags.includes(tagName)) {
				const textContent = await node.evaluate((el) => el.textContent?.replace(/\s+/g, " ").trim() || "");
				result.push([
					tagName,
					textContent,
					await getUniqueCssSelector(node as ElementHandle<HTMLElement>, desktopPage),
				]);
			}

			const childNodes = await node.evaluateHandle((el) => Array.from(el.childNodes));
			const children = await childNodes.getProperties();

			for (const child of children.values()) {
				const childElement = child as ElementHandle<HTMLElement>;
				await traverse(childElement, result, semanticTags);
			}
		}

		return result;
	}

	const textAndType = await traverse(element, [], semanticTags);

	const duplicates = findDuplicates(textAndType, semanticTags);
	removeDuplicates(textAndType, duplicates);

	return buildFinalElementList(textAndType);
}

/**
 * Finds duplicates in the text and type array.
 * @param {Array} textAndType - An array of text and type tuples.
 * @param {Array} semanticTags - An array of semantic HTML tags.
 * @returns {Array} An array of duplicates.
 */
function findDuplicates(textAndType: ([string, string, string] | null)[], semanticTags: string[]) {
	const duplicates: { tag: string; index: number; duplicates: { tag: string; index: number }[] }[] = [];

	const removables: number[] = [];
	textAndType.forEach((currentElement, i) => {
		const setOfDuplicates: { tag: string; index: number }[] = [];

		textAndType.forEach((compareElement, l) => {
			if (l === i) return;

			if (currentElement != null && compareElement != null && currentElement[1] === compareElement[1]) {
				setOfDuplicates.push({ tag: compareElement[0], index: l });
				removables.push(l);
			}
		});

		if (currentElement != null && setOfDuplicates.length > 0 && semanticTags.includes(currentElement[0])) {
			if (!removables.includes(i)) {
				duplicates.push({ tag: currentElement[0], index: i, duplicates: setOfDuplicates });
			}
		}
	});

	return duplicates;
}

/**
 * Removes duplicates from the text and type array.
 * @param {Array} textAndType - An array of text and type tuples.
 * @param {Array} duplicates - An array of duplicates to be removed.
 */
function removeDuplicates(
	textAndType: ([string, string, string] | null)[],
	duplicates: { tag: string; index: number; duplicates: { tag: string; index: number }[] }[],
) {
	for (const duplicate of duplicates) {
		for (const removable of duplicate["duplicates"]) {
			textAndType[removable["index"]] = null;
		}
	}
}

/**
 * Builds the final element list from the text and type array.
 * @param {Array} textAndType - An array of text and type tuples.
 * @returns {Object} An object containing the elementList and chunks.
 */
function buildFinalElementList(textAndType: ([string, string, string] | null)[]): {
	elementList: { id: number; tag: string; text: string; element: string }[];
	chunks: string[];
} {
	const finalTexts = [];
	let count = 0;
	const chunkMaxTokenSize = calculateInputMaxTokens();
	const chunks = [];
	let currentChunk = "";

	for (const tType of textAndType) {
		if (tType) {
			finalTexts.push({ id: count, tag: tType[0], text: tType[1], element: tType[2] });
			const elementText = `${count}-${tType[0]}:"${tType[1]}", `;
			if (calculateTokens(currentChunk + elementText) > chunkMaxTokenSize) {
				chunks.push(currentChunk);
				currentChunk = "";
			}
			currentChunk += elementText;
			count++;
		}
	}

	chunks.push(currentChunk); // Last chunk addition.

	return { elementList: finalTexts, chunks: chunks };
}

interface Result {
	"legal-jargon": boolean;
	"purpose-described": boolean;
	lang: string;
	"reject-btn": number | null;
	"accept-btn": number | null;
	"implied-consent": boolean;
}

/**
 * Merges multiple GPT results (in case of chunking) into a single result object.
 * @param {Array} results - An array of result objects.
 * @param {Array} inputSizes - An array of input sizes corresponding to the results.
 * @returns {Result} A merged result object.
 */
function mergeResults(results: Result[], inputSizes: number[]): Result {
	const finalResult: Result = {
		"legal-jargon": false,
		"purpose-described": false,
		lang: "",
		"reject-btn": null,
		"accept-btn": null,
		"implied-consent": true,
	};

	const langCounts: { [key: string]: number } = {};

	let rejectBtnIndex = -1;
	let acceptBtnIndex = -1;

	for (let i = 0; i < results.length; i++) {
		const result = results[i];

		// Merge legal-jargon
		finalResult["legal-jargon"] = finalResult["legal-jargon"] || result["legal-jargon"];

		// Merge purpose-described
		finalResult["purpose-described"] = finalResult["purpose-described"] || result["purpose-described"];

		// Merge language
		if (result["lang"]) {
			langCounts[result["lang"]] = (langCounts[result["lang"]] || 0) + 1;
		}

		// Merge reject-btn and accept-btn based on input size (higher weight for larger inputs)
		if (
			result["reject-btn"] !== null &&
			(finalResult["reject-btn"] === null || inputSizes[i] > inputSizes[rejectBtnIndex])
		) {
			rejectBtnIndex = i;
		}

		if (
			result["accept-btn"] !== null &&
			(finalResult["accept-btn"] === null || inputSizes[i] > inputSizes[acceptBtnIndex])
		) {
			acceptBtnIndex = i;
		}

		// Merge implied-consent
		finalResult["implied-consent"] = finalResult["implied-consent"] && result["implied-consent"];
	}

	// Determine final language
	finalResult["lang"] = Object.keys(langCounts).reduce((a, b) => (langCounts[a] >= langCounts[b] ? a : b));

	// Assign the reject-btn and accept-btn from the selected chunks
	finalResult["reject-btn"] = rejectBtnIndex >= 0 ? results[rejectBtnIndex]["reject-btn"] : null;
	finalResult["accept-btn"] = acceptBtnIndex >= 0 ? results[acceptBtnIndex]["accept-btn"] : null;

	return finalResult;
}
