import type AnalysisCategory from "$lib/models/AnalysisCategory";
import type AnalysisStatus from "$lib/models/AnalysisStatus";

export default interface AnalysisResult<T> {
	id: string;
	name: string;
	description: string;
	category: AnalysisCategory;
	status: AnalysisStatus;
	resultSummary: string;
	details: string;
	analyze: (params: T) => void;
}
