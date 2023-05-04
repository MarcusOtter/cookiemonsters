<script lang="ts">
	import { createEventDispatcher } from "svelte";

	export let id: string;
	export let leftLabel: string;
	export let rightLabel: string;
	export let round = true;

	let checked = false;
	const dispatch = createEventDispatcher();

	function onChange(x: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		checked = x.currentTarget.checked;
		dispatch("toggleChange", checked);
	}
</script>

<div>
	<label for={id}>{leftLabel}</label>
	<label for={id} class="switch">
		<!-- Mobile should not be hardcoded here but it is what it is -->
		<input
			type="checkbox"
			{id}
			name="isMobile"
			role="switch"
			aria-checked={checked}
			on:change|preventDefault={onChange}
		/>
		<span class="slider {round ? 'round' : ''}" />
	</label>
	<label for={id}>{rightLabel}</label>
</div>

<style>
	.switch {
		position: relative;
		display: inline-block;
		width: 80px;
		height: 34px;
	}

	.switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: transparent;
		border: 1px solid white;
	}

	.switch:focus-within .slider,
	.switch:hover .slider {
		outline: 1px solid white;
	}

	.slider:before {
		position: absolute;
		content: "";
		height: 26px;
		width: 26px;
		top: 3px;
		left: 4px;
		bottom: 4px;
		background-color: white;
		transition: 0.2s;
		transition-property: transform;
	}

	input:checked + .slider:before {
		transform: translateX(46px);
	}

	.slider.round {
		border-radius: 34px;
	}

	.slider.round:before {
		border-radius: 50%;
	}
</style>
