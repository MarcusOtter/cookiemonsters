<script lang="ts">
	import { onMount } from "svelte";
	import type AnalysisResult from "$lib/AnalysisResult";

	let results: AnalysisResult[] = [];
	let isLoading = false;
	let targetUrl = "";
	let errorMessage = "";

	// If url is missing for some reason (like manually visiting /analysis) we redirect to / (using SvelteKit)
	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		targetUrl = params.get("url") ?? "";

		if (!targetUrl) {
			window.location.href = "/";
			return;
		}

		await analyze();
	});

	async function analyze() {
		if (isLoading) return;

		isLoading = true;
		results = [];

		try {
			const response = await fetch(`/api/analysis?` + new URLSearchParams({ url: targetUrl }), {
				method: "GET",
			});

			results = (await response.json()) as AnalysisResult[];
		} catch (e) {
			if (typeof e === "string") {
				errorMessage = e;
			} else if (e instanceof Error) {
				errorMessage = e.message;
			}
		}

		isLoading = false;
	}
</script>

{#if results.length > 0}
	<h2>Analysis</h2>
	{#each results as result}
		<img src="data:image/png;base64,{result.screenshotBase64}" alt="Screenshot" />
	{/each}
{:else if isLoading}
	<h2>Loading...</h2>
{:else if errorMessage.length > 0}
	<h2>Error</h2>
	<p>{errorMessage}</p>
{/if}

<style>
	h2 {
		margin-block-start: 48px;
	}
</style>
