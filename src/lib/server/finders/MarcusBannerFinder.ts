import ViewportFindResult from "$lib/ViewportFindResult";
import type { Page } from "puppeteer";
import type BannerFinder from "./BannerFinder";

export default class MarcusBannerFinder implements BannerFinder {
	/** @inheritdoc */
	async findBanner(page: Page): Promise<ViewportFindResult> {
		return new ViewportFindResult(true, "1920x1080", "0", 0);
	}
}
