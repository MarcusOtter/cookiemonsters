import { Builder } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import "chromedriver";
import puppeteer from "puppeteer";

export async function GET() {
	// return seleniumAnalysis();
	return puppeteerAnalysis();
}

async function puppeteerAnalysis() {
	console.time("Function total");

	console.time("Puppeteer init");
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	console.timeEnd("Puppeteer init");

	console.time("Request");
	await page.goto("https://selenium.dev");
	const h1Element = await page.waitForSelector("h1");
	console.timeEnd("Request");

	const h1 = await h1Element?.getProperty("innerText");
	await browser.close();

	console.timeEnd("Function total");
	console.log();
	return new Response(`h1 is ${h1}!`);
}

async function seleniumAnalysis() {
	console.time("Function total");

	console.time("Selenium driver init");
	const chromeOptions = new chrome.Options();
	chromeOptions.addArguments("headless");
	const driver = await new Builder().forBrowser("chrome").setChromeOptions(chromeOptions).build();
	console.timeEnd("Selenium driver init");

	console.time("Request");
	await driver.get("https://selenium.dev");
	console.timeEnd("Request");

	console.time("h1");
	const h1 = await driver.findElement({ css: "h1" }).getText();
	console.timeEnd("h1");

	await driver.quit();

	console.timeEnd("Function total");
	return new Response(`h1 is ${h1}!`);
}
