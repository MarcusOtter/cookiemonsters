import type { Page } from "puppeteer";

export default interface BannerFinder {
	/**
	 * Finds the banner on the given page. The page is expected to be loaded on a given site and is ready to be analyzed.
	 * Implementations should NOT modify the page in any way or close it.
	 * @param page The page to analyze
	 * @returns The selector, empty if not found
	 */
	findBannerSelector(page: Page): Promise<string>;
}
