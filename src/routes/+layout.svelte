<script>
	import TopBar from "$lib/components/TopBar.svelte";
	import "../app.css";
</script>

<TopBar />

<main>
	<slot />
</main>

<style>
	main {
		margin-inline: auto;
		padding: 2ch;
		max-width: 80ch;
	}
</style>
