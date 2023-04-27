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

export async function getUniqueCssSelectorBad(element: ElementHandle<HTMLElement>, page: Page): Promise<string> {
	console.time("getUniqueCssSelector BAD");

	async function testSelector(selector: string): Promise<boolean> {
		const matchedElements = await page.$$(selector);
		return matchedElements.length === 1;
	}

	async function buildSelector(node: ElementHandle<HTMLElement>): Promise<string> {
		const selector = await node.evaluate((n) => n.tagName.toLowerCase());
		const nodeId = await node.evaluate((n) => n.id);
		if (nodeId) {
			const idSelector = `${selector}#${nodeId}`;
			if (await testSelector(idSelector)) {
				return idSelector;
			}
		}

		const nodeClassList = await node.evaluate((n) => Array.from(n.classList));
		if (nodeClassList.length > 0) {
			const classSelector = `${selector}.${nodeClassList.join(".")}`;
			if (await testSelector(classSelector)) {
				return classSelector;
			}
		}

		if (!(await node.evaluate((n) => n.parentElement))) {
			return "";
		}
		const parentNode = (await node.$$("xpath/" + ".."))[0] as ElementHandle<HTMLElement>;
		const parentSelector = await buildSelector(parentNode);
		if (parentSelector) {
			const combinedSelector = `${parentSelector} > ${selector}`;
			if (await testSelector(combinedSelector)) {
				return combinedSelector;
			}
		}

		return selector;
	}

	const result = await buildSelector(element);
	console.timeEnd("getUniqueCssSelector BAD");
	return result;
}

export async function getUniqueCssSelector(element: ElementHandle<HTMLElement>, page: Page): Promise<string> {
	console.time("getUniqueCssSelector GOOD");
	const result = await page.evaluate((el: HTMLElement) => {
		function testSelector(selector: string): boolean {
			const matchedElements = document.querySelectorAll(selector);
			console.log(`Testing selector ${selector} with ${matchedElements.length} matches`);
			return matchedElements.length === 1 && matchedElements[0] === el;
		}

		function buildSelector(node: HTMLElement): string {
			// if (!node.parentElement) {
			// 	return "";
			// }
			const selector = node.tagName.toLowerCase();

			if (node.id) {
				const idSelector = `${selector}#${node.id}`;
				if (testSelector(idSelector)) {
					return idSelector;
				}
			}

			if (node.classList.length > 0) {
				const classSelector = `${selector}.${[...node.classList].join(".")}`;
				if (testSelector(classSelector)) {
					return classSelector;
				}
			}

			if (node.parentElement) {
				const parentSelector = buildSelector(node.parentElement);
				if (parentSelector) {
					const combinedSelector = `${parentSelector} > ${selector}`;
					if (testSelector(combinedSelector)) {
						return combinedSelector;
					}
				}
			}

			return selector;
		}

		return buildSelector(el);
	}, element);

	console.timeEnd("getUniqueCssSelector GOOD");
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
