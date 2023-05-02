import type { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer";

let browser: Browser;

// TODO: Would be good to cycle through some user agents
// TODO: If request fails, try with a differnt protocol (http vs https)

export async function getDesktopPage(url?: URL): Promise<Page> {
	const userAgent =
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36";
	const page = await getPage({ width: 1920, height: 1080 }, userAgent);
	if (url) {
		await page.goto(url.href, { waitUntil: "networkidle0" });
	}
	return page;
}

// https://www.browserstack.com/guide/ideal-screen-sizes-for-responsive-design
export async function getMobilePage(url?: URL): Promise<Page> {
	const userAgent =
		"Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1";
	const page = await getPage({ width: 360, height: 640 }, userAgent);
	if (url) {
		await page.goto(url.href, { waitUntil: "networkidle0" });
	}
	return page;
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

	browser = await puppeteer.launch({
		headless: false,

		// These args be needed to not get blocked by CORS on some sites
		// However, I'm not sure what the security implications are since we are
		// letting users visit arbitrary websites on our server
		// args: [
		// 	"--disable-web-security",
		// 	"--disable-features=IsolateOrigins",
		// 	"--disable-site-isolation-trials",
		// ],
	});
	return browser;
}
