import { getBrowsers } from "$lib/server/getBrowser";
import type { ElementHandle } from "puppeteer";
import type { RequestHandler } from "./$types";
import AnalysisResult from "$lib/AnalysisResult";

export const GET = ((request) => {
	let url = request.url.searchParams.get("url");
	if (!url) {
		return new Response("No URL provided", { status: 400 });
	}

	if (!url.startsWith("http")) {
		url = `https://${url}`;
	}

	return puppeteerAnalysis(url);
}) satisfies RequestHandler;

async function puppeteerAnalysis(url: string) {
	const browsers = await getBrowsers();
	const results = [];

	for (const browser of browsers) {
		const page = await browser.newPage();

		await page.goto(url, { waitUntil: "networkidle0" });

		const screenshot = await page.screenshot({ encoding: "base64" });

		const headings = await page.$$("h1, h2, h3, h4, h5, h6");
		const headingStructure = await getHeadingStructure(headings);

		// TODO: add analysis code

		await page.close();

		const result = new AnalysisResult(headingStructure, screenshot);
		results.push(result);
	}

	return new Response(JSON.stringify(results));
}

async function getHeadingStructure(headings: ElementHandle<HTMLHeadingElement>[]) {
	let output = ".\n";
	for (let i = 0; i < headings.length; i++) {
		const heading = headings[i];

		const tag = await heading.getProperty("tagName");
		const tagAsString = await tag.jsonValue();
		const level = parseInt(tagAsString.slice(1));

		const nextHeadingTag = ((await headings[i + 1]?.getProperty("tagName")) ?? Promise.resolve()).toString();
		const nextLevel = parseInt(nextHeadingTag.slice(1)) ?? 0;

		const indentation = "    ".repeat(level - 1);
		const tree = nextLevel === level ? "├── " : "└── ";

		const headingText = (await (await heading.getProperty("innerText")).jsonValue()).toString().replaceAll("\n", " ");

		if (headingText.trim() === "") {
			continue;
		}

		output += `${indentation}${tree}(h${level}) ${headingText.trim()}\n`;
	}

	return output;
}
