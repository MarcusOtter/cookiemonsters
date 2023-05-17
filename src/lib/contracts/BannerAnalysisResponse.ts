import type { Category } from "./AnalysisCategory";
import type AnalysisStatus from "./AnalysisStatus";

export default class BannerAnalysisResponse {
	public readonly id: string;
	public readonly name: string;
	public readonly description: string;
	public readonly category: Category;
	public readonly status: AnalysisStatus;
	public readonly resultSummary: string;
	public readonly details: string;

	constructor(
		id: string,
		name: string,
		description: string,
		category: Category,
		status: AnalysisStatus,
		resultSummary: string,
		details: string,
	) {
		this.id = id;
		this.name = name;
		this.description = description;
		this.category = category;
		this.status = status;
		this.resultSummary = resultSummary;
		this.details = details;
	}
}
