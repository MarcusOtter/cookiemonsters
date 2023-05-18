<script lang="ts">
	import { onMount } from "svelte";
	import getErrorMessage from "$lib/utils/getErrorMessage";
	import Loading from "$lib/components/Loading.svelte";
	import CategoryCircle from "$lib/components/CategoryCircle.svelte";
	import AnalysisStatus from "$lib/models/AnalysisStatus";

	import arrowDown from "$lib/assets/arrow-down.svg";
	import type BannerAnalysisResponse from "$lib/contracts/BannerAnalysisResponse";
	import type AnalysisCategory from "$lib/models/AnalysisCategory";
	import AnalysisCategories from "$lib/models/AnalysisCategories";

	let results: BannerAnalysisResponse[] = [];
	let categories: AnalysisCategory[] = [];

	let isLoading = false;
	let errorMessage = "";

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		try {
			await analyze(params);
		} catch (e) {
			errorMessage = getErrorMessage(e);
		}
	});

	async function analyze(params: URLSearchParams) {
		if (isLoading) return;

		isLoading = true;
		results = [];

		const apiUrl = `/api/analysis?` + params;
		const response = await fetch(apiUrl, { method: "GET" });
		if (!response.ok) {
			errorMessage = await response.text();
			isLoading = false;
			return;
		}

		results = (await response.json()) as BannerAnalysisResponse[];
		categories = Array.from(new Set(results.map((res) => JSON.stringify(res.category)))).map((category) =>
			JSON.parse(category),
		);

		isLoading = false;
	}

	function getStatusForCategory(category: AnalysisCategory): AnalysisStatus {
		const resultsForCategory = results.filter((res) => res.category.name === category.name);
		if (resultsForCategory.some((res) => res.status === AnalysisStatus.Failed)) return AnalysisStatus.Failed;
		if (resultsForCategory.some((res) => res.status === AnalysisStatus.Warning)) return AnalysisStatus.Warning;
		if (resultsForCategory.some((res) => res.status === AnalysisStatus.Passed)) return AnalysisStatus.Passed;
		return AnalysisStatus.Skipped;
	}

	function showDetails(i: number, l: number) {
		const detailsBox = document.querySelector(`.extra-details-${i}-${l}`) as HTMLElement;
		const detailsButton = document.querySelector(`.extra-details-button-${i}-${l}`) as HTMLElement;

		if (detailsBox.style.display === "block") {
			detailsBox.style.display = "none";
			detailsButton.innerText = "Show more";
		} else {
			detailsBox.style.display = "block";
			detailsButton.innerText = "Show less";
		}
	}
</script>

<div class="output">
	{#if results.length > 0}
		<div class="box">
			<h1>Overview</h1>
			<div class="circles">
				<CategoryCircle
					category={AnalysisCategories.Consent}
					status={getStatusForCategory(AnalysisCategories.Consent)}
				/>
				<CategoryCircle category={AnalysisCategories.Design} status={getStatusForCategory(AnalysisCategories.Design)} />
				<CategoryCircle
					category={AnalysisCategories.Clarity}
					status={getStatusForCategory(AnalysisCategories.Clarity)}
				/>
			</div>
		</div>
		<p class="disclaimer">
			The results and suggestions provided by cookiemonsters.eu are not legal advice and can be biased and/or incorrect.
		</p>
		<a href="#{CSS.escape(categories[0].name)}" class="details-link">
			<p>Details</p>
			<img src={arrowDown} alt="" width="24" />
		</a>
		<div class="details">
			{#each categories as category, i}
				<h2 id={CSS.escape(category.name)}>{category.name}</h2>
				<p>{category.description}</p>
				<div class="category-results {AnalysisStatus[getStatusForCategory(category)].toLowerCase()}">
					{#each results.filter((res) => res.category.name === category.name) as result, l}
						<div class="result {AnalysisStatus[result.status].toLowerCase()}">
							<h3>{result.name}</h3>
							<p>{result.description === "" ? "Description missing" : result.description}</p>
							<h4>Result</h4>
							<p>{result.resultSummary}</p>

							{#if result.details}
								<button on:click|preventDefault={() => showDetails(i, l)} class="extra-details-button-{i}-{l}"
									>Show more</button
								>
								<div class="extra-details-{i}-{l}">
									<hr />
									<h4>Details</h4>
									<pre>{result.details}</pre>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/each}
		</div>
	{:else if isLoading}
		<Loading title="Analyzing banner" subtitle="This will take a few seconds" />
	{:else if errorMessage.length > 0}
		<h2>Error</h2>
		<p>{errorMessage}</p>
	{/if}
</div>

<style>
	.output {
		text-align: center;
		display: flex;
		align-items: center;
		flex-direction: column;
		font-size: 1.5rem;
	}

	.disclaimer {
		margin-block-start: 16px;
		font-size: 1rem;
		font-weight: 500;
	}

	a.details-link {
		display: flex;
		text-decoration: none;
		flex-direction: column;
		align-items: center;
		font-size: 1rem;
		text-transform: uppercase;
	}

	a.details-link img {
		transition-duration: 200ms;
		transition-property: transform;
	}

	a.details-link:hover img {
		transform: translateY(8px);
	}

	a.details-link p {
		margin-block-start: 48px;
	}

	.details {
		margin-block-start: 128px;
		text-align: left;
		max-width: 60ch;
	}

	.details > p {
		font-size: 0.85em;
		line-height: 1.5em;
		margin-block-start: 10px;
	}

	.details h2 {
		margin-block-start: 48px;
	}

	.details h4 {
		margin-block-start: 16px;
	}

	.category-results {
		border: 2px solid hsla(0, 0%, 100%, 0.1);
		background: linear-gradient(180deg, hsl(231, 9%, 15%), hsl(228, 10%, 10%)) 0% 0% no-repeat padding-box;
		padding: 16px;
		border-radius: 16px;
		margin-block-start: 16px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.category-results.passed {
		border-color: hsl(131, 85%, 72%);
	}
	.category-results.warning {
		border-color: hsl(49, 85%, 72%);
	}
	.category-results.failed {
		border-color: hsl(0, 85%, 72%);
	}

	.category-results pre {
		white-space: pre-wrap;
		font-size: inherit;
		font-family: inherit;
	}

	.category-results .result {
		padding: 24px 20% 24px 24px;
		border-radius: 16px;
		font-size: 1rem;
		position: relative;
		border: 2px solid hsla(0, 0%, 100%, 0.1);
	}

	.category-results .result::before {
		position: absolute;
		top: 24px;
		right: 24px;
		font-size: 1rem;
		padding: 4px 16px;
		border-radius: 8px;
		color: black;
		font-weight: 700;
	}

	.category-results .result.passed::before {
		content: "Pass";
		background-color: hsl(131, 85%, 72%);
	}

	.category-results .result.warning::before {
		content: "Warn";
		background-color: hsl(49, 85%, 72%);
	}

	.category-results .result.failed::before {
		content: "Fail";
		background-color: hsl(0, 85%, 72%);
	}

	.category-results .result.skipped::before {
		content: "Skip";
		background-color: hsla(0, 0%, 100%, 0.1);
		color: white;
	}

	.circles {
		margin-top: 32px;
		display: flex;
		gap: 48px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.box {
		margin-block-start: 64px;
		border-radius: 16px;
		padding: 32px 64px;
		background: linear-gradient(180deg, hsl(231, 9%, 15%), hsl(228, 10%, 10%)) 0% 0% no-repeat padding-box;
		text-align: center;
		border: 2px solid hsla(0, 0%, 100%, 0.05);
	}

	.box h1 {
		font-size: 1.5rem;
	}

	div[class^="extra-details-"] {
		display: none;
	}

	.result button {
		background: hsl(240, 8%, 13%);
		border: solid 1px;
		border-color: #44464a;
		border-radius: 6px;
		padding: 5px 15px;
		display: block;
		position: absolute;
		bottom: -20px;
		left: 50%;
		transform: translateX(-50%);
		cursor: pointer;
	}

	.result button:hover {
		background: hsl(240, 8%, 20%);
	}

	hr {
		margin-top: 14px;
		border-width: 0;
		border-top-width: 1px;
		opacity: 0.3;
	}
</style>
