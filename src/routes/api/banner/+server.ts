import getErrorMessage from "$lib/utils/getErrorMessage";
import Db from "$lib/server/db/Db";
import { getDesktopPage, getMobilePage } from "$lib/server/getPage";
import type { Page } from "puppeteer";
import type { RequestHandler } from "./$types";
import getChecksum from "$lib/utils/getChecksum";
import isValidUrl from "$lib/utils/getURL";
import { json, error } from "@sveltejs/kit";
import BannerFindResponse, { DeviceResult } from "$lib/contracts/BannerFindResponse";
import { getViewportSize } from "$lib/server/puppeteerHelpers";
import getBannerFinders from "$lib/server/finders/getBannerFinders";
import BannerSelector from "$lib/server/db/BannerSelector";

export const GET = (async (request): Promise<Response> => {
	let urlString = request.url.searchParams.get("url") ?? "";
	if (!urlString.startsWith("http")) {
		urlString = `https://${urlString}`;
	}

	if (!isValidUrl(urlString)) {
		return new Response("Invalid URL", { status: 400 });
	}

	const url = new URL(urlString);
	const desktopPage = await getDesktopPage(url);
	const mobilePage = await getMobilePage(url);

	try {
		const database = new Db();
		await database.init();

		// TODO: If we didn't find a selector based on full URL, we should try the hostname (subdomain + domain + TLD)
		// If we at any point find a selector, we need to try to find the element. If we can not find the element, go next.
		// If we find the element, screenshot it and compare it to the checksum we have in the DB.
		// If those checks passed, we don't need to find the cookie banner with a BannerFinder again

		let selector = await database.getSelector({ fullUrl: url.href });
		const desktopScreenshot = await getScreenshot(selector?.text ?? "", desktopPage);
		const checksum = getChecksum(desktopScreenshot);

		if (checksum !== selector?.checksum) {
			selector = undefined;
		}

		if (!selector) {
			selector = await database.getSelector({ hostname: url.hostname });
			const desktopScreenshot = await getScreenshot(selector?.text ?? "", desktopPage);
			const checksum = getChecksum(desktopScreenshot);

			if (checksum !== selector?.checksum) {
				selector = undefined;
			}
		}

		if (!selector) {
			const results = [];

			for (const finder of getBannerFinders()) {
				const startTime = performance.now();

				const newSelector = await finder.findBannerSelector(desktopPage);
				const desktopScreenshot = await getScreenshot(newSelector, desktopPage);
				const mobileScreenshot = await getScreenshot(newSelector, mobilePage);

				const desktopResult = new DeviceResult(
					getViewportSize(desktopPage),
					desktopScreenshot,
					performance.now() - startTime,
					newSelector,
				);
				const mobileResult = new DeviceResult(
					getViewportSize(mobilePage),
					mobileScreenshot,
					performance.now() - startTime,
					newSelector,
				);

				// TODO: we should probably retry once more on HTTPS after a delay of 5-10s if the immediate scan did not find anything.
				// we know if it didn't find anything if the selector is empty
				// But we should only do this wait if the DOM has changed when waiting.

				results.push(new BannerFindResponse(finder.constructor.name, [desktopResult, mobileResult]));
			}

			const validSelector = results.flatMap((r) => r.devices).find((d) => d.selector !== "")?.selector;
			if (validSelector) {
				// TODO: This still has a bug cause it will write the mobile and desktop selectors,
				// also I don't even know if they're being used correctly
				await database.addSelector(new BannerSelector(url, checksum, validSelector));
			}

			return json(results);
		}

		const mobileScreenshot = await getScreenshot(selector.text, mobilePage);
		const desktopResult = new DeviceResult(getViewportSize(desktopPage), desktopScreenshot, 0, selector.text);

		const mobileResult = new DeviceResult(getViewportSize(mobilePage), mobileScreenshot, 0, selector.text);

		return json([new BannerFindResponse("cached", [desktopResult, mobileResult])]);
	} catch (e) {
		// TODO: Do not return the error message to the client for security reasons
		// Can print table names and etc
		console.error(e);
		throw error(500, getErrorMessage(e));
	} finally {
		await desktopPage.close();
		await mobilePage.close();
	}
}) satisfies RequestHandler;

/**
 * Returns a screenshot of the element as a base64 string.
 * Returns empty string if the element is not in the viewport.
 */
async function getScreenshot(selector: string, page: Page): Promise<string> {
	if (selector === "") return "";

	const banner = await page.$(selector);
	const isOnScreen = banner && (await banner.isIntersectingViewport({ threshold: 0.01 }));

	if (isOnScreen) {
		return (await banner.screenshot({ encoding: "base64" })).toString();
	}

	return "";
}
