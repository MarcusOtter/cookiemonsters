import type { ElementHandle, Page } from "puppeteer";
import type BannerFinder from "./BannerFinder";
import { getElementOpeningTag, getElementsWithWords, getUniqueCssSelector } from "../puppeteerHelpers";
import { getUniqueCommonPhrases } from "../getCommonPhrases";

// This is the main idea:
// 1. Find all elements with at least one text match (in chilren or itself)
// 2. From the results, pick the element with the largest z-index
// 2.5 If there is a tie, pick the element with a fully opaque background color (this one is a bit weird, should probably refine)
// 3. Descend down the children of the element, until we find an element with an opaque background color

// TODO: Needs a big refactor.
export default class MarcusUltraFinder implements BannerFinder {
	/** @inheritdoc */
	async findBannerSelector(page: Page): Promise<string> {
		console.log("##### MARCUS ULTRA START #####");

		// Find all elements with at least one text match (in chilren or itself) (this is a bit slow)
		const keywords = getUniqueCommonPhrases();
		const elements = await getElementsWithWords(page, keywords, { includeChildren: true });

		// Pick the element with the largest z-index
		let bestElements: ElementHandle<Element>[] = [];
		let highestZIndex = -Infinity;
		for (const element of elements) {
			const zIndex = await element.evaluate((el) => {
				const zIndex = window.getComputedStyle(el).zIndex;
				return zIndex === "auto" ? 0 : parseInt(zIndex);
			});

			if (!(await element.isIntersectingViewport())) {
				continue;
			}

			if (zIndex == highestZIndex) {
				bestElements.push(element);
				continue;
			}

			if (zIndex > highestZIndex) {
				highestZIndex = zIndex;
				bestElements = [element];
			}
		}

		if (highestZIndex <= 0) {
			console.log("No elements with z-index > 0");
			return "";
		}

		console.log("Best elements length:", bestElements.length);

		let bestElement = undefined;
		if (bestElements.length === 1) {
			bestElement = bestElements[0];
		} else {
			// If there is a tie, pick the element with a fully opaque background color (broken for youtube.com on mobile)
			console.log("THERE WAS A TIE BETWEEN ", bestElements.length, " ELEMENTS");
			console.log(await Promise.all(bestElements.map(getElementOpeningTag)));
			for (const element of bestElements) {
				const isOpaque = await element.evaluate((el) => {
					const backgroundColor = window.getComputedStyle(el).getPropertyValue("background-color");
					const backgroundImage = window.getComputedStyle(el).getPropertyValue("background-image");

					const colorIsOpaque = !backgroundColor.startsWith("rgba") || backgroundColor.endsWith(", 1)");
					const hasImage = backgroundImage !== "none";
					return colorIsOpaque || hasImage;
				});

				if (isOpaque) {
					bestElement = element;
					break;
				}
			}
		}

		async function searchForOpaqueElement(element: ElementHandle<Element>): Promise<ElementHandle<Element> | null> {
			const currentIsOpaque = await element.evaluate((el) => {
				const backgroundColor = window.getComputedStyle(el).getPropertyValue("background-color");
				const backgroundImage = window.getComputedStyle(el).getPropertyValue("background-image");

				const colorIsOpaque = !backgroundColor.startsWith("rgba") || backgroundColor.endsWith(", 1)");
				const hasImage = backgroundImage !== "none";
				return colorIsOpaque || hasImage;
			});

			if (currentIsOpaque && (await element.isIntersectingViewport())) {
				return element;
			}

			let nextElement = (await element.$(
				":scope > *:not(style):not(script):not(link):not(meta)",
			)) as ElementHandle<HTMLElement>;

			while (nextElement) {
				const nextIsOpaque = await nextElement.evaluate((el) => {
					const backgroundColor = window.getComputedStyle(el).getPropertyValue("background-color");
					const backgroundImage = window.getComputedStyle(el).getPropertyValue("background-image");

					const colorIsOpaque = !backgroundColor.startsWith("rgba") || backgroundColor.endsWith(", 1)");
					const hasImage = backgroundImage !== "none";
					return colorIsOpaque || hasImage;
				});

				if (nextIsOpaque && (await nextElement.isIntersectingViewport())) {
					console.log(
						`Found opaque element between ${await getElementOpeningTag(element)} and ${await getElementOpeningTag(
							nextElement,
						)}`,
					);
					return nextElement;
				}

				const opaqueChild = await searchForOpaqueElement(nextElement);
				if (opaqueChild) {
					return opaqueChild;
				}

				nextElement = (
					await nextElement.$x("following-sibling::*[not(self::style|self::script|self::link|self::meta)]")
				)[0] as ElementHandle<HTMLElement>;
			}

			return null;
		}

		// It could be a wrapper, so we should keep descending down the children until we find an element with an opaque background
		if (bestElement) {
			const opaqueElement = await searchForOpaqueElement(bestElement);
			if (opaqueElement) {
				bestElement = opaqueElement;
			}
		}

		if (bestElement) {
			console.log("The best element is", await getElementOpeningTag(bestElement));
		}

		const selector = bestElement ? await getUniqueCssSelector(bestElement as ElementHandle<HTMLElement>, page) : "";
		return selector;
	}
}
