export default class BannerFindResponse {
	public readonly screenshot: string;
	public readonly selector: string;
	public readonly url: string;
	public readonly isMobile: boolean;
	public readonly width: number;
	public readonly height: number;

	constructor(screenshot: string, selector: string, url: string, isMobile: boolean, width: number, height: number) {
		this.screenshot = screenshot;
		this.selector = selector;
		this.url = url;
		this.isMobile = isMobile;
		this.width = width;
		this.height = height;
	}
}
