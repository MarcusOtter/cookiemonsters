import type ViewportFindResult from "$lib/ViewportFindResult";
import type { Page } from "puppeteer";

export default interface BannerFinder {
	findBanner(page: Page): Promise<ViewportFindResult>;
}
