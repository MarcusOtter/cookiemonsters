import type { Protocol } from "puppeteer";
import type AnalysisResult from "$lib/utils/AnalysisResult";
import type { CookieResult } from "$lib/CookieResult";
import type Db from "../db/Db";
import AnalysisStatus from "$lib/contracts/AnalysisStatus";
import type AnalysisCategory from "$lib/contracts/AnalysisCategory";

export interface CookiesBeforeConsentAnalyserParams {
	cookies: Protocol.Network.Cookie[];
	database: Db;
}

export class CookiesBeforeConsentAnalyser implements AnalysisResult<CookiesBeforeConsentAnalyserParams> {
	id: string;
	name: string;
	description: string;
	category: AnalysisCategory;
	status: AnalysisStatus;
	resultSummary: string;
	details: string;

	constructor(id: string, name: string, description: string, category: AnalysisCategory) {
		this.id = id;
		this.name = name;
		this.description = description;
		this.category = category;
		this.status = AnalysisStatus.Skipped;
		this.resultSummary = "";
		this.details = "";
	}

	async analyze(params: CookiesBeforeConsentAnalyserParams) {
		const foundCookies: CookieResult[] = [];

		for (const clientCookie of params.cookies) {
			const foundClientCookie = <CookieResult>{
				ClientCookie: clientCookie,
				CookieObject: undefined,
			};
			foundClientCookie.CookieObject = await params.database.getCookie({ cookieName: clientCookie.name });
			foundCookies.push(foundClientCookie);
		}

		const unknownCookies = foundCookies.filter((el) => el.CookieObject == undefined);
		const knownNecessaryCookies = foundCookies.filter(
			(el) => el.CookieObject != undefined && el.CookieObject.category == "Functional",
		);
		const knownUnnecessaryCookies = foundCookies.filter(
			(el) => el.CookieObject != undefined && el.CookieObject.category != "Functional",
		);

		if (knownUnnecessaryCookies.length > 0) {
			this.resultSummary = `Found ${knownUnnecessaryCookies.length} known unnecessary cookie(s) ${
				unknownCookies.length > 0 ? `and ${unknownCookies.length} unknown cookie(s) ` : ""
			}before consent choice.`;
			this.status = AnalysisStatus.Failed;
			this.details += `Known unnecessary cookies:`;

			for (const cookie of knownUnnecessaryCookies) {
				this.details += `
Name: ${cookie.ClientCookie.name}
Type: ${cookie.CookieObject?.category}
Data Controller: ${cookie.CookieObject?.controller}
Description: ${cookie.CookieObject?.description}
`;
			}

			if (unknownCookies.length > 0) {
				this.details += `
Unknown cookies:`;
				for (const cookie of unknownCookies) {
					this.details += `
Name: ${cookie.ClientCookie.name}
`;
				}
			}
		} else if (unknownCookies.length > 0) {
			this.resultSummary = `Found ${unknownCookies.length} unknown cookie(s) before consent choice. The necessity of these cookies should be manually checked.`;
			this.status = AnalysisStatus.Warning;
			this.details = `Unknown cookies:`;
			for (const cookie of unknownCookies) {
				this.details += `
Name: ${cookie.ClientCookie.name}
			`;
			}
		} else {
			if (knownNecessaryCookies.length > 0) {
				this.resultSummary = `Found ${knownNecessaryCookies.length} cookie(s) before consent choice, but they all are known "Functional" cookies.`;
			} else {
				this.resultSummary = "No cookies were set before consent choice.";
			}

			this.status = AnalysisStatus.Passed;
		}

		if (knownNecessaryCookies.length > 0) {
			this.details += `
Known necessary cookies:`;
			for (const cookie of knownNecessaryCookies) {
				this.details += `
Name: ${cookie.ClientCookie.name}
Type: ${cookie.CookieObject?.category}
Data Controller: ${cookie.CookieObject?.controller}
Description: ${cookie.CookieObject?.description}
`;
			}
		}
	}
}
