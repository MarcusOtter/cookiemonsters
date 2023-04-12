import { Builder } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";
import "chromedriver";
import puppeteer from "puppeteer";

export async function GET() {
	// return seleniumAnalysis();
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

async function seleniumAnalysis() {
	const chromeOptions = new chrome.Options();
	chromeOptions.addArguments("headless");
	const driver = await new Builder().forBrowser("chrome").setChromeOptions(chromeOptions).build();

	await driver.get("https://selenium.dev");
	const h1 = await driver.findElement({ css: "h1" }).getText();

	await driver.quit();
	return new Response(`h1 is ${h1}!`);
}
