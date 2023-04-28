export default class BannerFindResponse {
	public readonly finderName: string;
	public readonly devices: DeviceResult[];

	constructor(finderName: string, deviceResults: DeviceResult[]) {
		this.finderName = finderName;
		this.devices = deviceResults;
	}
}

export class DeviceResult {
	public readonly resolution: string;
	public readonly screenshot: string;
	public readonly durationMs: number;
	public readonly selector: string;

	constructor(resolution: string, screenshot: string, durationMs: number, selector: string) {
		this.resolution = resolution;
		this.screenshot = screenshot;
		this.durationMs = durationMs;
		this.selector = selector;
	}
}
