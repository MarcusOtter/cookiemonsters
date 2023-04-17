<script lang="ts">
	let url = "";

	function goToAnalysis() {
		// TODO: Validation on url?
		window.location.href = `/analysis?` + new URLSearchParams({ url });
	}
</script>

<h1>Analyze your cookie banner GDPR compliance</h1>
<p>
	Lorem ipsum dolor sit, amet consectetur adipisicing elit. Debitis eum sunt corporis dignissimos at aliquam autem
	excepturi velit recusandae nobis minima, facilis error dolorum aperiam enim ad ipsam voluptatum architecto ipsa
	delectus quo. Maiores saepe molestias fuga atque animi dolorum nostrum alias nobis
</p>

<form on:submit|preventDefault={goToAnalysis}>
	<label for="url">Web address</label>
	<div class="inputs">
		<input id="url" bind:value={url} placeholder="https://example.com" required size="4" />
		<button>Analyze</button>
	</div>
</form>

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
</style>
