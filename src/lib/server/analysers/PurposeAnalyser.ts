import AnalysisCategories from "$lib/models/AnalysisCategories";
import AnalysisStatus from "$lib/models/AnalysisStatus";
import type AnalysisResult from "$lib/utils/AnalysisResult";
import type { GPTResult } from "../GPTResult";

export interface PurposeAnalyserParams {
	gptResult: GPTResult;
}

export class PurposeAnalyser implements AnalysisResult<PurposeAnalyserParams> {
	id = "purpose";
	name = "Cookie Purpose";
	description = "Checks whether cookies' purpose is described clearly.";
	category = AnalysisCategories.Clarity;
	status = AnalysisStatus.Skipped;
	resultSummary = "";
	details = "";

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
