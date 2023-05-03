<script>
	import Footer from "$lib/components/Footer.svelte";
	import TopBar from "$lib/components/TopBar.svelte";

	// Global CSS is imported here
	import "../app.css";
</script>

<div class="container">
	<TopBar />

	<main>
		<slot />
	</main>

	<Footer />
</div>

<style>
	.container {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		margin-inline: auto;
		padding: 2ch;
		max-width: 130ch;
		flex-grow: 1;
		display: flex;
		flex-direction: column;
	}
</style>
