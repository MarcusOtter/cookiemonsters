<script lang="ts">
	import { onMount } from "svelte";
	import getErrorMessage from "$lib/utils/getErrorMessage";
	import type BannerFindResponse from "$lib/contracts/BannerFindResponse";
	import spinner from "$lib/assets/spinner.svg";
	import buildSearchParams from "$lib/utils/buildSearchParams";
	import Loading from "$lib/components/Loading.svelte";

	let result: BannerFindResponse;
	let isLoading = false;
	let params: URLSearchParams;
	let errorMessage = "";

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

<div class="output">
	{#if result && result.selector}
		<h1>Cookie banner found</h1>
		<span class="subtitle">Does this look right?</span>
		<img src="data:image/png;base64,{result.screenshot}" alt="Screenshot" />
		<p>In the image above, only the cookie banner should be visible.</p>
		<p>
			If the image contains any other elements or only partially covers the cookie banner, please select "This does not
			look right".
		</p>
		<div class="btns">
			<a href="#">This does not look right (TODO)</a>
			<a
				class="primary"
				href="/analysis?{buildSearchParams({
					url: result.url,
					isMobile: result.isMobile,
					selector: result.selector,
					width: result.width,
					height: result.height,
				})}">Looks correct</a
			>
		</div>
	{:else if result}
		<h1>Could not find cookie banner</h1>
		<span class="subtitle">Does this image contain a cookie banner?</span>
		<img src="data:image/png;base64,{result.screenshot}" alt="Screenshot" />
		<p>
			Our banner finder has failed to find a cookie banner on <a href={result.url}>{result.url}</a>. Either there is no
			cookie banner on the website, or we could not find it for some reason.
		</p>
		<p>If there is a cookie banner in this image, proceed with manually configuration.</p>

		<div class="btns">
			<a href="/">Start over</a>
			<a class="primary" href="#">Manual configuration (TODO)</a>
		</div>
	{:else if isLoading}
		<Loading title="Looking for a cookie banner" subtitle="This will take a few seconds" />
	{:else if errorMessage.length > 0}
		<h1>Something went wrong</h1>
		<p>{errorMessage}</p>
		<p>Try again button here later :)</p>
		<!-- <a href="/analysis?url={targetUrl}">Try again</a> -->
	{/if}
</div>

<style>
	h1 {
		margin-block-start: 32px;
		font-size: 2.5rem;
	}

	.subtitle {
		font-size: 1.5rem;
	}

	p {
		margin-block-start: 1em;
	}

	.output {
		text-align: center;
		display: flex;
		align-items: center;
		flex-direction: column;
		font-size: 1.5rem;
	}

	.btns {
		margin-top: 32px;
		display: flex;
		gap: 16px;
	}

	.btns a {
		padding: 20px 40px;
		background-color: hsl(221, 24%, 38%);
		border-radius: 26px;
		text-decoration: none;
		display: inline;
	}

	.btns a.primary {
		background-color: hsl(221, 71%, 40%);
	}

	.btns a:hover {
		filter: brightness(120%);
	}

	.output img {
		margin: 36px 0;
	}
</style>
