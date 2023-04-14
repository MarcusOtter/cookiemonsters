export default class AnalysisResult {
	public readonly foundBanner: boolean;
	public readonly resolution: string;
	public readonly screenshotBase64: string;

	constructor(resolution: string, screenshotBase64: string, foundBanner: boolean) {
		this.resolution = resolution;
		this.screenshotBase64 = screenshotBase64;
		this.foundBanner = foundBanner;
	}
}
