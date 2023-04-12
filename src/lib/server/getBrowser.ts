import puppeteer, { Browser } from "puppeteer";

let browser: Browser;

export async function getBrowser() {
	if (browser) {
		return browser;
	}

	browser = await puppeteer.launch();
	return browser;
}
