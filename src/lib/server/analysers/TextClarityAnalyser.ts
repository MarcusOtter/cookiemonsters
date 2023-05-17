import AnalysisCategories from "$lib/models/AnalysisCategories";
import AnalysisStatus from "$lib/models/AnalysisStatus";
import type AnalysisResult from "$lib/utils/AnalysisResult";
import type { GPTResult } from "../GPTResult";

export interface TextClarityAnalyserParams {
	gptResult: GPTResult;
}

export class TextClarityAnalyser implements AnalysisResult<TextClarityAnalyserParams> {
	id = "clarity";
	name = "Text Clarity";
	description = "Checks whether the text does not contain legal jargon and that it is generally clear.";
	category = AnalysisCategories.Clarity;
	status = AnalysisStatus.Skipped;
	resultSummary = "";
	details = "";

	async analyze(params: TextClarityAnalyserParams) {
		if (params.gptResult["legal-jargon"]) {
			this.resultSummary = `The cookie banner seems to contain legal jargon or unclear text.`;
			this.status = AnalysisStatus.Warning;
		} else {
			this.resultSummary = `The cookie banner seems to have clear text and does not contain legal jargon.`;
			this.status = AnalysisStatus.Passed;
		}
	}
}
