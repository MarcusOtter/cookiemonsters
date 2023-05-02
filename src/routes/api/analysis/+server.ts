import type { RequestHandler } from "./$types";
import { getDesktopPage, getMobilePage } from "$lib/server/getPage";
import getBannerFinders from "$lib/server/finders/getBannerFinders";
import getErrorMessage from "$lib/utils/getErrorMessage";
import Db from "$lib/server/db/Db";
import getChecksum from "$lib/utils/getChecksum";
import isValidUrl from "$lib/utils/getURL";
import { getElementOpeningTag, getViewportSizeIndividually, getUniqueCssSelector } from "$lib/server/puppeteerHelpers";
import type { ElementHandle, Page } from "puppeteer";
import { encode } from "gpt-3-encoder";
import { OPENAI_API_KEY } from "$env/static/private";
import { Configuration, OpenAIApi } from "openai";
const configuration = new Configuration({
	apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

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
		const results = await getResults(url, selector);
		return new Response(JSON.stringify(results));
	} catch (e) {
		// TODO: Do not return the error message to the client for security reasons
		console.error(e);
		return new Response(getErrorMessage(e), { status: 500 });
	}
}) satisfies RequestHandler;

async function getResults(url: URL, selector: string): Promise<unknown[]> {
	const results: unknown[] = [];

	// We have two separate pages instead of one that we resize, because according to
	// https://pptr.dev/api/puppeteer.page.setviewport a lot of websites don't expect
	// phones to change viewport size

	// On second thought, maybe we can start with a desktop page and then resize it to
	// mobile size? It would be a performance improvement and probably work (?)
	const desktopPage = await getDesktopPage();
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

	const desktopBanner = await desktopPage.$(selector);

	const cookieBannerSizePercentageDesktop = desktopBanner
		? await getBannerAreaPercentage(desktopBanner, desktopPage)
		: 0;

	console.log(`Cookie banner takes ${cookieBannerSizePercentageDesktop}% of the viewport on Desktop.`); // RESULT: Banner size

	// Need to add more explanation to this.
	const legalJargonPrompt = `You are a legal assistant and your job is to determine whether the text contains legal jargon. The text should be readable by anyone without legal knowledge. Give the result as boolean.

The input is from a HTML DOM and has an index number and it's HTML-tag marked before the text of the element. Each element has the following structure:
{ID}-{TAG}:"{TEXT}"

Note that the input might contain special characters, these can be ignored. Elements are separated by commas.

Provide the output as follows:
{"legal-jargon": true}
DO NOT OUTPUT ANY EXPLANATION OR NOTES. JUST THE JSON-OUTPUT.`;

	const cookiePurposePrompt = `You are a legal assistant and your job is to determine whether cookies' purposes are described clearly.

For example "user experience enhancement" and "We use cookies to deliver the best possible web experience" are too vague  or misleading.

The input is from a HTML DOM and has an index number and it's HTML-tag marked before the text of the element. Each element has the following structure:
{ID}-{TAG}:"{TEXT}"

Note that the input might contain special characters, these can be ignored. Elements are separated by commas.

Provide the output as follows:
{"purpose-described": true}
DO NOT OUTPUT ANY EXPLANATION OR NOTES. JUST THE JSON-OUTPUT.`;

	const lanuagePrompt = `You are a legal assistant and your job is to determine what the main language of the text is (in ISO 639-1).

The input is from a HTML DOM and has an index number and it's HTML-tag marked before the text of the element. Each element has the following structure:
{ID}-{TAG}:"{TEXT}"

Note that the input might contain special characters, these can be ignored. Elements are separated by commas.

Provide the output as follows:
{"lang": "en"}
DO NOT OUTPUT ANY EXPLANATION OR NOTES. JUST THE JSON-OUTPUT.`;

	const rejectAllPrompt = `You are a legal assistant and your job is to determine which clickable element is used to REJECT ALL UNNECESSARY cookies.

Answer with the id provided for the element. Set to null if there is no clickable element to reject all unnecessary cookies.

Here are some examples of Reject All buttons:

{ID}-a: "Reject All"
{ID}-button: "Reject"
{ID}-a: "Kiellä"

Buttons to "manage settings" etc are NOT considered Reject All -buttons.

The input is from a HTML DOM and has an index number and it's HTML-tag marked before the text of the element. Each element has the following structure:
{ID}-{TAG}:"{TEXT}"

Note that the input might contain special characters, these can be ignored. Elements are separated by commas.

Provide the output as follows:
{"reject-btn": 3}
DO NOT OUTPUT ANY EXPLANATION OR NOTES. JUST THE JSON-OUTPUT.`;

	const acceptAllPrompt = `You are a legal assistant and your job is to determine which clickable element is used to ACCEPT ALL cookies.

Answer with the id provided for the element. Set to null if there is no clickable element to accept all cookies.

Here are some examples of Accept All buttons:

{ID}-a: "Accept All"
{ID}-button: "Accept"
{ID}-a: "Salli"

The input is from a HTML DOM and has an index number and it's HTML-tag marked before the text of the element. Each element has the following structure:
{ID}-{TAG}:"{TEXT}"

Note that the input might contain special characters, these can be ignored. Elements are separated by commas.

Provide the output as follows:
{"accept-btn": 3}
DO NOT OUTPUT ANY EXPLANATION OR NOTES. JUST THE JSON-OUTPUT.`;

	const impliedConsent = `You are a legal assistant and your job is to determine whether this cookie banner assumes a user's implied consent. Make sure that consent is not implied from normal website usage such as scrolling or using the website, and that a button click is required to give consent. Consent has to always be opt-in, not opt-out.

Give the result as boolean.

Here is an example of a cookie banner that assumes implied consent:
{ID}-p:"Our website uses cookies to make the website work well for you.", {ID}-a:"Read more about cookies.", {ID}-button:"OK"

The input is from a HTML DOM and has an index number and it's HTML-tag marked before the text of the element. Each element has the following structure:
{ID}-{TAG}:"{TEXT}"

Note that the input might contain special characters, these can be ignored. Elements are separated by commas.

Provide the output as follows:
{"implied-consent": true}
DO NOT OUTPUT ANY EXPLANATION OR NOTES. JUST THE JSON-OUTPUT.`;

	if (desktopBanner) {
		const textAndTypeDesktop = await getTextAndType(desktopBanner);

		const results = [];
		const chunkSizes = [];

		for (const chunk of textAndTypeDesktop["chunks"]) {
			console.log(chunk);
			const gptResult = ""; //await sendChatAPIRequest(systemPrompt, chunk, longestPossibleOutput);
			console.log(`Chunk check: ${JSON.stringify(gptResult)}`);
			if (gptResult) {
				chunkSizes.push(calculateTokens(chunk));
				results.push(JSON.parse(gptResult)); //.content));
			}
			/*console.log(
				`Language check: ${JSON.stringify(await sendChatAPIRequest(lanuagePrompt, chunk, longestPossibleOutput))}`,
			);
			console.log(
				`Legal Jargon check: ${JSON.stringify(
					await sendChatAPIRequest(legalJargonPrompt, chunk, longestPossibleOutput),
				)}`,
			);
			console.log(
				`Cookie purpose check: ${JSON.stringify(
					await sendChatAPIRequest(cookiePurposePrompt, chunk, longestPossibleOutput),
				)}`,
			);
			console.log(
				`Reject All check: ${JSON.stringify(await sendChatAPIRequest(rejectAllPrompt, chunk, longestPossibleOutput))}`,
			);
			console.log(
				`Accept All check: ${JSON.stringify(await sendChatAPIRequest(acceptAllPrompt, chunk, longestPossibleOutput))}`,
			);
			console.log(
				`Implied Consent check: ${JSON.stringify(
					await sendChatAPIRequest(impliedConsent, chunk, longestPossibleOutput),
				)}`,
			);*/
		}

		//mergeResults
		const result = mergeResults(results, chunkSizes);
		console.log(`Final result: ${JSON.stringify(result)}`);

		const acceptButtonElement = textAndTypeDesktop.elementList.find((element) => element.id == result["accept-btn"]);
		const rejectButtonElement = textAndTypeDesktop.elementList.find((element) => element.id == result["reject-btn"]);

		if (acceptButtonElement) {
			console.log(`Accept button selector: ${JSON.stringify(acceptButtonElement.element)}`);
		}

		if (rejectButtonElement) {
			console.log(`Reject button selector: ${JSON.stringify(rejectButtonElement.element)}`);
		}
	}
	/*if (mobileBanner) {
		const textAndTypeMobile = await getTextAndType(mobileBanner);
	}*/

	// TODO: Check if desktop and mobile banner are identical, if so, do the text analysis only once.

	await desktopPage.close();
	await mobilePage.close();

	return results;
}

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

function calculateTokens(text: string): number {
	const encoded = encode(text);

	return encoded.length;
}

function calculateInputMaxTokens(): number {
	return apiTotalTokenLimit - calculateTokens(systemPrompt) - longestPossibleOutput;
}

async function getBannerAreaPercentage(banner: ElementHandle, page: Page): Promise<number> {
	const boundingBox = await banner.boundingBox();
	const boundingBoxArea =
		(boundingBox?.width ? boundingBox?.width : 0) * (boundingBox?.height ? boundingBox?.height : 0);

	const viewportSize = getViewportSizeIndividually(page);
	const viewportArea = (viewportSize[0] ? viewportSize[0] : 0) * (viewportSize[1] ? viewportSize[1] : 0);

	return (boundingBoxArea / viewportArea) * 100;
}

async function getTextAndType(element: ElementHandle): Promise<{
	elementList: { id: number; tag: string; text: string; element: ElementHandle<Element> }[];
	chunks: string[];
}> {
	const semanticTags = ["a", "button", "input", "select", "textarea"];
	console.log("starting tt");
	/*const textAndType = await element.evaluate(async (el, semanticTags) => {
		async function traverse(
			node: Node,
			result: [string, string, HTMLElement][],
			semanticTags: string[],
		): Promise<([string, string, HTMLElement] | null)[]> {
			const nodeElement = node as HTMLElement;
			if (node.nodeType === Node.TEXT_NODE) {
				const text = node.textContent?.trim();
				if (text) {
					result.push(["p", text.replace(/\s+/g, " ").trim(), nodeElement]);
				}
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				const tagName = nodeElement.tagName.toLowerCase();

				if (semanticTags.includes(tagName)) {
					result.push([tagName, nodeElement.textContent?.replace(/\s+/g, " ").trim() || "", nodeElement]);
				}

				for (const child of Array.from(nodeElement.childNodes)) {
					await traverse(child, result, semanticTags);
				}
			}

			return result;
		}
		return await traverse(el, [], semanticTags);
	}, semanticTags);*/

	async function traverse(
		node: ElementHandle<Element>,
		result: [string, string, ElementHandle<Element>][],
		semanticTags: string[],
	): Promise<([string, string, ElementHandle<Element>] | null)[]> {
		const nodeType = await node.evaluate((el) => el.nodeType);
		const textNodeType = await node.evaluate(() => Node.TEXT_NODE);
		const elementNodeType = await node.evaluate(() => Node.ELEMENT_NODE);

		console.log("test");
		if (nodeType === textNodeType) {
			const text = await node.evaluate((el) => el.textContent?.trim());
			if (text) {
				result.push(["p", text.replace(/\s+/g, " ").trim(), node]);
			}
		} else if (nodeType === elementNodeType) {
			const tagName = await node.evaluate((el) => el.tagName.toLowerCase());
			if (semanticTags.includes(tagName)) {
				const textContent = await node.evaluate((el) => el.textContent?.replace(/\s+/g, " ").trim() || "");
				result.push([tagName, textContent, node]);
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
	console.log("starting traverse");
	const textAndType = await traverse(element, [], semanticTags);

	const duplicates = findDuplicates(textAndType, semanticTags);

	removeDuplicates(textAndType, duplicates);

	return buildFinalElementList(textAndType);
}

function findDuplicates(textAndType: ([string, string, ElementHandle<Element>] | null)[], semanticTags: string[]) {
	const duplicates: { tag: string; index: number; duplicates: { tag: string; index: number }[] }[] = [];

	textAndType.forEach((currentElement, i) => {
		const setOfDuplicates: { tag: string; index: number }[] = [];

		textAndType.forEach((compareElement, l) => {
			if (l === i) return;

			if (currentElement != null && compareElement != null && currentElement[1] === compareElement[1]) {
				setOfDuplicates.push({ tag: compareElement[0], index: l });
			}
		});

		if (currentElement != null && setOfDuplicates.length > 0 && semanticTags.includes(currentElement[0])) {
			duplicates.push({ tag: currentElement[0], index: i, duplicates: setOfDuplicates });
		}
	});

	return duplicates;
}

function removeDuplicates(
	textAndType: ([string, string, ElementHandle<Element>] | null)[],
	duplicates: { tag: string; index: number; duplicates: { tag: string; index: number }[] }[],
) {
	for (const duplicate of duplicates) {
		for (const removable of duplicate["duplicates"]) {
			textAndType[removable["index"]] = null;
		}
	}
}

function buildFinalElementList(textAndType: ([string, string, ElementHandle<Element>] | null)[]): {
	elementList: { id: number; tag: string; text: string; element: ElementHandle<Element> }[];
	chunks: string[];
} {
	const finalTexts = [];
	let count = 0;
	const chunkMaxTokenSize = calculateInputMaxTokens();
	console.log(`Chunk's Max Token size is ${chunkMaxTokenSize}`);
	const chunks = [];
	let currentChunk = "";

	for (const tType of textAndType) {
		if (tType) {
			console.log(tType[2]);
			console.log(typeof tType[2]);
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

	// TODO: The finalText is too simple rn. Should chunk it simultaneously to control prompt size.
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
