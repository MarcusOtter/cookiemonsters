import type { Category } from "$lib/contracts/AnalysisCategory";
import AnalysisStatus from "$lib/contracts/AnalysisStatus";
import type AnalysisResult from "$lib/utils/AnalysisResult";
import type { ElementHandle, Page } from "puppeteer";

export interface NudgingAnalyserParams {
	rejectButtonElement:
		| {
				index: number;
				tag: string;
				text: string;
				element: ElementHandle<Element>;
				selector: string;
		  }
		| undefined;
	acceptButtonElement:
		| {
				index: number;
				tag: string;
				text: string;
				element: ElementHandle<Element>;
				selector: string;
		  }
		| undefined;
	rejectButtonLayerAnalyserStatus: AnalysisStatus;
	page: Page;
}

export class NudgingAnalyser implements AnalysisResult<NudgingAnalyserParams> {
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

	async analyze(params: NudgingAnalyserParams) {
		this.resultSummary = `This check was skipped due to the accept/decline button missing or being on different layers.`;
		this.status = AnalysisStatus.Skipped;

		if (
			params.rejectButtonElement &&
			params.acceptButtonElement &&
			params.rejectButtonLayerAnalyserStatus == AnalysisStatus.Passed
		) {
			// Reject Pass check so that it isn't on another layer.
			const nudgingCheck = await checkNudging(params.rejectButtonElement, params.acceptButtonElement, params.page);
			if (nudgingCheck == "pass") {
				this.resultSummary = "The cookie banner does not nudge the user's consent decision by design.";
				this.status = AnalysisStatus.Passed;
			} else if (nudgingCheck == "warning") {
				this.resultSummary =
					"The cookie banner seems to nudge the user's consent decision by differentiating the styling of the accept/decline buttons.";
				this.status = AnalysisStatus.Warning;
			}
		}
	}
}

async function checkNudging(
	rejectButtonElement: {
		index?: number;
		tag?: string;
		text?: string;
		element: ElementHandle<Element>;
		selector: string;
	},
	acceptButtonElement: {
		index?: number;
		tag?: string;
		text?: string;
		element: ElementHandle<Element>;
		selector: string;
	},
	page: Page,
) {
	const rejectButtonDOMElement = await page.$(rejectButtonElement.selector);
	const acceptButtonDOMElement = await page.$(acceptButtonElement.selector);

	let result = "skipped";

	if (rejectButtonDOMElement && acceptButtonDOMElement) {
		result = "warning";

		type StyleProperties = {
			background: string;
			color: string;
			fontSize: string;
			fontWeight: string;
			fontFamily: string;
			opacity: string;
		};

		const propertyList: (keyof StyleProperties)[] = [
			"background",
			"color",
			"fontSize",
			"fontWeight",
			"fontFamily",
			"opacity",
		];

		const rejectButtonStyle = await rejectButtonDOMElement.evaluate((el, propertyList) => {
			const style = getComputedStyle(el);
			const styleObject: StyleProperties = {
				background: "",
				color: "",
				fontSize: "",
				fontWeight: "",
				fontFamily: "",
				opacity: "",
			};

			for (const property of propertyList) {
				styleObject[property] = style.getPropertyValue(property);
			}
			return styleObject;
		}, propertyList);

		const acceptButtonStyle = await acceptButtonDOMElement.evaluate((el, propertyList) => {
			const style = getComputedStyle(el);
			const styleObject: StyleProperties = {
				background: "",
				color: "",
				fontSize: "",
				fontWeight: "",
				fontFamily: "",
				opacity: "",
			};

			for (const property of propertyList) {
				styleObject[property] = style.getPropertyValue(property);
			}
			return styleObject;
		}, propertyList);

		console.log(JSON.stringify(rejectButtonStyle));
		console.log(JSON.stringify(acceptButtonStyle));

		if (JSON.stringify(rejectButtonStyle) === JSON.stringify(acceptButtonStyle)) {
			result = "pass";
		}
	}
	return result;
}
