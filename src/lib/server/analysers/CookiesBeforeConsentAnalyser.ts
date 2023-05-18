import type { Protocol } from "puppeteer";
import type AnalysisResult from "$lib/utils/AnalysisResult";
import type { CookieResult } from "$lib/CookieResult";
import type Db from "../db/Db";
import AnalysisStatus from "$lib/models/AnalysisStatus";
import AnalysisCategories from "$lib/models/AnalysisCategories";

export interface CookiesBeforeConsentAnalyserParams {
	cookies: Protocol.Network.Cookie[];
	database: Db;
}

export class CookiesBeforeConsentAnalyser implements AnalysisResult<CookiesBeforeConsentAnalyserParams> {
	id = "cookies-before-consent";
	name = "Cookies Before Consent";
	description = "Checks whether cookies are set before consent is obtained from the website's user.";
	category = AnalysisCategories.Consent;
	status = AnalysisStatus.Skipped;
	resultSummary = "";
	details = "";

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
		const knownFunctionalCookies = foundCookies.filter(
			(el) => el.CookieObject != undefined && el.CookieObject.category == "Functional",
		);
		const knownUnnecessaryCookies = foundCookies.filter(
			(el) => el.CookieObject != undefined && el.CookieObject.category != "Functional",
		);

		if (unknownCookies.length == 0 && knownFunctionalCookies.length == 0 && knownUnnecessaryCookies.length == 0) {
			this.resultSummary = "No cookies were set before consent choice.";
			this.status = AnalysisStatus.Passed;
		} else {
			this.resultSummary = `Found ${knownUnnecessaryCookies.length} known unnecessary cookie(s), ${unknownCookies.length} unknown cookie(s), and ${knownFunctionalCookies.length} known functional cookie(s). The necessity of all cookies should be manually checked.`;

			this.details = `These details are from the Open Cookie Database and are not written by cookiemonsters.eu.
`;
		}

		if (unknownCookies.length > 0) {
			this.status = AnalysisStatus.Warning;
			this.details += `
Unknown cookies:`;
			for (const cookie of unknownCookies) {
				this.details += `
Name: ${cookie.ClientCookie.name}
`;
			}
		}

		if (knownFunctionalCookies.length > 0) {
			this.status = AnalysisStatus.Warning;
			this.details += `
Known functional cookies:`;
			for (const cookie of knownFunctionalCookies) {
				this.details += `
Name: ${cookie.ClientCookie.name}
Type: ${cookie.CookieObject?.category}
Data Controller: ${cookie.CookieObject?.controller}
Description: ${cookie.CookieObject?.description}
`;
			}
		}

		if (knownUnnecessaryCookies.length > 0) {
			this.status = AnalysisStatus.Failed;
			this.details += `
Known unnecessary cookies:`;

			for (const cookie of knownUnnecessaryCookies) {
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
