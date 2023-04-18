import ViewportFindResult from "$lib/ViewportFindResult";
import type { ElementHandle, Page } from "puppeteer";
import type BannerFinder from "./BannerFinder";
import { getElementOpeningTag, getViewportSize, screenshotAsBase64 } from "../puppeteerHelpers";
import { getUniqueCommonPhrases } from "../getCommonPhrases";

export default class MarcusDensityFinder implements BannerFinder {
	/** @inheritdoc */
	async findBanner(page: Page): Promise<ViewportFindResult> {
		const startTime = performance.now();
		// const elements = await getAllElements(page);
		const phrases = getUniqueCommonPhrases();

		const xpathExpression = phrases
			.map(
				(phrase) =>
					`//*[contains(translate(string(descendant-or-self::*), 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ', 'abcdefghijklmnopqrstuvwxyzåäö'), '${phrase.toLowerCase()}')]`,
			)
			.join(" | ");
		const elementsWithKeyWords = (await page.$x(xpathExpression)) as ElementHandle<HTMLElement>[];

		console.log(elementsWithKeyWords.length, "elements with keywords");

		const body = await page.$("body");
		let bestElement: ElementHandle<HTMLElement> | null = body;
		let bestDensity = await this.getKeywordDensity(body, phrases);
		for (const element of elementsWithKeyWords) {
			if (!(await element.isIntersectingViewport())) continue;

			const density = await this.getKeywordDensity(element, phrases);
			if (density > bestDensity) {
				bestDensity = density;
				bestElement = element;
			}
		}

		const foundBanner = bestElement != body;

		const screenshot = await screenshotAsBase64(foundBanner ? bestElement : page);
		return new ViewportFindResult(
			body != bestElement,
			getViewportSize(page),
			screenshot,
			performance.now() - startTime,
		);
	}

	async calculateScore(element: ElementHandle<HTMLElement>): Promise<number> {
		throw new Error("Method not implemented.");
	}

	async getKeywordDensity(element: ElementHandle<HTMLElement> | null, phrases: string[]) {
		if (!element) return 0;

		const text = (await element.evaluate((el) => el.innerText)) ?? "";
		const regexString = `(${phrases.map((phrase) => phrase).join("|")})\\w*`;
		const regex = new RegExp(regexString, "gi");
		const matches = text.matchAll(regex) || [];
		let characterHits = 0;

		for (const match of matches) {
			characterHits += match[0].length;
		}

		console.log(`(${characterHits / text.length} density) ${await getElementOpeningTag(element)}`);
		return characterHits / text.length;
	}
}
