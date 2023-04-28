import type { RequestHandler } from "./$types";
import { getDesktopPage, getMobilePage } from "$lib/server/getPage";
import getBannerFinders from "$lib/server/finders/getBannerFinders";
import getErrorMessage from "$lib/utils/getErrorMessage";
import Db from "$lib/server/db/Db";
import getChecksum from "$lib/utils/getChecksum";
import isValidUrl from "$lib/utils/getURL";

export const GET = (async (request): Promise<Response> => {
	const urlString = request.url.searchParams.get("url") ?? "";
	const selector = request.url.searchParams.get("selector") ?? "";

	if (!isValidUrl(urlString)) {
		return new Response("Invalid URL", { status: 400 });
	}

	if (!selector) {
		return new Response("Selector is required", { status: 400 });
	}

	const url = new URL(urlString);

	try {
		const results = await getResults(url, selector);
		return new Response(JSON.stringify(results));
	} catch (e) {
		// TODO: Do not return the error message to the client for security reasons
		console.error(e);
		return new Response(getErrorMessage(e), { status: 500 });
	}
}) satisfies RequestHandler;

async function getResults(url: URL, selector: string): Promise<unknown[]> {
	const results: unknown[] = [];

	// We have two separate pages instead of one that we resize, because according to
	// https://pptr.dev/api/puppeteer.page.setviewport a lot of websites don't expect
	// phones to change viewport size

	// On second thought, maybe we can start with a desktop page and then resize it to
	// mobile size? It would be a performance improvement and probably work (?)
	const desktopPage = await getDesktopPage();
	const mobilePage = await getMobilePage();

	const requestTimeStart = performance.now();
	await desktopPage.goto(url.href, { waitUntil: "networkidle0" });
	await mobilePage.goto(url.href, { waitUntil: "networkidle0" });
	const requestTimeMs = performance.now() - requestTimeStart;

	// Add delay for debugging purposes
	// This is hardcoded now, but Oliver had a great idea:
	// we should probably retry once after a delay of 5-10s if the immediate scan did not find anything.
	// But we should only to this if the DOM has changed when waiting.
	await new Promise((r) => setTimeout(r, 5000));

	results.push({ test: `Analysis is TODO, selector: ${selector}`, hi: [], compile: requestTimeMs });
	// for (const finder of getBannerFinders()) {
	// 	const desktopResult = await finder.findBanner(desktopPage);
	// 	const mobileResult = await finder.findBanner(mobilePage);

	// 	const analysisResult = new AnalysisResult(finder.constructor.name, [desktopResult, mobileResult], requestTimeMs);
	// 	results.push(analysisResult);
	// }

	await desktopPage.close();
	await mobilePage.close();

	return results;
}
