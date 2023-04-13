export default class AnalysisResult {
	public readonly headingStructure: string;
	public readonly screenshotBase64: string;

	constructor(headingStructure: string, screenshotBase64: string) {
		this.headingStructure = headingStructure;
		this.screenshotBase64 = screenshotBase64;
	}
}
