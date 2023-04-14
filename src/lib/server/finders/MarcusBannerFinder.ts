import type ViewportFindResult from "$lib/ViewportFindResult";
import type { Page } from "puppeteer";
import type BannerFinder from "./BannerFinder";

export default class MarcusBannerFinder implements BannerFinder {
	findBanner(page: Page): Promise<ViewportFindResult> {
		throw new Error("Method not implemented.");
	}
}
