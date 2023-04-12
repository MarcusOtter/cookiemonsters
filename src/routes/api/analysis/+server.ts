import puppeteer from "puppeteer";

export async function GET() {
	return puppeteerAnalysis();
}

async function puppeteerAnalysis() {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	await page.goto("https://selenium.dev");
	const h1Element = await page.waitForSelector("h1");
	const h1 = await h1Element?.getProperty("innerText");

	await browser.close();
	return new Response(`h1 is ${h1}!`);
}
