import type AnalysisCategory from "$lib/models/AnalysisCategory";
import type AnalysisStatus from "../models/AnalysisStatus";

export default class BannerAnalysisResponse {
	public readonly id: string;
	public readonly name: string;
	public readonly description: string;
	public readonly category: AnalysisCategory;
	public readonly status: AnalysisStatus;
	public readonly resultSummary: string;
	public readonly details: string;

	constructor(
		id: string,
		name: string,
		description: string,
		category: AnalysisCategory,
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
