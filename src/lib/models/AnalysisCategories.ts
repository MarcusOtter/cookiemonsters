import type AnalysisCategory from "./AnalysisCategory";

export default class AnalysisCategories {
	public static Consent: AnalysisCategory = {
		name: "Consent",
		description: "Requirements regarding how and when user consent should be obtained for the use of cookies",
	};

	public static Design: AnalysisCategory = {
		name: "Design",
		description:
			"Requirements for making the purpose, language, and text of the cookie banner specific, understandable, and relevant to the user",
	};

	public static Clarity: AnalysisCategory = {
		name: "Clarity",
		description:
			"Requirements for the visual and interactive aspects of the cookie banner, ensuring it is accessible, user-friendly, and doesn't obstruct normal usage of the website",
	};
}
