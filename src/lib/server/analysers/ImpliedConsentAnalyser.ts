import type AnalysisResult from "$lib/utils/AnalysisResult";
import type { GPTResult } from "../GPTResult";

export interface ImpliedConsentAnalyserParams {
	gptResult: GPTResult;
}

export class ImpliedConsentAnalyser implements AnalysisResult<ImpliedConsentAnalyserParams> {
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

	async analyze(params: ImpliedConsentAnalyserParams) {
		if (params.gptResult["implied-consent"]) {
			this.resultSummary = `The cookie banner contains wording that suggests that the user has no say in consent i.e. Implied consent.`;
			this.status = "Fail";
		} else {
			this.resultSummary = `The cookie banner does not seem to contain wording of implied consent.`;
			this.status = "Pass";
		}
	}
}
