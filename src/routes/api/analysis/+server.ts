import type { RequestHandler } from "./$types";
import { getDesktopPage, getMobilePage } from "$lib/server/getPage";
import getErrorMessage from "$lib/utils/getErrorMessage";
import Db from "$lib/server/db/Db";
import isValidUrl from "$lib/utils/getURL";
import { getUniqueCssSelector } from "$lib/server/puppeteerHelpers";
import type { ElementHandle, Page } from "puppeteer";
import { encode } from "gpt-3-encoder";
import { BannerSizeAnalyser, type BannerSizeAnalyserParams } from "$lib/server/analysers/BannerSizeAnalyser";
import type AnalysisResult from "$lib/utils/AnalysisResult";
import {
	RejectButtonLayerAnalyser,
	type RejectButtonLayerAnalyserParams,
} from "$lib/server/analysers/RejectButtonLayerAnalyser";
import {
	CookiesBeforeConsentAnalyser,
	type CookiesBeforeConsentAnalyserParams,
} from "$lib/server/analysers/CookiesBeforeConsentAnalyser";
import { ColorContrastAnalyser, type ColorContrastAnalyserParams } from "$lib/server/analysers/ColorContrastAnalyser";
import type { GPTResult } from "$lib/server/GPTResult";
import { TextClarityAnalyser, type TextClarityAnalyserParams } from "$lib/server/analysers/TextClarityAnalyser";
import {
	ImpliedConsentAnalyser,
	type ImpliedConsentAnalyserParams,
} from "$lib/server/analysers/ImpliedConsentAnalyser";
import { PurposeAnalyser, type PurposeAnalyserParams } from "$lib/server/analysers/PurposeAnalyser";
import { sendChatAPIRequest } from "$lib/utils/ChatGPTRequst";
import { LanguageAnalyser, type LanguageAnalyserParams } from "$lib/server/analysers/LanguageAnalyser";
import { NudgingAnalyser, type NudgingAnalyserParams } from "$lib/server/analysers/NudgingAnalyser";

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

const apiTotalTokenLimit = 4000;
const longestPossibleOutput = 50;

export const GET = (async (request): Promise<Response> => {
	console.log(request.url.searchParams);
	const urlString = request.url.searchParams.get("url") ?? "";
	const selector = request.url.searchParams.get("selector") ?? "";
	const isMobile = request.url.searchParams.get("isMobile") === "on" ?? false;
	const width = parseInt(request.url.searchParams.get("width") ?? "1920");
	const height = parseInt(request.url.searchParams.get("height") ?? "1080");

	if (!isValidUrl(urlString)) return new Response("Invalid URL", { status: 400 });
	if (!selector) return new Response("Selector is required", { status: 400 });

	const url = new URL(urlString);
	const page = isMobile ? await getMobilePage(width, height, url) : await getDesktopPage(width, height, url);
	try {
		const database = new Db();
		await database.init();
		const results = await getResults(selector, database, page);
		return new Response(JSON.stringify(results));
	} catch (e) {
		// TODO: Do not return the error message to the client for security reasons
		console.error(e);
		return new Response(getErrorMessage(e), { status: 500 });
	} finally {
		await page.close();
	}
}) satisfies RequestHandler;

// TODO: Properly type this file and funcitions
async function getResults(selector: string, database: Db, page: Page): Promise<AnalysisResult<any>[] | null> {
	// Add delay for debugging purposes
	// This is hardcoded now, but Oliver had a great idea:
	// we should probably retry once after a delay of 5-10s if the immediate scan did not find anything.
	// But we should only to this if the DOM has changed when waiting.
	await new Promise((r) => setTimeout(r, 5000));

	const analysisResults = await analyzeBanner(selector, database, page);
	console.log(JSON.stringify(analysisResults));

	return analysisResults;
}

/**
 * Runs the analyses for the cookie banner using the given selector.
 * @async
 * @param {string} selector - CSS selector to find the cookie banner.
 * @returns {Promise<Object>} An object containing information about the cookie banner, such as the reject button status and the nudging status.
 */
async function analyzeBanner(selector: string, database: Db, page: Page): Promise<AnalysisResult<any>[] | null> {
	// TODO: Left to implement are the following:
	/**
	 * {
	 * id: "blocking",
		name: "Blocking",
		description: "",
		category: "Design",
		status: "Undefined",
		resultSummary: "",
		details: "",
	 * }
	 * {
		id: "choices-respected",
		name: "Choices Respected",
		description: "Checks that the user's consent choices are respected after declining consent.",
		category: "Functionality",
		status: "Undefined",
		resultSummary: "",
		details: "",
	} 

	- reword implied consent prompt
	- check that purpose check works on atoy.se and eho.fi
	*/

	const analysisResults: AnalysisResult<any>[] = [];

	const desktopBanner = await page.$(selector);

	if (!desktopBanner) {
		return null; // TODO: Implement error handling if banner can't be found.
	}

	const cookies = await page.cookies();
	const cookiesBeforeConsentResult = new CookiesBeforeConsentAnalyser(
		"cookies-before-consent",
		"Cookies Before Consent",
		"Checks whether cookies are set before consent is obtained from the website's user.",
		"Functionality",
	);
	const cookiesBeforeConsentParams: CookiesBeforeConsentAnalyserParams = {
		cookies: cookies,
		database: database,
	};

	await cookiesBeforeConsentResult.analyze(cookiesBeforeConsentParams);
	analysisResults.push(cookiesBeforeConsentResult);

	const bannerSizeResult = new BannerSizeAnalyser("banner-size", "Banner Size", "", "Design");
	const bannerSizeParams: BannerSizeAnalyserParams = {
		banner: desktopBanner,
		page: page,
	};

	await bannerSizeResult.analyze(bannerSizeParams);
	analysisResults.push(bannerSizeResult);

	const cookieBannerTextElements = await getCookieBannerTextElements(selector, page);

	const colorContrastResult = new ColorContrastAnalyser(
		"color-contrast",
		"Color Contrast",
		"Checks that the cookie banner follows accessibility standards in color contrast.",
		"Accessibility",
	);
	const colorContrastParams: ColorContrastAnalyserParams = {
		cookieBannerTextElements: cookieBannerTextElements,
	};

	await colorContrastResult.analyze(colorContrastParams);
	analysisResults.push(colorContrastResult);

	const { results, chunkSizes } = await sendChunksToChatGPT(cookieBannerTextElements);

	const gptResultMerged = mergeResults(results, chunkSizes);
	console.log(`Final result: ${JSON.stringify(gptResultMerged)}`);

	const textClarityResult = new TextClarityAnalyser(
		"clarity",
		"Text Clarity",
		"Checks whether the text does not contain legal jargon and that it is generally clear.",
		"Information",
	);
	const textClarityParams: TextClarityAnalyserParams = {
		gptResult: gptResultMerged,
	};

	await textClarityResult.analyze(textClarityParams);
	analysisResults.push(textClarityResult);

	const purposeResult = new PurposeAnalyser(
		"purpose",
		"Cookie Purpose",
		"Checks whether cookies' purpose is described clearly.",
		"Information",
	);
	const purposeParams: PurposeAnalyserParams = {
		gptResult: gptResultMerged,
	};

	await purposeResult.analyze(purposeParams);
	analysisResults.push(purposeResult);

	const impliedConsentResult = new ImpliedConsentAnalyser(
		"implied-consent",
		"Implied Consent",
		"Checks that the cookie banner doesn't assume implied consent.",
		"Functionality",
	);
	const impliedConsentParams: ImpliedConsentAnalyserParams = {
		gptResult: gptResultMerged,
	};

	await impliedConsentResult.analyze(impliedConsentParams);
	analysisResults.push(impliedConsentResult);

	const languageResult = new LanguageAnalyser(
		"language-consistency",
		"Language Consistency",
		"Checks whether the cookie banner's language is the same as the page's.",
		"Accessibility",
	);
	const languageParams: LanguageAnalyserParams = {
		gptResult: gptResultMerged,
		bannerSelector: selector,
		page: page,
	};

	await languageResult.analyze(languageParams);
	analysisResults.push(languageResult);

	const acceptButtonElement = cookieBannerTextElements.find(
		(element) => element.index == gptResultMerged["accept-btn"],
	);
	const rejectButtonElement = cookieBannerTextElements.find(
		(element) => element.index == gptResultMerged["reject-btn"],
	);

	const rejectButtonLayerResult = new RejectButtonLayerAnalyser(
		"reject-button-layer",
		"Reject Button Layer",
		"Checks whether a button to reject all cookies exists and how difficult it is to get to.",
		"Functionality",
	);
	const rejectButtonLayerParams: RejectButtonLayerAnalyserParams = {
		rejectButtonElement: rejectButtonElement,
		page: page,
	};

	await rejectButtonLayerResult.analyze(rejectButtonLayerParams);
	analysisResults.push(rejectButtonLayerResult);

	const nudgingResult = new NudgingAnalyser("nudging", "Nudging", "", "Design");
	const nudgingParams: NudgingAnalyserParams = {
		rejectButtonElement: rejectButtonElement,
		acceptButtonElement: acceptButtonElement,
		rejectButtonLayerAnalyserStatus: rejectButtonLayerResult.status,
		page: page,
	};

	await nudgingResult.analyze(nudgingParams);
	analysisResults.push(nudgingResult);

	return analysisResults;
}

async function sendChunksToChatGPT(
	cookieBannerTextElements: {
		index: number;
		tag: string;
		text: string;
		element: ElementHandle<Element>;
		selector: string;
	}[],
) {
	const chunkMaxTokenSize = calculateInputMaxTokens();
	const chunks = [];
	let currentChunk = "";

	for (const element of cookieBannerTextElements) {
		const elementText = `${element.index}-${element.tag}:"${element.text}", `;
		if (calculateTokens(currentChunk + elementText) > chunkMaxTokenSize) {
			chunks.push(currentChunk);
			currentChunk = "";
		}
		currentChunk += elementText;
	}

	chunks.push(currentChunk); // Last chunk addition.

	const results = [];
	const chunkSizes = [];

	for (const chunk of chunks) {
		console.log(chunk);
		const gptResult = await sendChatAPIRequest(systemPrompt, chunk, longestPossibleOutput);
		if (gptResult) {
			chunkSizes.push(calculateTokens(chunk));
			results.push(JSON.parse(gptResult.content));
		}
	}

	return { results, chunkSizes };
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
/*async function getBannerAreaPercentage(banner: ElementHandle, page: Page): Promise<number> {
	const boundingBox = await banner.boundingBox();
	const boundingBoxArea =
		(boundingBox?.width ? boundingBox?.width : 0) * (boundingBox?.height ? boundingBox?.height : 0);

	const viewportSize = getViewportSizeIndividually(page);
	const viewportArea = (viewportSize[0] ? viewportSize[0] : 0) * (viewportSize[1] ? viewportSize[1] : 0);

	return (boundingBoxArea / viewportArea) * 100;
}*/

async function getCookieBannerTextElements(
	bannerSelector: string,
	page: Page,
): Promise<{ index: number; tag: string; text: string; element: ElementHandle<Element>; selector: string }[]> {
	// Define relevant CSS selectors to find elements containing text
	const selectors = ["button", "a", "p", "span", "li"];

	const selector = selectors.join(",");

	// Extract text content from the elements
	const getTextContent = async (element: ElementHandle | null) => {
		if (!element) return "";
		return await page.evaluate((el) => (el ? el.textContent?.trim() : "" || ""), element);
	};

	// Find the closest ancestor element that matches the selector
	const findAncestor = async (textNode: ElementHandle, selector: string) => {
		return await page.evaluateHandle(
			(node, selector) => {
				const range = document.createRange();
				range.selectNodeContents(node);
				let container: Node | null = range.commonAncestorContainer;

				while (container && container.nodeType !== Node.ELEMENT_NODE) {
					container = container.parentNode;
				}

				return (container as Element | null)?.closest(selector);
			},
			textNode,
			selector,
		);
	};

	// Get the cookie banner's ElementHandle (replace with your own method)
	const cookieBanner = await page.$(bannerSelector);

	// Get all text nodes within the cookie banner
	const textNodes = await cookieBanner?.$x(".//text()[normalize-space()]");

	const output: { index: number; tag: string; text: string; element: ElementHandle<Element>; selector: string }[] = [];
	const seenTexts: Set<string> = new Set();
	let index = 0;

	if (textNodes) {
		for (const textNode of textNodes) {
			const ancestorElement = (await findAncestor(
				textNode as ElementHandle<Element>,
				selector,
			)) as ElementHandle<Element>;

			if (ancestorElement) {
				const textContent = await getTextContent(ancestorElement);

				if (textContent && !seenTexts.has(textContent)) {
					seenTexts.add(textContent);
					output.push({
						index: index,
						tag: await ancestorElement.evaluate((el) => el.tagName.toLowerCase()),
						text: textContent,
						element: ancestorElement,
						selector: await getUniqueCssSelector(ancestorElement as ElementHandle<HTMLElement>, page),
					});
					index++;
				}
			}
		}
	}

	return output;
}

/**
 * Merges multiple GPT results (in case of chunking) into a single result object.
 * @param {Array} results - An array of result objects.
 * @param {Array} inputSizes - An array of input sizes corresponding to the results.
 * @returns {GPTResult} A merged result object.
 */
function mergeResults(results: GPTResult[], inputSizes: number[]): GPTResult {
	const finalResult: GPTResult = {
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
