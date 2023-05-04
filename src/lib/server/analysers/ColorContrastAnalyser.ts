import type { ElementHandle } from "puppeteer";
import type AnalysisResult from "$lib/utils/AnalysisResult";
import Color from "color";
import WCAG from "wcag-contrast";

export interface ColorContrastAnalyserParams {
	cookieBannerTextElements: {
		index: number;
		tag: string;
		text: string;
		element: ElementHandle<Element>;
		selector: string;
	}[];
}

// Note: When evaluating this success criterion, the font size in points should be obtained from the user agent or calculated on font metrics in the way that user agents do. Point sizes are based on the CSS pt size CSS3 Values. The ratio between sizes in points and CSS pixels is 1pt = 1.333px, therefore 14pt and 18pt are equivalent to approximately 18.5px and 24px.

export class ColorContrastAnalyser implements AnalysisResult<ColorContrastAnalyserParams> {
	id: string;
	name: string;
	description: string;
	category: string;
	status: "Pass" | "Fail" | "Warning" | "Skipped" | "Undefined";
	resultSummary: string;
	details: string;

	constructor(id: string, name: string, description: string, category: string) {
		this.id = id;
		this.name = name;
		this.description = description;
		this.category = category;
		this.status = "Undefined";
		this.resultSummary = "";
		this.details = "";
	}

	async analyze(params: ColorContrastAnalyserParams) {
		const elementContrasts = await getElementContrasts(params.cookieBannerTextElements);
		const failedContrastElements = elementContrasts.filter((el) => el.contrastLevel == "FAIL");
		const aaContrastElements = elementContrasts.filter((el) => el.contrastLevel == "AA");

		if (failedContrastElements.length > 0) {
			this.resultSummary = `${failedContrastElements.length} of the cookie banner's text's contrast is insufficient (WCAG's AA minimum contrast).`;
			this.status = "Fail";
			this.details = `Elements with contrast below AA:`;

			for (const contrast of failedContrastElements) {
				const element = params.cookieBannerTextElements.find((el) => el.index == contrast.index);
				if (element) {
					this.details += `
Element: <${element.tag}>${truncateString(element.text, 50)}</${element.tag}> Contrast: 1:${
						Math.round((contrast?.contrast as number) * 10) / 10
					} (${contrast?.contrastLevel})`;
				}
			}
		} else if (aaContrastElements.length > 0) {
			this.resultSummary = `${aaContrastElements.length} of the cookie banner's text's contrast has a contrast rating of AA (WCAG's minimum contrast), but should be AAA.`;
			this.status = "Warning";
			this.details = `Elements with contrast below AAA:`;

			for (const contrast of aaContrastElements) {
				const element = params.cookieBannerTextElements.find((el) => el.index == contrast.index);
				if (element) {
					this.details += `
Element: <${element.tag}>${truncateString(element.text, 50)}</${element.tag}> Contrast: 1:${
						Math.round((contrast?.contrast as number) * 10) / 10
					} (${contrast?.contrastLevel})`;
				}
			}
		} else {
			this.resultSummary = "Cookie banner contains no elements with insufficient contrast.";
			this.status = "Pass";
		}
	}
}

function truncateString(str: string, maxLength: number): string {
	if (str.length <= maxLength) {
		return str;
	}
	return str.slice(0, maxLength - 3) + "...";
}

// There seem to be edge cases with this, such as uu.se.
const getDeepestChildColor = async (element: ElementHandle) => {
	return await element.evaluate((el) => {
		const findDeepestChildColor = (node: Element): string | null => {
			let result = null;

			for (const child of Array.from(node.children)) {
				const childStyle = getComputedStyle(child);
				const childColor = childStyle.getPropertyValue("color");

				if (childColor !== getComputedStyle(node).getPropertyValue("color")) {
					result = childColor;
				}

				const childResult = findDeepestChildColor(child);

				if (childResult) {
					result = childResult;
				}
			}
			return result;
		};

		return findDeepestChildColor(el) || getComputedStyle(el).getPropertyValue("color");
	});
};

async function findAncestorWithBackgroundColor(element: ElementHandle): Promise<ElementHandle | null> {
	let currentElement = element;

	while ((await currentElement.evaluate((el) => el.tagName)) !== "HTML") {
		currentElement = (await currentElement.$$("xpath/.."))[0];
		if (await hasBackground(currentElement)) {
			return currentElement;
		}
	}

	return null;
}

async function hasBackground(element: ElementHandle): Promise<boolean> {
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

	const hasBackgroundColor = !style.backgroundColor.includes("rgba(0, 0, 0, 0)");
	const hasBackground = !style.background.includes("rgba(0, 0, 0, 0)");

	if (hasBackgroundColor || hasBackground) {
		return true;
	}

	return false;
}

function convertToHex(colorString: string): string {
	const color = Color(colorString);
	const rgba = color.rgb().array();
	const hex = color.hex();
	const hasAlpha = colorString.toLowerCase().includes("rgba");
	if (hasAlpha) {
		const alpha = hasAlpha && rgba[3] !== undefined ? (rgba[3] * 255).toString(16) : "";
		return hex + alpha.padStart(2, "0");
	}
	return hex;
}

async function getElementContrasts(
	cookieBannerTextElements: {
		index: number;
		tag: string;
		text: string;
		element: ElementHandle<Element>;
		selector: string;
	}[],
): Promise<
	{
		index: number;
		contrastLevel: string;
		contrast: number;
		isLargeText: boolean;
	}[]
> {
	const elementContrasts: { index: number; contrastLevel: string; contrast: number; isLargeText: boolean }[] = [];

	for (const element of cookieBannerTextElements) {
		const domElement = element.element; // TODO: potentially implement selectors here for future proofing.
		console.log(`Checking element: ${element.index}, ${truncateString(element.text, 50)}`);
		if (domElement) {
			const textColor = await getDeepestChildColor(domElement);
			const style = await domElement.evaluate((el, textColor) => {
				const style = getComputedStyle(el);
				const backgroundColor = style.getPropertyValue("background-color");
				const fontWeight = +style.getPropertyValue("font-weight");
				const fontSize = +style.getPropertyValue("font-size").replace("px", "");
				return { color: textColor, backgroundColor, fontWeight, fontSize };
			}, textColor);

			let elementContrast = 1;

			if (style.backgroundColor && style.backgroundColor != "rgba(0, 0, 0, 0)") {
				const hexColor = convertToHex(style.color);
				const hexBgColor = convertToHex(style.backgroundColor);
				const contrast = WCAG.hex(hexColor, hexBgColor);
				console.log(
					`Colors: ${hexColor} (${style.color}) and ${hexBgColor} (${style.backgroundColor}), have contrast: ${contrast}`,
				);
				elementContrast = contrast;

				// TODO: Calculate contrast between element's own color and background. DONE
				// TODO: Compare the element's background to the ancestor's background.

				// TODO: Might implement this:
				/*const ancestor = await findAncestorWithBackgroundColor(domElement);
				// TODO: What to do if ancestor is null?
				if (ancestor) {
					const ancestorStyle = await ancestor.evaluate((el) => {
						const style = getComputedStyle(el);
						const backgroundColor = style.getPropertyValue("background-color");
						return { backgroundColor };
					});

					const ancestorHexBgColor = convertToHex(ancestorStyle.backgroundColor);
					const ancestorContrast = WCAG.hex(hexBgColor, ancestorHexBgColor);

					console.log(
						`B Text: ${element.text} Contrast between ${hexBgColor} and ancestor ${ancestorHexBgColor} is ${ancestorContrast}. %%%%`,
					);
				}*/
			} else {
				const ancestor = await findAncestorWithBackgroundColor(domElement);
				// TODO: What to do if ancestor is null?
				if (ancestor) {
					const ancestorStyle = await ancestor.evaluate((el) => {
						const style = getComputedStyle(el);
						const backgroundColor = style.getPropertyValue("background-color");
						return { backgroundColor };
					});

					const hexColor = convertToHex(style.color);
					const hexBgColor = convertToHex(ancestorStyle.backgroundColor);
					const contrast = WCAG.hex(hexColor, hexBgColor);
					console.log(
						`Colors: ${hexColor} (${style.color}) and ${hexBgColor} (${ancestorStyle.backgroundColor}), have contrast: ${contrast}`,
					);

					elementContrast = contrast;
				}
				// TODO: Compare the text color to the ancestor's background. DONE
			}

			const isLargeText = (style.fontSize >= 18.5 && style.fontWeight >= 700) || style.fontSize >= 24;

			let contrastLevel = "FAIL";

			if (isLargeText) {
				if (elementContrast >= 4.5) {
					contrastLevel = "AAA";
				} else if (elementContrast >= 3) {
					contrastLevel = "AA";
				}
			} else {
				if (elementContrast >= 7) {
					contrastLevel = "AAA";
				} else if (elementContrast >= 4.5) {
					contrastLevel = "AA";
				}
			}

			elementContrasts.push({
				index: element.index,
				contrastLevel: contrastLevel,
				contrast: elementContrast,
				isLargeText: isLargeText,
			});
		}
	}

	return elementContrasts;
}
