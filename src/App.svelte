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
			name: "x",
			items: [],
		},
		{
			id: "y-drop",
			name: "y",
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
		console.log("drop zone state (dndState)", dndState);
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

					<!-- data panel -->
					<div class="data-panel card">
						<Column
							style="outline: 1px solid var(--cds-interactive-04)"
						>
							<h3 style="color:white; ">Data</h3>
							<div class="dataset-name" style="color: white;">
								<!-- title: Dataset (drag zone) -->
								{dndState[0].name}
							</div>

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
					<!-- end of data panel -->

					<!-- encoding panel -->
					<div class="encoding card">
						<Column>
							<h3 style="color:#38425d; ">Encoding</h3>
							{#each dndState as shelf}
								{#if shelf.id !== "variables"}
									<div class="group">
										<div class="encoding-label">
											{shelf.name}
										</div>
										<div class="drop-field">
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
												{#if shelf.items.length == 0}
													<span class="placeholder">
														drop a field here
													</span>
												{/if}
												<!-- after dropped -->
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
										</div>
									</div>
								{/if}
							{/each}
							<div class="group">
								<div class="encoding-label">column</div>
								<!-- {console.log("items", dndState.items)} -->
								<div class="drop-field">
									{#each dndState as shelf}
										{#if shelf.id !== "variables"}
											<div class="group">
												<div class="drop-field">
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
														{#if shelf.items.length == 0}
															<span
																class="placeholder"
															>
																drop a field
																here
															</span>
														{/if}
														<!-- after dropped -->
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
												</div>
											</div>
										{/if}
									{/each}
								</div>
							</div>
							<h3 style="color:#38425d; ">Marks</h3>
							<div class="group">
								<div class="encoding-label">size</div>
								<div class="drop-field">
									<span class="placeholder">
										drop a field here
									</span>
								</div>
							</div>

							<div class="group">
								<div class="encoding-label">color</div>
								<div class="drop-field">
									<span class="placeholder">
										drop a field here
									</span>
								</div>
							</div>
							<div class="group">
								<div class="encoding-label">shape</div>
								<div class="drop-field">
									<span class="placeholder">
										drop a field here
									</span>
								</div>
							</div>
							<div class="group">
								<div class="encoding-label">detail</div>
								<div class="drop-field">
									<span class="placeholder">
										drop a field here
									</span>
								</div>
							</div>
							<div class="group">
								<div class="encoding-label">text</div>
								<div class="drop-field">
									<span class="placeholder">
										drop a field here
									</span>
								</div>
							</div>

							<h3 style="color:#38425d; ">Filter</h3>
						</Column>
					</div>
					<!-- end of encoding panel -->

					<!-- chart canvas -->
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
					<!-- end of chart canvas -->

					<!-- model panel -->
					<div class="model card">
						<Column
							style="outline: 1px solid var(--cds-interactive-04)"
						>
							<h3 style="color:#38425d; ">Model</h3>
							Show me a model
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
					<!-- end of model panel -->
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

	.encoding-label {
		border: 1px solid #ddd;
		border-radius: 3px;
		margin-bottom: 4px;
		font-size: 11px;
		background-color: rgba(55, 65, 92, 0.2);
		display: block;
		width: 45px;
		margin: 0 0.2rem;
		line-height: 22px;
		flex-shrink: 0;
		margin-right: 0px;
	}

	.group {
		border: 1px solid #ddd;
		border-radius: 3px;
		margin-bottom: 4px;
		font-size: 11px;
		background-color: rgba(55, 65, 92, 0.2);
		width: 100%;
		display: flex;
		height: 22px;
	}

	.placeholder {
		display: block;
		padding: 0 0.5em;
		background-color: white;
		border-radius: 3px;

		text-overflow: ellipsis;

		font-weight: normal;
		color: #aaa;
		/* width: 100%; */
		height: 100%;
	}

	.drop-field {
		width: 100%;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
