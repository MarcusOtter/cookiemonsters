import type { RequestHandler } from "./$types";
import { getDesktopPage, getMobilePage } from "$lib/server/getPage";
import AnalysisResult from "$lib/AnalysisResult";
import getBannerFinders from "$lib/server/finders/getBannerFinders";

export const GET = (async (request) => {
	let url = request.url.searchParams.get("url");
	if (!url) {
		return new Response("No URL provided", { status: 400 });
	}

	// TODO: If this fails we should also try HTTP maybe
	if (!url.startsWith("http")) {
		url = `https://${url}`;
	}

	const results: AnalysisResult[] = [];
	// From https://pptr.dev/api/puppeteer.page.setviewport:
	// A lot of websites don't expect phones to change size,
	// so you should set the viewport before navigating to the page.

	const desktopPage = await getDesktopPage();
	const mobilePage = await getMobilePage();

	await desktopPage.goto(url, { waitUntil: "networkidle0" });
	await mobilePage.goto(url, { waitUntil: "networkidle0" });

	for (const finder of getBannerFinders()) {
		const desktopResult = await finder.findBanner(desktopPage);
		const mobileResult = await finder.findBanner(mobilePage);

		const analysisResult = new AnalysisResult([desktopResult, mobileResult], 0);
		results.push(analysisResult);
	}

	return new Response(JSON.stringify(results));
}) satisfies RequestHandler;
