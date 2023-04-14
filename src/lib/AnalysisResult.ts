import type ViewportFindResult from "./ViewportFindResult";

export default class AnalysisResult {
	public readonly viewports: ViewportFindResult[];
	public readonly totalDurationMs: number;
	public readonly requestDurationMs: number;

	constructor(viewports: ViewportFindResult[], totalDurationMs: number, requestDurationMs: number) {
		this.viewports = viewports;
		this.totalDurationMs = totalDurationMs;
		this.requestDurationMs = requestDurationMs;
	}
}
