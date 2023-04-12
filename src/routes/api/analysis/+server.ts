import { getBrowser } from "$lib/server/getBrowser";
import type { RequestEvent } from "@sveltejs/kit";

export async function GET(request: RequestEvent) {
	return puppeteerAnalysis(request);
}

async function puppeteerAnalysis(request: RequestEvent) {
	console.time("Function total");

	console.time("Puppeteer init");
	const browser = await getBrowser();
	const page = await browser.newPage();
	console.timeEnd("Puppeteer init");

	console.time("Request");
	await page.goto("https://selenium.dev", { waitUntil: "load" });
	const h1Element = await page.waitForSelector("h1");
	console.timeEnd("Request");

	const h1 = await h1Element?.getProperty("innerText");
	// TODO: add analysis code
	await page.close();

	console.timeEnd("Function total");
	console.log();
	return new Response(`h1 is ${h1}!`);
}
