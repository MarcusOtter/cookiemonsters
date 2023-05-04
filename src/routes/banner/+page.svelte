<script lang="ts">
	import { onMount } from "svelte";
	import getErrorMessage from "$lib/utils/getErrorMessage";
	import type BannerFindResponse from "$lib/contracts/BannerFindResponse";

	let result: BannerFindResponse;
	let isLoading = false;
	let params: URLSearchParams;
	let errorMessage = "";
	let selectedResultIndex = 0;

	onMount(async () => {
		params = new URLSearchParams(window.location.search);

		if (!params.get("url") || !params.get("width") || !params.get("height")) {
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

		const apiUrl = `/api/banner?` + params;
		const response = await fetch(apiUrl, { method: "GET" });
		if (!response.ok) {
			errorMessage = await response.text();
			isLoading = false;
			return;
		}

		result = (await response.json()) as BannerFindResponse;
		isLoading = false;
	}
</script>

<a href="/">Back to home</a>

{#if result}
	<h2>Screenshot {result.resolution}</h2>
	<p>Found banner: {result.selector === "" ? "❌ No" : "✅ Yes"}</p>
	<img src="data:image/png;base64,{result.screenshot}" alt="Screenshot" />
	{#if result.selector !== ""}
		Analyze button here
		<!-- <a href="/analysis?url={targetUrl}&selector={encodeURIComponent(viewport.selector)}">Analyze</a> -->
	{/if}
{:else if isLoading}
	<h1>Looking for cookie banners</h1>
	<h2>Loading...</h2>
{:else if errorMessage.length > 0}
	<h2>Error</h2>
	<p>{errorMessage}</p>
	Try again button here
	<!-- <a href="/analysis?url={targetUrl}">Try again</a> -->
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
		color: black;
	}
</style>
