import type { ElementHandle, Page } from "puppeteer";

export async function getDirectChildren(element: ElementHandle<Element> | null) {
	return element ? await element.$$(":scope > *") : [];
}

export async function getAllChildren(element: ElementHandle<Element> | null) {
	return element ? await element.$$(":scope *") : [];
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
