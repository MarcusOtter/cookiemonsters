<script lang="ts">
	import ResolutionPicker from "$lib/components/ResolutionPicker.svelte";
	import buildSearchParams from "$lib/utils/buildSearchParams";

	let url = "";

	type FormSubmitEvent = Event & { readonly submitter: HTMLElement | null } & {
		currentTarget: EventTarget & HTMLFormElement;
	};

	function goToBanner(e: FormSubmitEvent) {
		const data = new FormData(e.currentTarget);
		const params = buildSearchParams(data);

		// TODO: Validation on url?
		window.location.href = `/banner?` + params;
	}
</script>

<div class="box">
	<div class="left">
		<h1>Let's Analyze Your Cookie Banner's GDPR Compliance</h1>
		<p>The General Data Protection Regulation (GDPR) applies to all websites with users from the EU.</p>
		<p>
			CrumblyConsent automatically analyzes your website's cookie banner within minutes and helps you avoid the most
			common pitfalls with GDPR compliance.
		</p>
		<p>Learn more on our <a href="/about">about</a> page.</p>
	</div>

	<form on:submit|preventDefault={goToBanner} method="post">
		<label for="url">Web address (URL)</label>
		<div class="inputs">
			<input id="url" name="url" bind:value={url} placeholder="https://example.com" required size="22" />
			<ResolutionPicker />

			<button>Analyze</button>
		</div>
	</form>
</div>

<style>
	.box {
		display: flex;
		gap: 64px;
		margin: auto;
	}

	.box > * {
		width: 50%;
	}

	h1 {
		font-size: 2.5rem;
	}

	p {
		margin-block-start: 16px;
	}

	.left p {
		font-size: 1.35rem;
		font-weight: 400;
		margin-block-start: 1.5em;
	}

	a:hover {
		text-decoration: none;
	}

	form {
		border-radius: 16px;
		padding: 32px 64px;
		background: linear-gradient(180deg, hsl(231, 9%, 15%), hsl(228, 10%, 10%)) 0% 0% no-repeat padding-box;
		text-align: center;
		border: 2px solid hsla(0, 0%, 100%, 0.05);
	}

	label {
		display: block;
		font-size: 1.5rem;
		font-weight: bold;
	}

	.inputs {
		margin-top: 8px;
		display: flex;
		width: 100%;
		font-size: 1.25rem;
		flex-direction: column;
		align-items: center;
		gap: 48px;
	}

	.inputs input {
		padding: 12px;
		border: 2px solid hsl(217, 97%, 46%);
		border-radius: 16px;
		background-color: #17181c;
		color: white;
		text-align: center;
		font-size: 1.5rem;
	}

	.inputs button {
		padding: 16px 48px;
		border-radius: 16px;
		text-transform: uppercase;
		background-color: hsl(217, 97%, 36%);
		border: none;
		color: white;
		width: fit-content;
	}

	.inputs button:disabled {
		background-color: hsla(217, 97%, 70%, 0.2);
	}

	.inputs button:not(:disabled):hover {
		background-color: hsl(217, 97%, 46%);
		cursor: pointer;
	}

	@media (max-width: 1200px) {
		.box {
			flex-direction: column;
			max-width: 80ch;
		}

		.box > * {
			width: 100%;
		}

		form {
			background: transparent;
			border-color: transparent;
			padding: 0;
		}

		.inputs input {
			width: 100%;
		}

		.inputs button {
			width: 100%;
		}
	}
</style>
