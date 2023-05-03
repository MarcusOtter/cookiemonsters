export default class BannerSelector {
	public readonly id: number;
	public readonly url: string;
	public readonly hostname: string;
	public readonly createdAtUtc: string;
	public readonly checksum: string;
	public readonly text: string;

	constructor(url: URL, checksum: string, text: string) {
		this.id = -1; // set by DB later
		this.url = url.href;
		this.hostname = url.hostname;
		this.createdAtUtc = new Date().toISOString();
		this.checksum = checksum;
		this.text = text;
	}
}
