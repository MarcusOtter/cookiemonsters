import puppeteer, { Browser } from "puppeteer";

let browser: Browser;

export async function getBrowser() {
	if (browser) {
		return browser;
	}

	browser = await puppeteer.launch({ 
		defaultViewport: { 
			width: 1920, 
			height: 1080 
		}, 
		args: [
			"--lang=en-US"
		]
	});
	return browser;
}
