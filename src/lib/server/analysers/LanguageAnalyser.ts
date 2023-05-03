import type AnalysisResult from "$lib/utils/AnalysisResult";
import type { Page } from "puppeteer";
import type { GPTResult } from "../GPTResult";
import { sendChatAPIRequest } from "$lib/utils/ChatGPTRequst";

export interface LanguageAnalyserParams {
	gptResult: GPTResult;
	bannerSelector: string;
	page: Page;
}

export class LanguageAnalyser implements AnalysisResult<LanguageAnalyserParams> {
	id: string;
	name: string;
	description: string;
	category: string;
	status: "Pass" | "Fail" | "Warning" | "Skipped" | "Undefined";
	resultSummary: string;
	details: string;

	constructor(id: string, name: string, description: string, category: string) {
		this.id = id;
		this.name = name;
		this.description = description;
		this.category = category;
		this.status = "Undefined";
		this.resultSummary = "";
		this.details = "";
	}

	async analyze(params: LanguageAnalyserParams) {
		if (await checkLanguageDifference(params.gptResult["lang"], params.bannerSelector, params.page)) {
			this.resultSummary = "The cookie banner has the same language as the website.";
			this.status = "Pass";
		} else {
			this.resultSummary = "The cookie banner's language is not the same as the website's.";
			this.status = "Fail";
		}
	}
}

async function checkLanguageDifference(bannerLanguage: string, selector: string, page: Page): Promise<boolean> {
	const languageCheckPrompt = `Your job is to determine what the main language of the user's text is (in ISO 639-1). Please simply provide the language code as the ouput. DO NOT OUTPUT ANY EXPLANATION OR NOTES. JUST THE ISO 639-1 LANGUAGE CODE.

Example output: "en"`;

	// TODO: Adjust these limits to strike a balance between used credits and enough linguistic information.
	const charLimit = 50;
	const numSnippets = 10;
	const snippets = await extractRandomText(page, selector, charLimit, numSnippets);

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
