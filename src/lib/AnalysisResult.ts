import type ViewportFindResult from "./ViewportFindResult";

export default class AnalysisResult {
	public readonly name: string;
	public readonly viewports: ViewportFindResult[];
	public readonly requestDurationMs: number;

	constructor(name: string, viewports: ViewportFindResult[], requestDurationMs: number) {
		this.name = name;
		this.viewports = viewports;
		this.requestDurationMs = requestDurationMs;
	}
}
