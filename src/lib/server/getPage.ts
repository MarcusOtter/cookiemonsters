import type { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer";

let browser: Browser;

export async function getDesktopPage(): Promise<Page> {
	return getPage({ width: 1920, height: 1080 });
}

// https://www.browserstack.com/guide/ideal-screen-sizes-for-responsive-design
export async function getMobilePage(): Promise<Page> {
	return getPage({ width: 360, height: 640 });
}

async function getPage(viewport: { width: number; height: number }): Promise<Page> {
	const browser = await getBrowser();
	const page = await browser.newPage();
	await page.setViewport(viewport);
	return page;
}

async function getBrowser(): Promise<Browser> {
	if (browser) {
		return browser;
	}

	browser = await puppeteer.launch({ defaultViewport: { width: 1920, height: 1080 } });
	return browser;
}
