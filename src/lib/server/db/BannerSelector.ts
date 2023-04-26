export default class BannerSelector {
	public readonly id: number;
	public readonly url: string;
	public readonly createdAtUtc: string;
	public readonly checksum: string;
	public readonly selector: string;

	constructor(id: number, url: string, createdAtUtc: string, checksum: string, selector: string) {
		this.id = id;
		this.url = url;
		this.createdAtUtc = createdAtUtc;
		this.checksum = checksum;
		this.selector = selector;
	}
}
