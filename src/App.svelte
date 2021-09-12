<script>
	import Header from "./Header.svelte";
	import Chart from "./Chart.svelte";
	import { flip } from "svelte/animate";
	import { dndzone } from "svelte-dnd-action";
	import { Grid, Row, Column } from "carbon-components-svelte";
	import { onMount } from "svelte";
	import * as d3 from "d3";


	let data = null,
		mounted = false;

	// controls the rendering of drag and drop elements
	let dndState = [
		{
			id: "variables",
			name: "Dataset variables (drag zone)",
			items: []
		},
		{
			id: "x-drop",
			name: "Horizontal position (drop zone)",
			items: []
		},
		{
			id: "y-drop",
			name: "Vertical position (drop zone)",
			items: []
		}
	];

	onMount(async () => {
		// load data
		data = await d3.json("./data/cars.json");
		console.log('loaded data', data);
		// populate dropzone items with variable names from data
		Object.keys(data[0]).forEach((d, i) => {
			dndState[0].items.push({ 
				id: i, // gets overwritten by drag consider
				idx: i, 
				name: d
			});
		});
		console.log('drop zone state', dndState);
		mounted = true;
	});

	const flipDurationMs = 300;
	function handleDndConsider(shelfId, e) {
		// console.log(e);
		const shelfIdx = dndState.findIndex(d => d.id === shelfId);
		dndState[shelfIdx].items = e.detail.items;
		dndState = [...dndState];
	}
	function handleDndFinalize(shelfId, e) {
		// console.log(e);
		const shelfIdx = dndState.findIndex(d => d.id === shelfId);
		dndState[shelfIdx].items = e.detail.items;
		dndState = [...dndState];
	}
</script>

<main>
	<Header />
	<Grid fullWidth>
		{#if mounted}
			<Row>
				<!-- TODO:
					+ add Vertical position (drop zone) with it's own shelf id ('y-drop')
					+ create a json state that controls what renders on all of the shelves, keeping track of items across shelves
					+ programmatically generate drop zones from a json spec
					+ figure out why drop zones don't work, why trigger is always "droppedOutsideOfAny" (problem was that drop zones had no height; added css below to fix)
					- link Chart to variables in drop zone
					- format drop zones and draggable blocks similar to Polestar
					- use css to modify layout to roughly match Polestar, leaving room for the modeling sidebar on the right
				-->
				<Column style="outline: 1px solid var(--cds-interactive-04)">
					{dndState[0].name}
					<section
						use:dndzone={{items: dndState[0].items, flipDurationMs }}
						on:consider={(e) => handleDndConsider(dndState[0].id, e)}
						on:finalize={(e) => handleDndFinalize(dndState[0].id, e)}
						id={dndState[0].id}
					>
						{#each dndState[0].items as item (item.id)}
							<div animate:flip={{ duration: flipDurationMs }}>
								{item.name}
							</div>
						{/each}
					</section>
				</Column>
				<Column>
					{#each dndState as shelf}
						{#if shelf.id !== 'variables'}
							<Row style="padding: 20px; height: 150px;">
								<Column style="outline: 1px solid var(--cds-interactive-04);">
									{shelf.name}
									<section
										use:dndzone={{ items: shelf.items, flipDurationMs }}
										on:consider={(e) => handleDndConsider(shelf.id, e)}
										on:finalize={(e) => handleDndFinalize(shelf.id, e)}
										id={shelf.id}
										style="height: 100%;"
									>
										{#each shelf.items as item (item.id)}
											<div animate:flip={{ duration: flipDurationMs }}>
												{item.name}
											</div>
										{/each}
									</section>
								</Column>
							</Row>
						{/if}
					{/each}
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
		{/if}
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
