import ViewportFindResult from "$lib/ViewportFindResult";
import type { ElementHandle, Page } from "puppeteer";
import type BannerFinder from "./BannerFinder";
import { getUniqueCommonPhrases } from "../getCommonPhrases";
import { getDirectChildren, getElementOpeningTag, getViewportSize, screenshotAsBase64 } from "../puppeteerHelpers";

export default class MarcusBannerFinder implements BannerFinder {
	/** @inheritdoc */
	async findBanner(page: Page): Promise<ViewportFindResult> {
		console.log("\n\n##### MARCUS START #####\n\n");
		const startTime = performance.now();

		const commonPhrases = getUniqueCommonPhrases();
		const pageScreenshot = await screenshotAsBase64(page);

		// const firstElementWithMoreThanOneChild = document.querySelector(':first-child:nth-child(n+2)');
		const firstElementWithMoreThanOneChild = await page.waitForSelector(":first-child:nth-child(n+2)");

		// let element: ElementHandle<Element> | null = await page.waitForSelector("body");
		// let children = await getDirectChildren(element);
		// // Dive down all the wrappers
		// while (children.length == 1) {
		// 	element = children[0];
		// 	children = await getDirectChildren(element);
		// }

		const childrenWithHits = await this.findChildrenWithHits(page, firstElementWithMoreThanOneChild, commonPhrases);
		if (childrenWithHits.length === 1) {
			const cookieBanner = await childrenWithHits[0].$(":scope :first-child:nth-child(n+2)");
			const screenshot = cookieBanner ? await screenshotAsBase64(cookieBanner) : pageScreenshot;
			return new ViewportFindResult(!!cookieBanner, getViewportSize(page), screenshot, performance.now() - startTime);
		}

		const childKeywordDensity = childrenWithHits.map(async (child) => ({
			child,
			keywordDensity: await this.getKeywordDensity(child, commonPhrases),
		}));

		// while (childrenWithHits.length === 1) {
		// 	element = childrenWithHits[0];
		// 	childrenWithHits = await this.findChildrenWithHits(page, element, commonPhrases);
		// }

		if (childrenWithHits.length === 0) {
			return new ViewportFindResult(false, getViewportSize(page), pageScreenshot, performance.now() - startTime);
		}

		// temp
		return new ViewportFindResult(true, "1920x1080", "0", 0);
	}

	async getKeywordDensity(element: ElementHandle<Element> | null, phrases: string[]) {
		if (!element) return 0;

		let keywordHits = 0;
		const text = await element.evaluate((el) => el.textContent);
		const words = text?.split(/\s+/) ?? [];
		for (const word of words) {
			if (phrases.includes(word)) {
				keywordHits++;
			}
		}

		console.log(`(${keywordHits / words.length} density) ${await getElementOpeningTag(element)}`);
		return keywordHits / words.length;
	}

	async findChildrenWithHits(page: Page, root: ElementHandle<Element> | null, phrases: string[]) {
		if (!root) return [];

		const children = await getDirectChildren(root);
		const output: ElementHandle<Element>[] = [];

		console.log(`${await getElementOpeningTag(root)} had ${children.length} children`);
		// console.log("Keyword matches:");

		for (const child of children) {
			const text = await page.evaluate((child) => child.textContent, child);

			let hits = 0;
			for (const phrase of phrases) {
				if (text?.includes(phrase)) {
					hits++;
				}
			}

			// console.log(`(${hits}) - ${await getElementOpeningTag(child)}`);

			if (hits > 0) {
				output.push(child);
			}
		}

		return output;
	}
}
