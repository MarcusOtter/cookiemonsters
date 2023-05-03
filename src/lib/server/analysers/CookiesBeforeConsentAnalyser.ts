import type { Protocol } from "puppeteer";
import type AnalysisResult from "$lib/utils/AnalysisResult";
import type { CookieResult } from "$lib/CookieResult";
import type Db from "../db/Db";

export interface CookiesBeforeConsentAnalyserParams {
	cookies: Protocol.Network.Cookie[];
	database: Db;
}

export class CookiesBeforeConsentAnalyser implements AnalysisResult<CookiesBeforeConsentAnalyserParams> {
	id: string;
	name: string;
	description: string;
	category: string;
	status: "Pass" | "Fail" | "Warning" | "Skipped" | "Undefined";
	resultSummary: string;
	details: string;

	constructor(id: string, name: string, description: string, category: string) {
		this.id = id;
		this.name = name;
		this.description = description;
		this.category = category;
		this.status = "Undefined";
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
			this.status = "Fail";
		} else if (unknownCookies.length > 0) {
			this.resultSummary = `Found ${unknownCookies.length} unknown cookie(s) before consent choice. The necessity of these cookies should be manually checked.`;
			this.status = "Warning";
		} else {
			if (knownNecessaryCookies.length > 0) {
				this.resultSummary = `Found ${knownNecessaryCookies.length} cookie(s) before consent choice, but they all are known "Functional" cookies.`;
			} else {
				this.resultSummary = "No cookies were set before consent choice.";
			}

			this.status = "Pass";
		}
	}
}
