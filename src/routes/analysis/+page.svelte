<script lang="ts">
	import { onMount } from "svelte";
	import getErrorMessage from "$lib/utils/getErrorMessage";

	let results: any[] = [];
	let isLoading = false;
	let targetUrl = "";
	let selector = "";
	let errorMessage = "";

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

		results = (await response.json()) as any[];
		console.dir(results);
		isLoading = false;
	}
</script>

<a href="/">Back to home</a>

<h1>Analysis of {targetUrl}</h1>

{#if results.length > 0}
	<ul>
		{#each results as result}
			<li>{JSON.stringify(result)}</li>
		{/each}
	</ul>
{:else if isLoading}
	<h2>Loading...</h2>
{:else if errorMessage.length > 0}
	<h2>Error</h2>
	<p>{errorMessage}</p>
{/if}

<style>
	h1 {
		margin-block-start: 32px;
	}

	h2 {
		margin-block-start: 48px;
	}
</style>
