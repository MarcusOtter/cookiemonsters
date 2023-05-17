import type { ElementHandle, Page } from "puppeteer";
import { getViewportSizeIndividually } from "../puppeteerHelpers";
import type AnalysisResult from "$lib/utils/AnalysisResult";
import AnalysisStatus from "$lib/contracts/AnalysisStatus";
import type { Category } from "$lib/contracts/AnalysisCategory";

export interface BannerSizeAnalyserParams {
	banner: ElementHandle<Element>;
	page: Page;
}

export class BannerSizeAnalyser implements AnalysisResult<BannerSizeAnalyserParams> {
	id: string;
	name: string;
	description: string;
	category: Category;
	status: AnalysisStatus;
	resultSummary: string;
	details: string;

	constructor(id: string, name: string, description: string, category: Category) {
		this.id = id;
		this.name = name;
		this.description = description;
		this.category = category;
		this.status = AnalysisStatus.Skipped;
		this.resultSummary = "";
		this.details = "";
	}

	async analyze(params: BannerSizeAnalyserParams) {
		const bannerSizePercentage = params.banner ? await getBannerAreaPercentage(params.banner, params.page) : 0;

		this.resultSummary = `The cookie banner takes up ${Math.round(bannerSizePercentage)}% of the screen.`;
		if (Math.round(bannerSizePercentage) >= 25) {
			this.status = AnalysisStatus.Warning;
		} else {
			this.status = AnalysisStatus.Passed;
		}
	}
}

/**
 * Calculates the percentage of the viewport area occupied by the cookie banner.
 * @async
 * @param {ElementHandle} banner - The ElementHandle representing the cookie banner.
 * @param {Page} page - The Puppeteer Page object.
 * @returns {Promise<number>} The percentage of the viewport area occupied by the cookie banner.
 */
async function getBannerAreaPercentage(banner: ElementHandle, page: Page): Promise<number> {
	const boundingBox = await banner.boundingBox();
	const boundingBoxArea =
		(boundingBox?.width ? boundingBox?.width : 0) * (boundingBox?.height ? boundingBox?.height : 0);

	const viewportSize = getViewportSizeIndividually(page);
	const viewportArea = (viewportSize[0] ? viewportSize[0] : 0) * (viewportSize[1] ? viewportSize[1] : 0);

	return (boundingBoxArea / viewportArea) * 100;
}
