import type { Page } from "puppeteer";
import type AnalysisResult from "$lib/utils/AnalysisResult";
import AnalysisStatus from "$lib/models/AnalysisStatus";
import AnalysisCategories from "$lib/models/AnalysisCategories";
import { AxePuppeteer } from "axe-puppeteer";

export interface ColorContrastAnalyserParams {
	page: Page;
	bannerSelector: string;
}

// Note: When evaluating this success criterion, the font size in points should be obtained from the user agent or calculated on font metrics in the way that user agents do. Point sizes are based on the CSS pt size CSS3 Values. The ratio between sizes in points and CSS pixels is 1pt = 1.333px, therefore 14pt and 18pt are equivalent to approximately 18.5px and 24px.

export class ColorContrastAnalyser implements AnalysisResult<ColorContrastAnalyserParams> {
	id = "color-contrast";
	name = "Color Contrast";
	description = "Checks that the cookie banner follows accessibility standards in color contrast.";
	category = AnalysisCategories.Design;
	status = AnalysisStatus.Skipped;
	resultSummary = "";
	details = "";

	async analyze(params: ColorContrastAnalyserParams) {
		const colorContrastCategories = await checkColorContrast(params.page, params.bannerSelector);
		const categoryFAIL = colorContrastCategories[0];
		const categoryAA = colorContrastCategories[1];
		const categoryAAA = colorContrastCategories[2];

		if (categoryAAA.length > 0) {
			this.resultSummary = `All of the cookie banner's text's contrast is sufficient (AAA).`;
			this.status = AnalysisStatus.Passed;
			this.details = `Elements with AAA:
`;

			for (const element of categoryAAA) {
				this.details += `
Element: ${element.nodeHtml}
Contrast: ${element.contrast}:1 (${element.contrastLevel})
`;
			}
		}

		if (categoryAA.length > 0) {
			this.resultSummary = `${categoryAA.length} of the cookie banner's text's contrast is within the minimum requirement (AA), however AAA is preferred.`;
			this.status = AnalysisStatus.Warning;
			this.details += `
			Elements with AA:
`;

			for (const element of categoryAA) {
				this.details += `
Element: ${element.nodeHtml}
Contrast: ${element.contrast}:1 (${element.contrastLevel})
`;
			}
		}

		if (categoryFAIL.length > 0) {
			this.resultSummary = `${categoryFAIL.length} of the cookie banner's text's contrast is insufficient (below AA).`;
			this.status = AnalysisStatus.Failed;
			this.details += `
Elements with below AA:
`;

			for (const element of categoryFAIL) {
				this.details += `
Element: ${element.nodeHtml}
Contrast: ${element.contrast}:1 (${element.contrastLevel})
`;
			}
		}
	}
}

type ElementContrast = {
	nodeHtml: string;
	selector: string;
	fgColor: string;
	bgColor: string;
	contrast: number;
	fontSize: number;
	fontWeight: string;
	contrastLevel: string;
	isLargeText: boolean | null;
};

async function checkColorContrast(
	page: Page,
	selector: string,
): Promise<[ElementContrast[], ElementContrast[], ElementContrast[]]> {
	await page.waitForSelector(selector);

	const contrastFAILElements: ElementContrast[] = [];
	const contrastAAElements: ElementContrast[] = [];
	const contrastAAAElements: ElementContrast[] = [];

	const results = await new AxePuppeteer(page).withRules("color-contrast").include([selector]).analyze();
	console.log(JSON.stringify(results));

	const colorContrastElements = [];
	colorContrastElements.push(...results.violations);
	colorContrastElements.push(...results.passes);
	for (const element of colorContrastElements) {
		for (const node of element.nodes) {
			const elementContrast: ElementContrast = {
				nodeHtml: node.html,
				selector: node.target[0],
				fgColor: node.any[0].data.fgColor,
				bgColor: node.any[0].data.bgColor,
				contrast: node.any[0].data.contrastRatio as number,
				fontSize: node.any[0].data.fontSize.split("pt")[0] as number,
				fontWeight: node.any[0].data.fontWeight,
				contrastLevel: "FAIL",
				isLargeText: null,
			};

			const isLargeText =
				(elementContrast.fontSize >= 14 &&
					(elementContrast.fontWeight == "bold" || elementContrast.fontWeight == "bolder")) ||
				elementContrast.fontSize >= 18;

			if (isLargeText) {
				if (elementContrast.contrast >= 4.5) {
					elementContrast.contrastLevel = "AAA";
					contrastAAAElements.push(elementContrast);
				} else if (elementContrast.contrast >= 3) {
					elementContrast.contrastLevel = "AA";
					contrastAAElements.push(elementContrast);
				}
			} else {
				if (elementContrast.contrast >= 7) {
					elementContrast.contrastLevel = "AAA";
					contrastAAAElements.push(elementContrast);
				} else if (elementContrast.contrast >= 4.5) {
					elementContrast.contrastLevel = "AA";
					contrastAAElements.push(elementContrast);
				}
			}

			if (elementContrast.contrastLevel == "FAIL") {
				contrastFAILElements.push(elementContrast);
			}
		}
	}

	return [contrastFAILElements, contrastAAElements, contrastAAAElements];

	// From the violations, we need to check each elements' HTML and check with regex whether it is a text object. If not, it's contrast doesn't matter really.
	// Then we need to check the font-size and weight to determine if text is large. Then we can give appropriate AA or AAA rating based on that and contrast ratio. Ez
}

// We'll see if we need this function. I'm not quite sure if axe-core gives contrast for elements that are not text. If it does, we need this I think. We'll keep an eye on it.
/*function containsText(elementString: string): boolean {
	const dom = new JSDOM(`<!DOCTYPE html><body>${elementString}</body>`);
	const element = dom.window.document.body.firstChild;

	if (!element) {
		return false;
	}

	// Check if it's an HTMLElement (which excludes self-closing elements like img or input)
	if (!(element instanceof dom.window.HTMLElement)) {
		return false;
	}

	// Check if it contains text
	const textContent = element.textContent || "";
	return textContent.trim() !== "";
}
*/
