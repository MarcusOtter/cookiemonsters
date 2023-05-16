import getErrorMessage from "$lib/utils/getErrorMessage";
import Db from "$lib/server/db/Db";
import { getDesktopPage, getMobilePage } from "$lib/server/getPage";
import type { Page } from "puppeteer";
import type { RequestHandler } from "./$types";
import getChecksum from "$lib/utils/getChecksum";
import isValidUrl from "$lib/utils/getURL";
import { json, error } from "@sveltejs/kit";
import BannerFindResponse from "$lib/contracts/BannerFindResponse";
import BannerSelector from "$lib/server/db/BannerSelector";
import MarcusUltraFinder from "$lib/server/finders/MarcusUltraFinder";

export const GET = (async (request): Promise<Response> => {
	let urlString = request.url.searchParams.get("url") ?? "";
	const isMobile = !!(request.url.searchParams.get("isMobile") ?? false);
	const width = parseInt(request.url.searchParams.get("width") ?? "1920");
	const height = parseInt(request.url.searchParams.get("height") ?? "1080");

	if (!urlString.startsWith("http")) {
		urlString = `https://${urlString}`;
	}

	if (!isValidUrl(urlString)) {
		return new Response("Invalid URL", { status: 400 });
	}

	const url = new URL(urlString);
	const page = isMobile ? await getMobilePage(width, height, url) : await getDesktopPage(width, height, url);

	try {
		const database = new Db();
		await database.init();

		// If we at any point find a selector, we need to try to find the element. If we can not find the element, go next.
		// If we find the element, screenshot it and compare it to the checksum we have in the DB.
		// If those checks passed, we don't need to find the cookie banner with a BannerFinder again

		let selector = await database.getSelector({ fullUrl: url.href });
		if (!(await isActiveSelector(selector, page))) {
			selector = undefined;
		}

		// If we didn't find a selector based on full URL, we should try the hostname (subdomain + domain + TLD)
		if (!selector) {
			selector = await database.getSelector({ hostname: url.hostname });
			selector && console.log("Cache hit selector: ", selector.text);
			if (!(await isActiveSelector(selector, page))) {
				console.log("Inactive selector ^");
				selector = undefined;
			}
		}

		if (selector && (await isActiveSelector(selector, page))) {
			const screenshot = await getScreenshot(selector.text, page);
			return json(new BannerFindResponse(screenshot, selector.text, url.href, isMobile, width, height));
		}

		const finder = new MarcusUltraFinder();

		let newSelector = await finder.findBannerSelector(page);
		if (!newSelector) {
			await new Promise((r) => setTimeout(r, 5000));
			newSelector = await finder.findBannerSelector(page);
		}

		let screenshot = await getScreenshot(newSelector, page);
		const checksum = getChecksum(screenshot);

		if (newSelector) {
			// TODO: We probably want to add resolution and maybe even the user agent (?)
			await database.addSelector(new BannerSelector(url, checksum, newSelector));
		}

		if (!screenshot) {
			screenshot = (await page.screenshot({ encoding: "base64" })) as string;
		}

		return json(new BannerFindResponse(screenshot, newSelector, url.href, isMobile, width, height));
	} catch (e) {
		// TODO: Do not return the error message to the client for security reasons
		// Can print table names and etc
		console.error(e);
		throw error(500, getErrorMessage(e));
	} finally {
		await page.close();
	}
}) satisfies RequestHandler;

/**
 * Returns a screenshot of the element as a base64 string.
 * Returns empty string if the element is not in the viewport.
 */
async function getScreenshot(selector: string, page: Page): Promise<string> {
	if (!selector) return "";

	try {
		const banner = await page.$(selector);
		const isOnScreen = banner && (await banner.isIntersectingViewport({ threshold: 0.01 }));
		if (isOnScreen) {
			const screenshot = await banner.screenshot({ encoding: "base64" });
			return screenshot.toString();
		}

		return "";
	} catch {
		return "";
	}
}

async function isActiveSelector(selector: BannerSelector | undefined, page: Page) {
	if (!selector) return false;

	const screenshot = await getScreenshot(selector.text, page);
	const checksum = getChecksum(screenshot);

	return checksum === selector.checksum;
}
