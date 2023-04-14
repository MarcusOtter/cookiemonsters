export default class ViewportFindResult {
	public readonly foundBanner: boolean;
	public readonly resolution: string;
	public readonly screenshotBase64: string;
	public readonly findDurationMs: number;

	constructor(foundBanner: boolean, resolution: string, screenshotBase64: string, findDurationMs: number) {
		this.foundBanner = foundBanner;
		this.resolution = resolution;
		this.screenshotBase64 = screenshotBase64;
		this.findDurationMs = findDurationMs;
	}
}
