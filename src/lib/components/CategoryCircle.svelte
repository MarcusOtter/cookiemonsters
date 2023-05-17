<script lang="ts">
	import check from "$lib/assets/check.svg";
	import warn from "$lib/assets/warn.svg";
	import error from "$lib/assets/error.svg";
	import AnalysisStatus from "$lib/models/AnalysisStatus";
	import type AnalysisCategory from "$lib/models/AnalysisCategory";

	export let category: AnalysisCategory;
	export let status: AnalysisStatus;

	const cssClass = {
		[AnalysisStatus.Skipped]: "skipped",
		[AnalysisStatus.Passed]: "passed",
		[AnalysisStatus.Warning]: "warn",
		[AnalysisStatus.Failed]: "failed",
	}[status];

	const imgSrc = {
		[AnalysisStatus.Skipped]: check,
		[AnalysisStatus.Passed]: check,
		[AnalysisStatus.Warning]: warn,
		[AnalysisStatus.Failed]: error,
	}[status];
</script>

<div class="category">
	<div class="circle {cssClass}">
		<img src={imgSrc} height="32px" alt="" />
		<span>{AnalysisStatus[status]}</span>
	</div>
	<p class="description">{category.name}</p>
</div>

<style>
	.circle {
		width: 150px;
		height: 150px;
		border-radius: 50%;
		border: 7px solid transparent;
		font-size: 1.25rem;
		font-weight: 500;
		display: flex;
		justify-content: center;
		align-items: center;
		flex-direction: column;
	}

	.circle span {
		margin-block-start: 4px;
	}

	.category p {
		margin-block-start: 8px;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.circle.passed {
		border-color: hsl(131, 85%, 72%);
	}

	.circle.warn {
		border-color: hsl(49, 85%, 72%);
	}

	.circle.failed {
		border-color: hsl(0, 85%, 72%);
	}
</style>
