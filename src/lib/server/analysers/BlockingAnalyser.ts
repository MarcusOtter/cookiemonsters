import type { Category } from "$lib/contracts/AnalysisCategory";
import AnalysisStatus from "$lib/contracts/AnalysisStatus";
import type AnalysisResult from "$lib/utils/AnalysisResult";
import type { ElementHandle, Page } from "puppeteer";

export interface BlockingAnalyserParams {
	page: Page;
	cookieBanner: ElementHandle<Element>;
}

/**
 * This class represents an analysis of whether a cookie banner is blocking the use of a website.
 * It implements the AnalysisResult interface and takes BlockingAnalyserParams as input.
 * The analysis is performed by checking the clickability of elements outside the cookie banner
 * and within the viewport, distributed among different quadrants of the visible page.
 * The analysis result is stored in the status, resultSummary, and details properties.
 *
 * @async
 * @param {BlockingAnalyserParams} params - An object containing the required parameters for the analysis:
 *   - page: A Puppeteer Page instance
 *   - cookieBanner: A Puppeteer ElementHandle representing the cookie banner
 * @returns {Promise<void>} A promise that resolves when the analysis is completed.
 */
export class BlockingAnalyser implements AnalysisResult<BlockingAnalyserParams> {
	id: string;
	name: string;
	description: string;
	category: Category;
	status: AnalysisStatus;
	resultSummary: string;
	details: string;

	constructor(id: string, name: string, description: string, category: Category) {
		this.id = id;
		this.name = name;
		this.description = description;
		this.category = category;
		this.status = AnalysisStatus.Skipped;
		this.resultSummary = "";
		this.details = "";
	}

	async analyze(params: BlockingAnalyserParams) {
		const clickableSelectors = ["a", "button", 'input[type="submit"]', 'input[type="button"]', "label"]; // Add more if needed
		const clickableElements = await params.page.$$(clickableSelectors.join(","));

		const cookieBanner = params.cookieBanner;

		const elementsOutsideCookieBanner = await Promise.all(
			clickableElements.map(async (element) => {
				const isInsideCookieBanner = await cookieBanner.evaluate((banner, el) => banner.contains(el), element);
				return !isInsideCookieBanner ? element : null;
			}),
		).then((results) => results.filter(Boolean));

		const viewport = params.page.viewport();
		const quarterWidth = viewport ? viewport.width / 2 : 0;
		const quarterHeight = viewport ? viewport.height / 2 : 0;

		const elementsInQuadrants: ElementHandle<Element>[][] = [[], [], [], []];

		for (const element of elementsOutsideCookieBanner) {
			const isInViewport = await (element as ElementHandle<Element>).isIntersectingViewport();
			if (!isInViewport) continue;

			const boundingBox = await (element as ElementHandle<Element>).boundingBox();
			if (!boundingBox) continue;
			const x = boundingBox.x + boundingBox.width / 2;
			const y = boundingBox.y + boundingBox.height / 2;

			const quadrantX = x < quarterWidth ? 0 : 1;
			const quadrantY = y < quarterHeight ? 0 : 1;
			const quadrantIndex = quadrantY * 2 + quadrantX;

			elementsInQuadrants[quadrantIndex].push(element as ElementHandle<Element>);
		}

		const numberOfElementsToCheckPerQuadrant = 4;
		const randomClickableElements = elementsInQuadrants.flatMap((quadrant) =>
			quadrant.sort(() => 0.5 - Math.random()).slice(0, numberOfElementsToCheckPerQuadrant),
		);

		const clickResults = await Promise.all(
			randomClickableElements.map(async (element) => {
				const isClickable = await isElementClickable(params.page, element);
				return {
					element,
					isClickable,
				};
			}),
		);

		if (clickResults.filter((el) => el.isClickable == true).length > 0) {
			this.resultSummary = `The cookie banner does not seem to block the whole page from use.`;
			this.status = AnalysisStatus.Passed;
		} else {
			this.resultSummary = `The cookie banner seems to block the page from use.`;
			this.status = AnalysisStatus.Failed;
		}
	}
}

async function isElementClickable(page: Page, element: ElementHandle): Promise<boolean> {
	const boundingBox = await element.boundingBox();
	if (!boundingBox) return false;

	const x = boundingBox.x + boundingBox.width / 2;
	const y = boundingBox.y + boundingBox.height / 2;

	const elementAtPoint = await page.evaluateHandle((x, y) => document.elementFromPoint(x, y), x, y);
	const isSameElement = await page.evaluate(
		(element, elementAtPoint) => element.isSameNode(elementAtPoint),
		element,
		elementAtPoint,
	);

	return isSameElement;
}
