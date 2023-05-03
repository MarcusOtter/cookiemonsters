export default interface AnalysisResult<T> {
	id: string;
	name: string;
	description: string;
	category: string;
	status: "Pass" | "Fail" | "Warning" | "Skipped" | "Undefined";
	resultSummary: string;
	details: string;
	analyze: (params: T) => void;
}
