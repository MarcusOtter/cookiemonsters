<script lang="ts">
	import { onMount } from "svelte";
	import getErrorMessage from "$lib/utils/getErrorMessage";
	import type BannerFindResponse from "$lib/contracts/BannerFindResponse";
	import buildSearchParams from "$lib/utils/buildSearchParams";
	import Loading from "$lib/components/Loading.svelte";

	let result: BannerFindResponse;
	let isLoading = false;
	let params: URLSearchParams;
	let errorMessage = "";
	let selectingManually = false;
	let manualSelector: string;

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

	function selectManually() {
		if (!manualSelector) return;
		window.location.href =
			"/analysis?" +
			buildSearchParams({
				url: result.url,
				isMobile: result.isMobile,
				selector: manualSelector,
				width: result.width,
				height: result.height,
			});
	}
</script>

<div class="output">
	{#if selectingManually}
		<h1>Help us find your cookie banner</h1>
		<span class="subtitle">This will only take a minute</span>
		<ol>
			<li><p>Open an incognito window in your browser</p></li>
			<li><p>Go to {params.get("url")}</p></li>
			<li><p>Open your browser's developer tools (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd>)</p></li>
			<li><p>Select the topmost element of the cookie banner. It should be highlighted in the developer tools.</p></li>
			<li><p>Right click on the highlighted element and select "Copy" &rarr; "Copy selector"</p></li>
			<li><p>Paste the selector below</p></li>
		</ol>
		<form>
			<input
				class="manual-selector"
				type="text"
				bind:value={manualSelector}
				placeholder="body > div.consent-bump-v2-lightbox > ytm-consent-bump-v2-renderer > div"
				required
			/>
			<button on:click|preventDefault={selectManually}>Submit</button>
		</form>
	{:else if result && result.selector}
		<h1>Cookie banner found</h1>
		<span class="subtitle">Does this look right?</span>
		<img src="data:image/png;base64,{result.screenshot}" alt="Screenshot" />
		<p>In the image above, only the cookie banner should be visible.</p>
		<p>
			If the image contains any other elements or only partially covers the cookie banner, please select "This does not
			look right".
		</p>
		<div class="btns">
			<a href="/" on:click|preventDefault={() => (selectingManually = true)}>This does not look right</a>
			<a
				class="primary"
				href="/analysis?{buildSearchParams({
					url: result.url,
					isMobile: result.isMobile,
					selector: manualSelector ?? result.selector,
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
			<a class="primary" href="/" on:click|preventDefault={() => (selectingManually = true)}>Manual configuration</a>
		</div>
	{:else if isLoading}
		<Loading title="Looking for a cookie banner" subtitle="This will take a few seconds" />
	{:else if errorMessage.length > 0}
		<h1>Something went wrong</h1>
		<p>{errorMessage}</p>
		<p>Try again button goes here eventually :)</p>
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

	ol {
		margin-block-start: 48px;
		padding: 0;
		text-align: left;
		max-width: 50ch;
	}

	input.manual-selector {
		margin-top: 32px;
		color: black;
	}

	input.manual-selector + button {
		margin-top: 16px;
		color: black;
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
