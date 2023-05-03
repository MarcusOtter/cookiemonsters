import type { ElementHandle, Page } from "puppeteer";
import type AnalysisResult from "$lib/utils/AnalysisResult";

export interface RejectButtonLayerAnalyserParams {
	rejectButtonElement:
		| {
				index: number;
				tag: string;
				text: string;
				element: ElementHandle<Element>;
				selector: string;
		  }
		| undefined;
	page: Page;
}

export class RejectButtonLayerAnalyser implements AnalysisResult<RejectButtonLayerAnalyserParams> {
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

	async analyze(params: RejectButtonLayerAnalyserParams) {
		if (params.rejectButtonElement) {
			this.resultSummary = `A button to Reject All cookies was found within the cookie banner, but not on the first layer.`;
			this.status = "Warning";

			const rejectButtonDOMElement = await params.page.$(params.rejectButtonElement.selector);

			if (rejectButtonDOMElement && (await rejectButtonDOMElement.isIntersectingViewport())) {
				this.resultSummary = `A button to Reject All cookies was found on the first layer of the cookie banner.`;
				this.status = "Pass";
			}
		} else {
			this.resultSummary = `A button to Reject All cookies was not found within the cookie banner.`;
			this.status = "Fail";
		}
	}
}
