interface CheckDetail {
	description: string;
	value: any; // Depending on the check, this value can be of different types
}

export default interface CheckResult {
	id: string;
	name: string;
	description: string;
	category: string;
	status: "Pass" | "Fail" | "Warning" | "Skipped" | "Undefined";
	resultSummary: string;
	details: CheckDetail[] | null;
}
