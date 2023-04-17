import type { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer";

let browser: Browser;

export async function getDesktopPage(): Promise<Page> {
	const userAgent =
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36";
	return await getPage({ width: 1920, height: 1080 }, userAgent);
}

// https://www.browserstack.com/guide/ideal-screen-sizes-for-responsive-design
export async function getMobilePage(): Promise<Page> {
	const userAgent =
		"Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1";
	return await getPage({ width: 360, height: 640 }, userAgent);
}

async function getPage(viewport: { width: number; height: number }, userAgent: string): Promise<Page> {
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

	browser = await puppeteer.launch();
	return browser;
}
