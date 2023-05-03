import type { ElementHandle, Page } from "puppeteer";

export async function getDirectChildren(element: ElementHandle<Element> | null) {
	return element ? await element.$$(":scope > *") : [];
}

export async function getAllChildren(element: ElementHandle<Element> | null) {
	return element ? await element.$$(":scope *") : [];
}

export async function getElementsWithWords(page: Page, words: string[], options?: { includeChildren: boolean }) {
	const xpathExpression = words
		.map(
			(word) =>
				`//*[contains(translate(${
					options?.includeChildren ? "string(descendant-or-self::*)" : "text()"
				}, 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ', 'abcdefghijklmnopqrstuvwxyzåäö'), '${word.toLowerCase()}')]`,
		)
		.join(" | ");

	let elementsWithKeyWords = (await page.$x(xpathExpression)) as ElementHandle<Element>[];
	const iframes = (await page.$$("iframe")) as ElementHandle<Element>[];

	for (let i = 0; i < iframes.length; i++) {
		const frame = await iframes[i].contentFrame();
		if (frame) {
			const iframeElements = (await frame.$$("xpath/" + xpathExpression)) as ElementHandle<Element>[];
			elementsWithKeyWords = elementsWithKeyWords.concat(iframeElements);
		}
	}

	return elementsWithKeyWords;
}

/**
 * Find a unique selector for a given element, with a focus on being as stable as possible.
 * This means that we prioritize including near parents as to not be affected by changes in the DOM.
 * For the same reason, we do not use pseudo selectors like :nth-child() or :nth-of-type().
 * As soon as the method finds a selector that is unique, it will stop searching.
 * @param element the element you want a selector for
 * @param page the page the element is on
 * @returns a unique CSS selector for the element. If it could not find one, it will return an empty string.
 */
export async function getUniqueCssSelector(element: ElementHandle<HTMLElement>, page: Page): Promise<string> {
	const result = await page.evaluate((startElement: HTMLElement) => {
		function isUniqueSelector(selector: string): boolean {
			const matchedElements = document.querySelectorAll(selector);
			return matchedElements.length === 1 && matchedElements[0] === startElement;
		}

		function buildSelector(node: HTMLElement, checkParents = true, usePseudoSelectors = false): string {
			let selector = node.tagName.toLowerCase();

			if (node.id) {
				selector = `${selector}#${CSS.escape(node.id)}`;
				if (isUniqueSelector(selector)) {
					return selector;
				}
			}

			if (node.classList.length > 0) {
				// TODO: Some sites have overriden the CSS.escape method, so we need to polyfill it if it doesn't exist.
				selector = `${selector}.${[...node.classList].map((c) => CSS.escape(c)).join(".")}`;
				if (isUniqueSelector(selector)) {
					return selector;
				}
			}

			if (usePseudoSelectors) {
				const siblings = node.parentElement?.children;
				const index = siblings ? [...siblings].indexOf(node) : 0;
				selector = `${selector}:nth-child(${index + 1})`;
				if (isUniqueSelector(selector)) {
					return selector;
				}
			}

			if (!checkParents) {
				return selector;
			}

			// Traverse all the parents while not using pseudoselectors (better for stability)
			// If we find a unique selector, we stop searching.
			while (node.parentElement && !isUniqueSelector(selector)) {
				const parentSelector = buildSelector(node.parentElement, false);
				selector = `${parentSelector} > ${selector}`;
				node = node.parentElement;
			}

			// When we reach this point we are guaranteed to either have a unique selector,
			// or we have reached the root element and thus know that we cannot create a unique
			// selector without using pseudoselectors.

			// So we restart the search, but this time we use pseudoselectors for each step.
			if (!isUniqueSelector(selector)) {
				selector = buildSelector(startElement, false, true);
				node = startElement;

				while (!isUniqueSelector(selector) && node.parentElement) {
					const parentSelector = buildSelector(node.parentElement, false, true);
					selector = `${parentSelector} > ${selector}`;
					node = node.parentElement;
				}
			}

			return selector;
		}

		const result = buildSelector(startElement);
		const isUnique = isUniqueSelector(result);
		console.log(isUnique.toString().toUpperCase(), " ", result);
		return result;
	}, element);

	return result;
}

export async function screenshotAsBase64(source: ElementHandle<Element> | Page | null): Promise<string> {
	if (!source) return "";
	return (await (source as ElementHandle<Element>).screenshot({ encoding: "base64" })) as string;
}

/**
 * Gets the opening tag of an element including attributes, for example `<div id="example" class="test">`
 * @param element The element to get the tag of
 * @returns The opening tag of the element
 */
export async function getElementOpeningTag(element: ElementHandle): Promise<string> {
	return await element.evaluate((el) => el.outerHTML.replace(/(<[^>]+>).*/s, "$1"));
}

/**
 * Gets the viewport size of a page, for example "1920x1080"
 * @param page The page to get the viewport size of
 * @returns The viewport size of the page
 */
export function getViewportSize(page: Page): string {
	return `${page.viewport()?.width}x${page.viewport()?.height}`;
}

export function getViewportSizeIndividually(page: Page): (number | undefined)[] {
	return [page.viewport()?.width, page.viewport()?.height];
}
