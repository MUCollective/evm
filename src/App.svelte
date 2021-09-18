<script>
	import Header from "./Header.svelte";
	import Chart from "./Chart.svelte";
	// import ChartVL from "./ChartVL.svelte";
	import { flip } from "svelte/animate";
	import { dndzone } from "svelte-dnd-action";
	import { Grid, Row, Column, Button } from "carbon-components-svelte";
	import { onMount } from "svelte";
	import * as d3 from "d3";

	let data = null,
		mounted = false,
		charting = false,
		modeling = false;

	// controls the rendering of drag and drop elements
	let dndState = [
		{
			id: "variables",
			name: "Dataset (drag zone)",
			items: [],
		},
		{
			id: "x-drop",
			name: "x-axis (drop zone)",
			items: [],
		},
		{
			id: "y-drop",
			name: "y-axis (drop zone)",
			items: [],
		},
	];

	onMount(async () => {
		// load data
		data = await d3.json("./data/cars.json");
		console.log("loaded data", data);
		// populate dropzone items with variable names from data
		Object.keys(data[0]).forEach((d, i) => {
			dndState[0].items.push({
				id: i, // gets overwritten by drag consider
				idx: i,
				name: d,
			});
		});
		console.log("drop zone state", dndState);
		mounted = true;
	});

	// helper functions for drag and drop
	const flipDurationMs = 300;
	function handleDndConsider(shelfId, e) {
		// console.log(e);
		const shelfIdx = dndState.findIndex((d) => d.id === shelfId);
		dndState[shelfIdx].items = e.detail.items;
		dndState = [...dndState];
	}
	function handleDndFinalize(shelfId, e) {
		// console.log(e);
		const shelfIdx = dndState.findIndex((d) => d.id === shelfId);
		dndState[shelfIdx].items = e.detail.items;
		dndState = [...dndState];
	}
	// helper functions for modeling
	function bootstrap(e) {
		console.log(e);
		modeling = true;
	}
	function model(e) {
		console.log(e);
		modeling = true;
	}
</script>

<main>
	<Header />

	<Grid fullWidth>
		<div class="content" style="text-align: left; ">
			{#if mounted}
				<Row>
					<!-- TODO:
						+ add Vertical position (drop zone) with it's own shelf id ('y-drop')
						+ create a json state that controls what renders on all of the shelves, keeping track of items across shelves
						+ programmatically generate drop zones from a json spec
						+ figure out why drop zones don't work, why trigger is always "droppedOutsideOfAny" 
						  (problem was that drop zones had no height; added css below to fix)
						- link Chart to variables in drop zone
						- format drop zones and draggable blocks similar to Polestar
						- use css to modify layout to roughly match Polestar, leaving room for the modeling sidebar on the right
					-->
					<div class="data-panel card">
						<Column
							style="outline: 1px solid var(--cds-interactive-04)"
						>
						<h3 style="color:white; ">Data</h3>
						<div class="dataset-name" style="color: white;">

							{dndState[0].name}
						</div>
							
							<br />
							<br />
							<section 
								use:dndzone={{
									items: dndState[0].items,
									flipDurationMs,
								}}
								on:consider={(e) =>
									handleDndConsider(dndState[0].id, e)}
								on:finalize={(e) =>
									handleDndFinalize(dndState[0].id, e)}
								id={dndState[0].id}
							>
								{#each dndState[0].items as item (item.id)}
									<div 
										animate:flip={{
											duration: flipDurationMs,
										}}
										style="background-color: rgba(237,237,237,.8); 
										margin-bottom:5px;
										border-radius: 3px;
										height: 20px;
										font: 14px;
										width: 180px;"
									>
										{item.name}
									</div>
								{/each}
							</section>
						</Column>
					</div>
					<div class="encoding card">
						<Column>
							<h3 style="color:#38425d; ">Encoding</h3>
							{#each dndState as shelf}
								{#if shelf.id !== "variables"}
									<Row
										style="padding: 0px 20px 20px 20px; height: 100px;"
									>
									
										<Column
											style="outline: 1px solid var(--cds-interactive-04);"
										>
											{shelf.name}
											<br />
											
											<br />
											<section
												use:dndzone={{
													items: shelf.items,
													flipDurationMs,
												}}
												on:consider={(e) =>
													handleDndConsider(
														shelf.id,
														e
													)}
												on:finalize={(e) =>
													handleDndFinalize(
														shelf.id,
														e
													)}
												id={shelf.id}
												style="height: 100%;"
											>
												{#each shelf.items as item (item.id)}
													<div
														animate:flip={{
															duration:
																flipDurationMs,
														}}
													>
														{item.name}
													</div>
												{/each}
											</section>
										</Column>
									</Row>
								{/if}
							{/each}
						</Column>
					</div>

					<Column style="outline: 1px solid var(--cds-interactive-04)"
						>Visualization canvas
						<br />
						<br />
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
						<!-- <ChartVL /> -->
						<!-- <p>{cars.mykey}</p> -->
					</Column>
					<div class="model card">
						<Column
							style="outline: 1px solid var(--cds-interactive-04)"
							>Show me a model
							<br />
							<br />
							<!-- Model bar goes here -->
							<Row
								style="padding: 0px 20px 20px 20px; height: 40px;"
							>
								<Column>
									<Button on:click={bootstrap}
										>What if this pattern was noise?</Button
									>
								</Column>
							</Row>
							<br />
							<br />
							<Row
								style="padding: 0px 20px 20px 20px; height: 40px;"
							>
								<Column>
									<Button on:click={model}
										>Create a model for the current chart.</Button
									>
								</Column>
							</Row>
							<!-- Other automated what ifs suggested below -->
						</Column>
					</div>
				</Row>
			{/if}
		</div>
	</Grid>
</main>

<style>
	/* @import "define"; */

	main {
		text-align: center;
		/* padding: 1em; */
		/* max-width: 240px; */
		margin: 0 auto;
		/* disable scrolling */
		overflow: hidden;
	}

	.content {
		padding-left: 0%;
		padding-right: 0%;
	}

	.data-panel {
		background-color: #38425d;
	}

	.encoding,
	.model {
		background-color: #e2e9f3;
	}

	.card {
		height: 100vh;
		display: block;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
