import puppeteer, { Browser } from "puppeteer";

let desktopBrowser: Browser;
let mobileBrowser: Browser;

export async function getBrowsers() {
	if (desktopBrowser && mobileBrowser) {
		return [desktopBrowser, mobileBrowser];
	}

	// https://www.browserstack.com/guide/ideal-screen-sizes-for-responsive-design
	desktopBrowser = await puppeteer.launch({ defaultViewport: { width: 1920, height: 1080 } });
	mobileBrowser = await puppeteer.launch({ defaultViewport: { width: 360, height: 640 } });
	return [desktopBrowser, mobileBrowser];
}
