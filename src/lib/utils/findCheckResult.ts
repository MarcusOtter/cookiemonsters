import type CheckResult from "$lib/utils/CheckResult";

export function findCheckResult(
	checkResults: CheckResult[],
	id: string,
	defaultValue: CheckResult = {
		id: id,
		name: "",
		description: "",
		status: "Fail",
		details: [],
		category: "",
		resultSummary: "",
	},
): CheckResult {
	const result = checkResults.find((result) => result.id === id);
	return result || defaultValue;
}
