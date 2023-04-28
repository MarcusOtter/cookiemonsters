<script lang="ts">
	import { onMount } from "svelte";
	import getErrorMessage from "$lib/utils/getErrorMessage";
	import type BannerFindResponse from "$lib/contracts/BannerFindResponse";

	let results: BannerFindResponse[] = [];
	let isLoading = false;
	let targetUrl = "";
	let errorMessage = "";
	let selectedResultIndex = 0;

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		targetUrl = params.get("url") ?? "";

		// If url is missing for some reason we redirect to /
		if (!targetUrl) {
			window.location.href = "/";
			return;
		}

		try {
			await findBanner();
		} catch (e) {
			errorMessage = getErrorMessage(e);
		}
	});

	async function findBanner() {
		if (isLoading) return;

		isLoading = true;
		results = [];

		const apiUrl = `/api/banner?` + new URLSearchParams({ url: targetUrl });
		const response = await fetch(apiUrl, { method: "GET" });
		if (!response.ok) {
			errorMessage = await response.text();
			isLoading = false;
			return;
		}

		results = (await response.json()) as BannerFindResponse[];
		isLoading = false;
	}
</script>

<a href="/">Back to home</a>

<h1>Looking for cookie banners on {targetUrl}...</h1>

{#if results.length > 0}
	<select on:change={(e) => (selectedResultIndex = parseInt(e.currentTarget.value))}>
		{#each results as result, index}
			<option value={index} selected={index === selectedResultIndex}>{result.finderName}</option>
		{/each}
	</select>
	{#each results[selectedResultIndex].devices as viewport}
		<h2>Screenshot {viewport.resolution}</h2>
		<p>Found banner: {viewport.selector === "" ? "❌ No" : "✅ Yes"}</p>
		<p>Time taken: {viewport.durationMs.toFixed(0)}ms</p>
		<img src="data:image/png;base64,{viewport.screenshot}" alt="Screenshot" />
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
