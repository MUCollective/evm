<script>
	import Header from "./Header.svelte";
	import Chart from "./Chart.svelte";
	import { flip } from "svelte/animate";
	import { dndzone } from "svelte-dnd-action";
	import { Grid, Row, Column } from "carbon-components-svelte";
	import { onMount } from "svelte";
	import * as d3 from "d3";

	// import * as cars from './data/cars.json'

	// $: cars && console.log(cars);

	let data = null;

	// export let name = null;

	onMount(async () => {
		console.log("loading data");
		data = await d3.json("./data/cars.json");
		console.log("loaded data");
		console.log(data);
		console.log("hello!!!!");
	});

	let items = [
		{ id: 1, name: "item1" },
		{ id: 2, name: "item2" },
		{ id: 3, name: "item3" },
		{ id: 4, name: "item4" },
	];
	const flipDurationMs = 300;
	function handleDndConsider(e) {
		items = e.detail.items;
	}
	function handleDndFinalize(e) {
		items = e.detail.items;
	}
</script>

<main>
	<Header />
	<Grid fullWidth>
		<Row>
			<Column style="outline: 1px solid var(--cds-interactive-04)">
				drag zone
				<section
					use:dndzone={{ items, flipDurationMs }}
					on:consider={handleDndConsider}
					on:finalize={handleDndFinalize}
				>
					{#each items as item (item.id)}
						<div animate:flip={{ duration: flipDurationMs }}>
							{item.name}
						</div>
					{/each}
				</section>
			</Column>
			<Column style="outline: 1px solid var(--cds-interactive-04)"
				>drop zone
				<section
					use:dndzone={{ items, flipDurationMs }}
					on:consider={handleDndConsider}
					on:finalize={handleDndFinalize}
				>
					{#each items as item (item.id)}
						<div animate:flip={{ duration: flipDurationMs }}>
							{item.name}
						</div>
					{/each}
				</section>
			</Column>

			<Column style="outline: 1px solid var(--cds-interactive-04)"
				>chart zone
				<!-- <section
					use:dndzone={{ items, flipDurationMs }}
					on:consider={handleDndConsider}
					on:finalize={handleDndFinalize}
				>
					{#each items as item (item.id)}
						<div animate:flip={{ duration: flipDurationMs }}>
							{item.name}
						</div>
					{/each}
				</section> -->
				<Chart />
				<!-- <p>{cars.mykey}</p> -->
			</Column>
		</Row>
	</Grid>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
