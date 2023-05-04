export default class BannerFindResponse {
	public readonly screenshot: string;
	public readonly selector: string;
	public readonly resolution: string;
	public readonly url: string;
	public readonly isMobile: boolean;

	constructor(screenshot: string, selector: string, resolution: string, url: string, isMobile: boolean) {
		this.screenshot = screenshot;
		this.selector = selector;
		this.resolution = resolution;
		this.url = url;
		this.isMobile = isMobile;
	}
}
