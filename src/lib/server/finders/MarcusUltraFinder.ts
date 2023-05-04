import type { ElementHandle, Page } from "puppeteer";
import type BannerFinder from "./BannerFinder";
import { getElementOpeningTag, getElementsWithWords, getUniqueCssSelector } from "../puppeteerHelpers";
import { getUniqueCommonPhrases } from "../getCommonPhrases";

// TODO: Needs a big refactor.
export default class MarcusUltraFinder implements BannerFinder {
	/** @inheritdoc */
	async findBannerSelector(page: Page): Promise<string> {
		console.log("##### MARCUS ULTRA START #####");

		/*
			(Idea, not fully implemented and not great yet)
			- Find all elements with at least one text match (in chilren or itself)
			- From the results, pick the element with the largest z-index
				- If there is a tie, pick the element with a fully opaque background color
			(skipped) - Calculate keyword density for this element.
			(skipped) - If the element has a higher density than the body, it's likely a banner
			- But it could be a wrapper, so we should keep descending down the children until the inner text length changes
			- If the density changes, we've found the banner (before the change happened)
		*/

		// Find all elements with at least one text match (in chilren or itself)
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

		console.log("Best elements length:", bestElements.length);

		let bestElement = undefined;
		// If there is a tie, pick the element with a fully opaque background color (broken for youtube.com on mobile)
		if (bestElements.length === 1) {
			bestElement = bestElements[0];
		} else {
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

		// It could be a wrapper, so we should keep descending down the children until the inner text length changes
		// if (bestElement) {
		// 	let currentElement = bestElement;
		// 	let currentInnerTextLength = await currentElement.evaluate((el) => el.innerText.length);
		// 	let nextElement = (await currentElement.$(
		// 		":scope > *:not(style):not(script):not(link):not(meta)",
		// 	)) as ElementHandle<HTMLElement>;

		// 	while (nextElement) {
		// 		const nextInnerTextLength = await nextElement.evaluate((el) => el.innerText.length);
		// 		// This logic is a bit flawed, check blocket.se for example
		// 		if (nextInnerTextLength !== currentInnerTextLength) {
		// 			console.log(
		// 				`Text length between ${await getElementOpeningTag(currentElement)} and ${await getElementOpeningTag(
		// 					nextElement,
		// 				)} changed from ${currentInnerTextLength} to ${nextInnerTextLength}`,
		// 			);
		// 			break;
		// 		}

		// 		currentElement = nextElement;
		// 		currentInnerTextLength = nextInnerTextLength;
		// 		nextElement = (await currentElement.$(
		// 			":scope > *:not(style):not(script):not(link):not(meta)",
		// 		)) as ElementHandle<HTMLElement>;

		// 		bestElement = currentElement;
		// 	}
		// }

		if (bestElement) {
			console.log("The best element is", await getElementOpeningTag(bestElement));
		}

		const selector = bestElement ? await getUniqueCssSelector(bestElement as ElementHandle<HTMLElement>, page) : "";
		return selector;
	}
}
