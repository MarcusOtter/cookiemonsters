import type AnalysisResult from "$lib/utils/AnalysisResult";
import type { GPTResult } from "../GPTResult";

export interface PurposeAnalyserParams {
	gptResult: GPTResult;
}

export class PurposeAnalyser implements AnalysisResult<PurposeAnalyserParams> {
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

	async analyze(params: PurposeAnalyserParams) {
		if (params.gptResult["purpose-described"]) {
			this.resultSummary = `The cookie banner seems to describe the purpose of the cookies clearly.`;
			this.status = "Pass";
		} else {
			this.resultSummary = `The cookie banner does not seem to describe the purpose of the cookies.`;
			this.status = "Warning";
		}
	}
}
