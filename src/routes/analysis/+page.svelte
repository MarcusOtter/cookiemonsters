<script lang="ts">
	import { onMount } from "svelte";
	import type AnalysisResult from "$lib/AnalysisResult";
	import getErrorMessage from "$lib/utils/getErrorMessage";

	let results: AnalysisResult[] = [];
	let isLoading = false;
	let targetUrl = "";
	let selector = "";
	let errorMessage = "";
	let selectedResultIndex = 0;

	// If url is missing for some reason (like manually visiting /analysis) we redirect to / (using SvelteKit)
	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		targetUrl = params.get("url") ?? "";
		selector = params.get("selector") ?? "";

		if (!targetUrl) {
			window.location.href = "/";
			return;
		}

		try {
			await analyze();
		} catch (e) {
			errorMessage = getErrorMessage(e);
		}
	});

	async function analyze() {
		if (isLoading) return;

		isLoading = true;
		results = [];

		const apiUrl = `/api/analysis?` + new URLSearchParams({ url: targetUrl, selector: selector });
		const response = await fetch(apiUrl, { method: "GET" });
		if (!response.ok) {
			errorMessage = await response.text();
			isLoading = false;
			return;
		}

		results = (await response.json()) as AnalysisResult[];
		isLoading = false;
	}
</script>

<a href="/">Back to home</a>

<h1>Analysis of {targetUrl}</h1>

{#if results.length > 0}
	<select on:change={(e) => (selectedResultIndex = parseInt(e.currentTarget.value))}>
		{#each results as result, index}
			<option value={index} selected={index === selectedResultIndex}>{result.name}</option>
		{/each}
	</select>
	{#each results[selectedResultIndex].viewports as viewport}
		<h2>Screenshot {viewport.resolution}</h2>
		<p>Found banner: {viewport.foundBanner ? "✅ Yes" : "❌ No"}</p>
		<p>Time taken: {viewport.findDurationMs.toFixed(0)}ms</p>
		<img src="data:image/png;base64,{viewport.screenshotBase64}" alt="Screenshot" />
	{/each}
{:else if isLoading}
	<h2>Loading...</h2>
{:else if errorMessage.length > 0}
	<h2>Error</h2>
	<p>{errorMessage}</p>
	<a href="/analysis?url={targetUrl}">Try again</a>
{/if}

<style>
	h1 {
		margin-block-start: 32px;
	}

	h2 {
		margin-block-start: 48px;
	}

	select {
		margin-block-start: 16px;
	}
</style>
