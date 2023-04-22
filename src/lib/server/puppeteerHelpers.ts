import type { ElementHandle, Page } from "puppeteer";

export async function getDirectChildren(element: ElementHandle<Element> | null) {
	return element ? await element.$$(":scope > *") : [];
}

export async function getAllChildren(element: ElementHandle<Element> | null) {
	return element ? await element.$$(":scope *") : [];
}

export async function getElementsWithWords(page: Page, words: string[], options?: { includeChildren: boolean }) {
	const xpathExpression = words.map((word) => `//*[contains(text(), '${word.toLowerCase()}')]`).join(" | ");

	let elementsWithKeyWords = (await page.$x(xpathExpression)) as ElementHandle<Element>[];
	const iframes = (await page.$$("iframe")) as ElementHandle<Element>[];

	for (let i = 0; i < iframes.length; i++) {
		const frame = await iframes[i].contentFrame();
		if (frame) {
			const iframeElements = (await frame.$$("xpath/" + xpathExpression)) as ElementHandle<Element>[];
			elementsWithKeyWords = elementsWithKeyWords.concat(iframeElements);
		}
	}

	if (options?.includeChildren) {
		elementsWithKeyWords = (
			await Promise.all(
				elementsWithKeyWords.map(async (element) => {
					const parents = await getParentElements(element);
					return [element, ...parents];
				}),
			)
		).flat();
	}

	return elementsWithKeyWords;
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

async function getParentElements(element: ElementHandle<Element>): Promise<ElementHandle<Element>[]> {
	const parentElements: ElementHandle<Element>[] = [];
	let currentElement = element;

	for (;;) {
		const parentElement = await currentElement.evaluateHandle((el: Element) => el.parentElement);

		// Break the loop when there are no more parent elements.
		if (parentElement === null) {
			break;
		}

		if ((await parentElement.jsonValue()) === null) {
			break;
		}

		if (parentElement == element) {
			break;
		}

		console.log(parentElement.toString());

		parentElements.push(parentElement as ElementHandle<Element>);
		currentElement = parentElement as ElementHandle<Element>;
	}

	return parentElements;
}
