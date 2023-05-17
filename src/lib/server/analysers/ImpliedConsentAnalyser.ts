import AnalysisCategories from "$lib/models/AnalysisCategories";
import AnalysisStatus from "$lib/models/AnalysisStatus";
import type AnalysisResult from "$lib/utils/AnalysisResult";
import type { GPTResult } from "../GPTResult";

export interface ImpliedConsentAnalyserParams {
	gptResult: GPTResult;
}

export class ImpliedConsentAnalyser implements AnalysisResult<ImpliedConsentAnalyserParams> {
	id = "implied-consent";
	name = "Implied Consent";
	description = "Checks that the cookie banner doesn't assume implied consent.";
	category = AnalysisCategories.Consent;
	status = AnalysisStatus.Skipped;
	resultSummary = "";
	details = "";

	async analyze(params: ImpliedConsentAnalyserParams) {
		if (params.gptResult["implied-consent"]) {
			this.resultSummary = `The cookie banner contains wording that suggests that the user has no say in consent i.e. Implied consent.`;
			this.status = AnalysisStatus.Failed;
		} else {
			this.resultSummary = `The cookie banner does not seem to contain wording of implied consent.`;
			this.status = AnalysisStatus.Passed;
		}
	}
}
