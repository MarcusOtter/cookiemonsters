import type AnalysisResult from "$lib/utils/AnalysisResult";
import type { GPTResult } from "../GPTResult";

export interface TextClarityAnalyserParams {
	gptResult: GPTResult;
}

export class TextClarityAnalyser implements AnalysisResult<TextClarityAnalyserParams> {
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

	async analyze(params: TextClarityAnalyserParams) {
		if (params.gptResult["legal-jargon"]) {
			this.resultSummary = `The cookie banner seems to contain legal jargon or unclear text.`;
			this.status = "Warning";
		} else {
			this.resultSummary = `The cookie banner seems to have clear text and does not contain legal jargon.`;
			this.status = "Pass";
		}
	}
}
