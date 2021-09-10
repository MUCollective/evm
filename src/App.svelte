<script>
	import Header from "./Header.svelte";
	import Chart from "./Chart.svelte";
	import { flip } from "svelte/animate";
	import { dndzone } from "svelte-dnd-action";
	import { Grid, Row, Column } from "carbon-components-svelte";
	import { onMount } from "svelte";
	import * as d3 from "d3";
import { filter } from "d3";

	// import * as cars from './data/cars.json'

	// $: cars && console.log(cars);

	let data = null,
		items = null,
		curDragIdx = null;


	// export let name = null;

	onMount(async () => {
		// load data
		data = await d3.json("./data/cars.json");
		console.log('loaded data', data);
		// populate dropzone items with variable names from data
		items = [];
		Object.keys(data[0]).forEach((d, i) => {
			items.push({ 
				id: i, // gets overwritten by drag consider
				idx: i, 
				name: d,
				shelf: 'variables' // start on variables shelf
			});
		});
		console.log('drop zone items', items);
	});

	// let items = [
	// 	{ id: 1, name: "item1" },
	// 	{ id: 2, name: "item2" },
	// 	{ id: 3, name: "item3" },
	// 	{ id: 4, name: "item4" },
	// ];
	const flipDurationMs = 300;
	function handleDndConsider(e) {
		// console.log(e);
		items = e.detail.items; // overwriting items here may lead to items getting dropped once they are no longer in the drag zone; the issue may actually be in the filtering of items below
		// get idx for dragged variable
		curDragIdx = e.detail.items.filter((d) => (d.hasOwnProperty('isDndShadowItem') && d.isDndShadowItem))[0].idx;
	}
	function handleDndFinalize(e) {
		console.log(e);
		items = e.detail.items;
		// reset shelf for current variable
		// TODO: get shelf name from event handler
		let cur = items.filter((d) => d.idx === curDragIdx);
		cur[0].shelf = 'x-drop'; // hardcoded for now
		console.log(cur);
	}
</script>

<main>
	<Header />
	<Grid fullWidth>
		<Row>
			<Column style="outline: 1px solid var(--cds-interactive-04)">
				Dataset variables (drag zone)
				{#if items}
					<section
						use:dndzone={{items: items.filter((d) => d.shelf === 'variables'), flipDurationMs }}
						on:consider={handleDndConsider}
						on:finalize={handleDndFinalize}
					>
						{#each items.filter((d) => d.shelf === 'variables') as item (item.id)}
							<div animate:flip={{ duration: flipDurationMs }}>
								{item.name}
							</div>
						{/each}
					</section>
				{/if}
			</Column>
			<!-- TODO: 
				* fix drop zone callbacks so that overwriting the variable in drop zone sends variable that was previously there back to the drag zone
				* add Vertical position encoding (drop zone) with it's own shelf property in items (i.e., use:dndzone={{items: items.filter((d) => d.shelf === 'y-drop'...))
				* format drop zones and draggable blocks like Polestar
				* link Chart to variables in drop zone
			-->
			<Column style="outline: 1px solid var(--cds-interactive-04)">
				Horizontal position encoding (drop zone)
				{#if items}
					<section
						use:dndzone={{ items: items.filter((d) => d.shelf === 'x-drop'), flipDurationMs }}
						on:consider={handleDndConsider}
						on:finalize={handleDndFinalize}
					>
						{#each items.filter((d) => d.shelf === 'x-drop') as item (item.id)}
							<div animate:flip={{ duration: flipDurationMs }}>
								{item.name}
							</div>
						{/each}
					</section>
				{/if}
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
