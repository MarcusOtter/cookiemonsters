import type { RequestHandler } from "./$types";
import { getDesktopPage, getMobilePage } from "$lib/server/getPage";
import AnalysisResult from "$lib/AnalysisResult";
import getBannerFinders from "$lib/server/finders/getBannerFinders";
import getErrorMessage from "$lib/getErrorMessage";
import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse";

export const GET = (async (request) => {
	let url = request.url.searchParams.get("url");
	if (!url) {
		return new Response("No URL provided", { status: 400 });
	}

	// TODO: If this fails we should also try HTTP maybe
	if (!url.startsWith("http")) {
		url = `https://${url}`;
	}

	try {
		const results = await getResults(url);
		return new Response(JSON.stringify(results));
	} catch (e) {
		return new Response(getErrorMessage(e), { status: 500 });
	}
}) satisfies RequestHandler;

async function getCookieDatabaseRows(): Promise<string[][]> {
	const filePath = path.join(process.cwd(), "src/lib/server/open-cookie-database.csv");

	try {
		const data = await fs.readFile(filePath, "utf-8");
		parse(data, { columns: false, trim: true }, (err, rows) => {
			console.log(typeof rows);
			console.log(rows);
			return rows;
		});
	} catch (error) {
		console.error("Error reading file:", error);
	}

	return [];
}

async function getResults(url: string): Promise<AnalysisResult[]> {
	const results: AnalysisResult[] = [];

	// We have two separate pages instead of one that we resize, because according to
	// https://pptr.dev/api/puppeteer.page.setviewport a lot of websites don't expect
	// phones to change viewport size

	// On second thought, maybe we can start with a desktop page and then resize it to
	// mobile size? It would be a performance improvement and probably work (?)
	const desktopPage = await getDesktopPage();
	const mobilePage = await getMobilePage();

	const requestTimeStart = performance.now();
	await desktopPage.goto(url, { waitUntil: "networkidle0" });
	await mobilePage.goto(url, { waitUntil: "networkidle0" });

	const cookies = await desktopPage.cookies();

	console.log("Set cookies:");

	console.log(cookies);

	const cookieDatabaseRows = await getCookieDatabaseRows();

	for (const cookieDbRow of cookieDatabaseRows) {
		console.log(cookieDbRow);
	}

	const requestTimeMs = performance.now() - requestTimeStart;

	for (const finder of getBannerFinders()) {
		const desktopResult = await finder.findBanner(desktopPage);
		const mobileResult = await finder.findBanner(mobilePage);

		const analysisResult = new AnalysisResult(finder.constructor.name, [desktopResult, mobileResult], requestTimeMs);
		results.push(analysisResult);
	}

	await desktopPage.close();
	await mobilePage.close();

	return results;
}
