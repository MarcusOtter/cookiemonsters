<script lang="ts">
	import spinner from "$lib/assets/spinner.svg";

	export let title: string;
	export let subtitle: string;
</script>

<h1>{title}</h1>
<span class="subtitle">{subtitle}</span>
<img class="spinner" src={spinner} alt="Loading..." />

<style>
	h1 {
		margin-block-start: 32px;
		font-size: 2.5rem;
	}

	.subtitle {
		font-size: 1.5rem;
	}

	.spinner {
		margin: 16px auto;
		width: 32px;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
