import type { RequestHandler } from "./$types";
import { getDesktopPage, getMobilePage } from "$lib/server/getPage";
import AnalysisResult from "$lib/AnalysisResult";
import getBannerFinders from "$lib/server/finders/getBannerFinders";
import getErrorMessage from "$lib/getErrorMessage";
import Db from "$lib/server/db/Db";

export const GET = (async (request) => {
	let url = request.url.searchParams.get("url");
	if (!url) {
		return new Response("No URL provided", { status: 400 });
	}

	// TODO: If this fails we should also try HTTP maybe. We should do all of this with an URL object.
	if (!url.startsWith("http")) {
		url = `https://${url}`;
	}

	try {
		const database = new Db();
		await database.init();

		// TODO: If we didn't find a selector based on full URL, we should try the hostname (subdomain + domain + TLD)
		// If we at any point find a selector, we need to try to find the element. If we can not find the element, go next.
		// If we find the element, screenshot it and compare it to the checksum we have in the DB.
		// If those checks passed, we don't need to find the cookie banner with a BannerFinder again
		const selector = await database.getSelector(url, "");
		if (selector) {
			console.log("ALREADY HAD SELECTOR ", selector.selector);
		}

		const results = await getResults(url);
		if (!selector) {
			// TODO: Make sure the selector is not empty first :) And obviously clean this mess up!
			console.log("INSERTING SELECTOR ", results[0].viewports[0].bannerCssSelctor);
			await database.insertSelector(url, "", results[0].viewports[0].bannerCssSelctor);
		}

		return new Response(JSON.stringify(results));
	} catch (e) {
		return new Response(getErrorMessage(e), { status: 500 });
	}
}) satisfies RequestHandler;

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
	const requestTimeMs = performance.now() - requestTimeStart;

	// Add delay for debugging purposes
	// This is hardcoded now, but Oliver had a great idea:
	// we should probably retry once after a delay of 5-10s if the immediate scan did not find anything.
	// But we should only to this if the DOM has changed when waiting.
	await new Promise((r) => setTimeout(r, 5000));

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
