/*enum AnalysisCategory {
	ConsentAndDisclosure,
	DesignAndUserInterface,
	ClarityAndLanguage,
}

export default AnalysisCategory;
*/

export type Category = {
	name: string;
	displayName: string;
	description: string;
};

export class AnalysisCategory {
	public static ConsentAndDisclosure: Category = {
		name: "ConsentAndDisclosure",
		displayName: "Consent & Disclosure",
		description:
			"This category prioritizes explicit user consent, clear data collection purposes, and pre-consent data storage restrictions, to ensure informed and voluntary user interactions.",
	};

	public static DesignAndUserInterface: Category = {
		name: "DesignAndUserInterface",
		displayName: "Design & User Interface",
		description:
			"This category emphasizes accessible, balanced, and non-intrusive design that respects user choices, ensures readability, and allows for uninterrupted website use.",
	};

	public static ClarityAndLanguage: Category = {
		name: "ClarityAndLanguage",
		displayName: "Clarity & Language",
		description:
			"This section stresses the use of clear, jargon-free language that aligns with the website's language, to facilitate easy understanding and informed decision-making by users.",
	};
}
