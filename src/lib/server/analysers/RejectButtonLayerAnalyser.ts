import type { ElementHandle, Page } from "puppeteer";
import type AnalysisResult from "$lib/utils/AnalysisResult";
import AnalysisStatus from "$lib/models/AnalysisStatus";
import type AnalysisCategory from "$lib/models/AnalysisCategory";

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
	category: AnalysisCategory;
	status: AnalysisStatus;
	resultSummary: string;
	details: string;

	constructor(id: string, name: string, description: string, category: AnalysisCategory) {
		this.id = id;
		this.name = name;
		this.description = description;
		this.category = category;
		this.status = AnalysisStatus.Skipped;
		this.resultSummary = "";
		this.details = "";
	}

	async analyze(params: RejectButtonLayerAnalyserParams) {
		if (params.rejectButtonElement) {
			this.resultSummary = `A button to Reject All cookies was found within the cookie banner, but not on the first layer.`;
			this.status = AnalysisStatus.Warning;

			const rejectButtonDOMElement = await params.page.$(params.rejectButtonElement.selector);

			if (rejectButtonDOMElement && (await rejectButtonDOMElement.isIntersectingViewport())) {
				this.resultSummary = `A button to Reject All cookies was found on the first layer of the cookie banner.`;
				this.status = AnalysisStatus.Passed;
			}
		} else {
			this.resultSummary = `A button to Reject All cookies was not found within the cookie banner.`;
			this.status = AnalysisStatus.Failed;
		}
	}
}
