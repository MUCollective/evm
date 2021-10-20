<script lang="ts">
	// from libraries
	import { Grid, Row, Column } from "carbon-components-svelte";
	import { onMount } from "svelte";
	import * as d3 from "d3";
	import type { VisualizationSpec } from "vega-embed";

	export let counter: number = 0;

	// app components
	import Header from "./Header.svelte";
	import DataPanel from "./DataPanel.svelte";
	import ChartPanel from "./ChartPanel.svelte";
	import EncodingPanel from "./EncodingPanel.svelte";
	import ModelPanel from "./ModelPanel.svelte";

	import { writable, get } from "svelte/store";

	// props
	export let name: string;
	export let mounted: boolean;
	export let charting: boolean; // not used?
	export let modeling: boolean;

	// export const chartX = writable("origin");
	// props for Vega-Lite
	// data should be a {}[] format (pure dataset), this will be wrapped by {"table": data} in the ChartPanel component.
	export let data: any;
	export let vlSpec: VisualizationSpec;
	// should be a valid vega-lite spec
	// if you update "data", then the data set for the visualization is updated.
	// if you update "vlSpec", then the Vega-Lite spec is updated.
	// if you want multiple vega-lite visualizations, then make it into an array,
	// then duplicate "VegaLite" panel with the "vlSpec" argument changed.

	export const visUpdate = writable(vlSpec);

	// controls the rendering of drag and drop elements
	export let dndState: { id: string; name: string; items: any[] }[];
	export let flipDurationMs: number;
	// export let xEncoding: {field: string; type:string};
	// export let yEncoding: {field: string; type:string, aggregate:string};

	$: specChanged = false;
	let prevSpec: VisualizationSpec = vlSpec;
	// $: prevSpec = {};
	console.log("PREV prevSpec", prevSpec);

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
		// console.log("drop zone state (dndState)", dndState);
		mounted = true;
	});

	$: {
		
	}

	// helper functions for drag and drop
	// passed to sub-components
	function handleDndConsider(shelfId: any, e: any) {
		// console.log(e);
		const shelfIdx = dndState.findIndex((d) => d.id === shelfId);
		// console.log("让我看看什么修改之前的dndState[shelfIdx].items", dndState[shelfIdx].items);
		dndState[shelfIdx].items = e.detail.items;
		dndState = [...dndState];
	}
	function handleDndFinalize(shelfId: any, e: any) {
		// console.log(e);
		const shelfIdx = dndState.findIndex((d) => d.id === shelfId);
		// console.log("dndState[shelfIdx]是啥", dndState[shelfIdx])
		dndState[shelfIdx].items = e.detail.items;
		dndState = [...dndState];
		// console.log("唉 怎么回事", dndState);
		// console.log("让我看看什么是e", e);
	}
	// helper functions for modeling
	function bootstrap(e: any) {
		console.log(e);
		modeling = true;
	}
	function model(e: any) {
		console.log(e);
		modeling = true;
	}

	// console.log('checking vlspec', vlSpec);
	// vlSpec.description = "hello";
	// console.log(vlSpec.mark);
	// console.log(vlSpec.encoding.x);

	function handleVlSpecConsider(shelfid: any, e: any) {
		console.log("CHECK POINT: ",vlSpec);
		prevSpec = vlSpec;
		// const shelfIdx = dndState.findIndex((d) => d.id === shelfid);
		// const test = vlSpec[encoding].
		// console.log("抄alex的shelfIdx", shelfIdx);
		// console.log("为啥e是空的啊 ",e);
		// console.log("救命 e.detail.items.name is", e.detail.items[0].name);
		if (shelfid == "x-drop" && e.detail.items.length != 0) {
			// console.log("怎么回事啊vlSpec.encoding", vlSpec.encoding);
			// console.log('what should be changed', vlSpec.encoding["x"]);

			vlSpec.encoding.x.field = e.detail.items[0].name;
		}
		if (shelfid == "y-drop" && e.detail.items.length != 0) {
			// console.log("怎么回事啊vlSpec.encoding", vlSpec.encoding);
			// console.log('what should be changed', vlSpec.encoding["y"]);

			vlSpec.encoding.y.field = e.detail.items[0].name;
		}
		vlSpec = { ...vlSpec };
		
		// console.log("check my function worked or not",vlSpec.encoding);
	}

	function handleVlSpecFinalize(shelfid: any, e: any) {
		if (shelfid == "x-drop" && e.detail.items.length != 0) {
			vlSpec.encoding.x.field = e.detail.items[0].name;
		}
		if (shelfid == "y-drop" && e.detail.items.length != 0) {
			vlSpec.encoding.y.field = e.detail.items[0].name;
		}
		vlSpec = { ...vlSpec };
		console.log("testing writable", $visUpdate);
		console.log("compare to vlSpec", vlSpec);
		// console.log("check type", typeof $visUpdate);
		// console.log("check type", typeof vlSpec);
		console.log("check my function worked or not", vlSpec.encoding);
		specChanged = true;
	}


</script>

<main>
	<Header {name} />
	{#if mounted}
		<Grid fullWidth>
			<Row style="display: flex; flex-wrap: nowrap;">
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
				<Column style="min-width: 220px; max-width: 220px;">
					<DataPanel
						{dndState}
						{flipDurationMs}
						{handleDndConsider}
						{handleDndFinalize}
					/>
				</Column>
				<Column style="min-width: 250px; max-width: 250px;">
					test test
					<EncodingPanel
						{dndState}
						{flipDurationMs}
						{handleDndConsider}
						{handleDndFinalize}
						{handleVlSpecConsider}
						{handleVlSpecFinalize}
					/>
					{console.log("just processed encoding panel!!!")}
					{console.log("check 唉", vlSpec)}
					<!-- {console.log("check 呜呜呜", $visUpdate)} -->
				</Column>
				<Column style="width: 100%;">
					<ChartPanel {data} {vlSpec} />
					after chart panel!!! change or not {specChanged}

					{#if vlSpec != prevSpec}
						vlSpec != prevSpec:
						<ChartPanel {data} {vlSpec} />
					{/if}
					{#if typeof prevSpec !== 'undefined'}
						prev: {prevSpec}
					{/if}

					vlSpec: {vlSpec.encoding.x.field}
				</Column>
				<Column style="min-width: 250px; max-width: 250px;">
					<ModelPanel {bootstrap} {model} />
				</Column>
			</Row>
		</Grid>
	{/if}
</main>

<style>
	/* @import "define"; */
	:global(body) {
		margin: 0;
		padding: 0;
	}
	main {
		text-align: left;
		/* padding: 1em; */
		/* max-width: 240px; */
		margin: 0 auto;
		/* disable scrolling */
		/* overflow: hidden; */
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
