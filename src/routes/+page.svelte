<script lang="ts">
	let results: string[] = [];

	async function add() {
		results = [...results, "Loading..."];
		const response = await fetch("/api/analysis", {
			method: "GET",
		});

		const resultString = await response.text();
		results.pop();
		results = [...results, resultString];
	}
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>

<button on:click={add}>Get greeting</button>

<ul>
	{#each results as item}
		<li>{item}</li>
	{/each}
</ul>
