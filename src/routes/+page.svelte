<script lang="ts">
	import type AnalysisResult from "$lib/AnalysisResult";

	let result: AnalysisResult | undefined;
	let isLoading = false;
	let url = "";

	async function analyze() {
		if (isLoading) return;

		isLoading = true;
		result = undefined;

		const urlSearchParams = new URLSearchParams({ url });
		const response = await fetch(`/api/analysis?${urlSearchParams}`, {
			method: "GET",
		});

		result = (await response.json()) as AnalysisResult;
		isLoading = false;
	}
</script>

<main>
	<h1>Analyze your cookie banner GDPR compliance</h1>
	<p>
		Lorem ipsum dolor sit, amet consectetur adipisicing elit. Debitis eum sunt corporis dignissimos at aliquam autem
		excepturi velit recusandae nobis minima, facilis error dolorum aperiam enim ad ipsam voluptatum architecto ipsa
		delectus quo. Maiores saepe molestias fuga atque animi dolorum nostrum alias nobis
	</p>

	<form on:submit|preventDefault={analyze}>
		<label for="url">Web address</label>
		<div class="inputs">
			<input id="url" bind:value={url} placeholder="https://example.com" required />
			<button disabled={isLoading}>Analyze</button>
		</div>
	</form>

	{#if result}
		<h2>Results</h2>
		<img src="data:image/png;base64,{result.screenshotBase64}" alt="Screenshot" />
		<code>
			<pre>{result.headingStructure}</pre>
		</code>
	{:else if isLoading}
		<h2>Loading...</h2>
	{/if}
</main>

<style>
	h1 {
		margin-block-start: 32px;
		font-size: 3rem;
	}

	p {
		margin-block-start: 16px;
	}

	label {
		display: block;
		margin-block-start: 48px;
		text-transform: uppercase;
	}

	main {
		margin-inline: auto;
		padding: 2ch;
		max-width: 80ch;
	}

	.inputs {
		display: flex;
		width: 100%;
		font-size: 1.25rem;
	}

	.inputs input {
		flex: 1;
		padding: 8px 12px;
		border: none;
	}

	.inputs button {
		padding: 12px 24px;
		margin-inline-start: 8px;
		text-transform: uppercase;
		background-color: hsl(39, 97%, 14%);
		border: none;
		color: white;
	}

	.inputs button:hover {
		background-color: hsl(39, 97%, 18%);
		cursor: pointer;
	}

	h2 {
		margin-block-start: 48px;
	}
</style>
