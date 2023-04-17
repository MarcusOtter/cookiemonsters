import type { ElementHandle, Page } from "puppeteer";
import type BannerFinder from "./BannerFinder";
import ViewportFindResult from "$lib/ViewportFindResult";
import { getUniqueCommonPhrases } from "../getCommonPhrases";
import { getElementOpeningTag, getViewportSize } from "../puppeteerHelpers";

export default class OliverBannerFinder implements BannerFinder {
	/** @inheritdoc */
	async findBanner(page: Page): Promise<ViewportFindResult> {
		const startTime = performance.now();
		const commonPhrases = getUniqueCommonPhrases();
		const xpathExpression = commonPhrases.map((phrase) => `//*[contains(text(), '${phrase}')]`).join(" | ");
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
		const cookieBanner = await this.findMostCommonAncestorWithBackgroundColor(cookieBannerElements);
		if (!cookieBanner) {
			const screenshot = (await page.screenshot({ encoding: "base64" })) as string;
			return new ViewportFindResult(false, getViewportSize(page), screenshot, performance.now() - startTime);
		}

		console.log(`Found cookie banner in ${page.url()}:`);
		const screenshot = (await cookieBanner.screenshot({ encoding: "base64" })) as string;

		return new ViewportFindResult(true, getViewportSize(page), screenshot, performance.now() - startTime);
	}

	/**
	 * Finds the most common ancestor element with a background color among the provided elements.
	 * The function counts the occurrences of each ancestor element with a background color
	 * and returns the element that appears most frequently.
	 *
	 * @param {ElementHandle<Element>[]} elements - Array of ElementHandles to find the common ancestor for
	 * @returns {Promise<ElementHandle | null>} Resolves to the most common ancestor element with a background color, or null if not found
	 */
	async findMostCommonAncestorWithBackgroundColor(elements: ElementHandle<Element>[]): Promise<ElementHandle | null> {
		const ancestorCounter = new Map<string, { element: ElementHandle; count: number }>();

		for (const element of elements) {
			const ancestor = await this.findAncestorWithBackgroundColor(element);
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
			const mostCommonAncestorEntry = Array.from(ancestorCounter.values()).reduce((a, b) =>
				a.count > b.count ? a : b,
			);
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
	async findAncestorWithBackgroundColor(element: ElementHandle): Promise<ElementHandle | null> {
		let currentElement = element;

		while ((await currentElement.evaluate((el) => el.tagName)) !== "HTML") {
			currentElement = (await currentElement.$$("xpath/.."))[0];
			if (await this.hasBackground(currentElement)) {
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
	async hasBackground(element: ElementHandle): Promise<boolean> {
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
}
