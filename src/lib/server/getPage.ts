import type { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer";

let browser: Browser;

export async function getDesktopPage(): Promise<Page> {
	return getPage({ width: 1920, height: 1080 });
}

// https://www.browserstack.com/guide/ideal-screen-sizes-for-responsive-design
export async function getMobilePage(): Promise<Page> {
	const userAgent =
		"Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1";
	return getPage({ width: 360, height: 640 }, userAgent);
}

async function getPage(viewport: { width: number; height: number }, userAgent = ""): Promise<Page> {
	const browser = await getBrowser();
	const page = await browser.newPage();
	await page.setViewport(viewport);
	if (userAgent) {
		await page.setUserAgent(userAgent);
	}
	return page;
}

async function getBrowser(): Promise<Browser> {
	if (browser) {
		return browser;
	}

	browser = await puppeteer.launch({ defaultViewport: { width: 1920, height: 1080 } });
	return browser;
}
