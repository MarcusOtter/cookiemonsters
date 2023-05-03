<script lang="ts">
	import ShowMore from "./ShowMore.svelte";
	import Toggle from "./Toggle.svelte";

	import gear from "$lib/assets/gear.svg";

	let isMobile = false;

	function onToggleChanged(event: CustomEvent<boolean>) {
		isMobile = event.detail;
	}
</script>

<div>
	<Toggle id="resolutionToggle" leftLabel="Desktop" rightLabel="Mobile" on:toggleChange={onToggleChanged} />
	<ShowMore iconSrc={gear} showLabel="Custom resolution" hideLabel="Hide">
		<input name="width" type="number" size="4" value={isMobile ? "360" : "1920"} max="9999" min="1" required /><span
			>x</span
		><input name="height" type="number" size="4" value={isMobile ? "640" : "1080"} max="9999" min="1" required />
	</ShowMore>
</div>

<style>
	div {
		width: fit-content;
	}

	input {
		background-color: hsl(228, 10%, 10%);
		padding: 8px 12px 8px 8px;
		border: 1px solid white;
		font-size: 1.25rem;
		border-radius: 12px;
		text-align: center;
		margin: 0 8px;
		width: fit-content;
	}
</style>
