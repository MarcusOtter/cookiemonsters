<script lang="ts">
	import type AnalysisResult from "$lib/AnalysisResult";

	let results: AnalysisResult[] = [];
	let isLoading = false;
	let url = "";

	async function analyze() {
		if (isLoading) return;

		isLoading = true;
		results = [];

		const urlSearchParams = new URLSearchParams({ url });
		const response = await fetch(`/api/analysis?${urlSearchParams}`, {
			method: "GET",
		});

		results = (await response.json()) as AnalysisResult[];
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

	{#if results.length > 0}
		<h2>Results</h2>
		{#each results as result}
			<img src="data:image/png;base64,{result.screenshotBase64}" alt="Screenshot" />
		{/each}
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
		background-color: hsl(217, 97%, 36%);
		border: none;
		color: white;
	}

	.inputs button:disabled {
		background-color: hsla(217, 97%, 70%, 0.2);
	}

	.inputs button:not(:disabled):hover {
		background-color: hsl(217, 97%, 46%);
		cursor: pointer;
	}

	h2 {
		margin-block-start: 48px;
	}
</style>
