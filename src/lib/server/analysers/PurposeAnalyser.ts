import type { Category } from "$lib/contracts/AnalysisCategory";
import AnalysisStatus from "$lib/contracts/AnalysisStatus";
import type AnalysisResult from "$lib/utils/AnalysisResult";
import type { GPTResult } from "../GPTResult";

export interface PurposeAnalyserParams {
	gptResult: GPTResult;
}

export class PurposeAnalyser implements AnalysisResult<PurposeAnalyserParams> {
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

	async analyze(params: PurposeAnalyserParams) {
		if (params.gptResult["purpose-described"]) {
			this.resultSummary = `The cookie banner seems to describe the purpose of the cookies clearly.`;
			this.status = AnalysisStatus.Passed;
		} else {
			this.resultSummary = `The cookie banner does not seem to describe the purpose of the cookies.`;
			this.status = AnalysisStatus.Warning;
		}
	}
}
