import type { RequestHandler } from "./$types";
import { getDesktopPage, getMobilePage } from "$lib/server/getPage";
import getBannerFinders from "$lib/server/finders/getBannerFinders";
import getErrorMessage from "$lib/utils/getErrorMessage";
import Db from "$lib/server/db/Db";
import getChecksum from "$lib/utils/getChecksum";
import isValidUrl from "$lib/utils/getURL";
import { getElementOpeningTag, getViewportSizeIndividually } from "$lib/server/puppeteerHelpers";
import type { ElementHandle, Page } from "puppeteer";

export const GET = (async (request): Promise<Response> => {
	console.log(request.url.searchParams);
	let urlString = request.url.searchParams.get("url") ?? "";
	if (!urlString.startsWith("http")) {
		urlString = `https://${urlString}`;
	}

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

	const desktopBanner = await desktopPage.$(selector);
	const mobileBanner = await mobilePage.$(selector);

	const cookieBannerSizePercentageDesktop = desktopBanner
		? await getBannerAreaPercentage(desktopBanner, desktopPage)
		: 0;
	const cookieBannerSizePercentageMobile = mobileBanner ? await getBannerAreaPercentage(mobileBanner, mobilePage) : 0;
	console.log(`Cookie banner takes ${cookieBannerSizePercentageDesktop}% of the viewport on Desktop.`); // RESULT: Banner size
	console.log(`Cookie banner takes ${cookieBannerSizePercentageMobile}% of the viewport on Mobile.`); // RESULT: Banner size

	const textAndTypeDesktop = desktopBanner ? await getTextAndType(desktopBanner) : "";
	console.log(textAndTypeDesktop);

	const textAndTypeMobile = mobileBanner ? await getTextAndType(mobileBanner) : "";
	console.log(textAndTypeMobile);

	await desktopPage.close();
	await mobilePage.close();

	return results;
}

async function getBannerAreaPercentage(banner: ElementHandle, page: Page): Promise<number> {
	const boundingBox = await banner.boundingBox();
	const boundingBoxArea =
		(boundingBox?.width ? boundingBox?.width : 0) * (boundingBox?.height ? boundingBox?.height : 0);

	const viewportSize = getViewportSizeIndividually(page);
	const viewportArea = (viewportSize[0] ? viewportSize[0] : 0) * (viewportSize[1] ? viewportSize[1] : 0);

	return (boundingBoxArea / viewportArea) * 100;
}

async function getTextAndType(element: ElementHandle): Promise<string> {
	const semanticTags = ["a", "button", "input", "select", "textarea"];

	const textAndType = await element.evaluate((el, semanticTags) => {
		function traverse(node: Node, result: [string, string][], semanticTags: string[]): ([string, string] | null)[] {
			if (node.nodeType === Node.TEXT_NODE) {
				const text = node.textContent?.trim();
				if (text) {
					result.push(["p", text.replace(/\s+/g, " ").trim()]);
				}
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				const element = node as HTMLElement;
				const tagName = element.tagName.toLowerCase();

				if (semanticTags.includes(tagName)) {
					result.push([tagName, element.textContent?.replace(/\s+/g, " ").trim() || ""]);
				}

				for (const child of Array.from(element.childNodes)) {
					traverse(child, result, semanticTags);
				}
			}

			return result;
		}
		return traverse(el, [], semanticTags);
	}, semanticTags);

	const duplicates = findDuplicates(textAndType, semanticTags);

	removeDuplicates(textAndType, duplicates);

	return buildFinalText(textAndType);
}

function findDuplicates(textAndType: ([string, string] | null)[], semanticTags: string[]) {
	const duplicates: { tag: string; index: number; duplicates: { tag: string; index: number }[] }[] = [];

	textAndType.forEach((currentElement, i) => {
		const setOfDuplicates: { tag: string; index: number }[] = [];

		textAndType.forEach((compareElement, l) => {
			if (l === i) return;

			if (currentElement != null && compareElement != null && currentElement[1] === compareElement[1]) {
				setOfDuplicates.push({ tag: compareElement[0], index: l });
			}
		});

		if (currentElement != null && setOfDuplicates.length > 0 && semanticTags.includes(currentElement[0])) {
			duplicates.push({ tag: currentElement[0], index: i, duplicates: setOfDuplicates });
		}
	});

	return duplicates;
}

function removeDuplicates(
	textAndType: ([string, string] | null)[],
	duplicates: { tag: string; index: number; duplicates: { tag: string; index: number }[] }[],
) {
	for (const duplicate of duplicates) {
		for (const removable of duplicate["duplicates"]) {
			textAndType[removable["index"]] = null;
		}
	}
}

function buildFinalText(textAndType: ([string, string] | null)[]): string {
	let finalText = "";

	for (const tType of textAndType) {
		if (tType) {
			finalText += `${tType[0]}: "${tType[1]}" `;
		}
	}

	return finalText;
}
