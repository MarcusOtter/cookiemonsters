<script lang="ts">
	export let showLabel = "Show more";
	export let hideLabel = "Hide";
	export let iconSrc = "";

	let expanded = false;
</script>

<div class="show-more">
	<button type="button" aria-expanded={expanded} on:click={() => (expanded = !expanded)}>
		{#if iconSrc && !expanded}
			<img src={iconSrc} alt="" />
		{/if}
		<span>
			{expanded ? hideLabel : showLabel}
		</span>
	</button>

	<div class="content" hidden={!expanded}>
		<slot />
	</div>
</div>

<style>
	.show-more {
		margin-top: 8px;
	}

	button {
		border: none;
		background-color: transparent;
		font-family: inherit;
		font-size: 1rem;
		padding: 0;
		color: inherit;
		display: flex;
		justify-content: center;
		align-items: center;
		margin: auto;
	}

	button:hover {
		text-decoration: underline;
		cursor: pointer;
	}

	img {
		margin-bottom: -0.125em;
		width: 1em;
		height: 1em;
		margin-right: 0.5em;
	}

	.content {
		margin-top: 0.5em;
	}
</style>
