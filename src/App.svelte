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
	import { isXorY } from "vega-lite/build/src/channel";

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
	// export let facet: any;
	// should be a valid vega-lite spec
	// if you update "data", then the data set for the visualization is updated.
	// if you update "vlSpec", then the Vega-Lite spec is updated.
	// if you want multiple vega-lite visualizations, then make it into an array,
	// then duplicate "VegaLite" panel with the "vlSpec" argument changed.

	export const visUpdate = writable(vlSpec);

	// controls the rendering of drag and drop elements
	export let dndState: { id: string; name: string; items: any[] }[];
	export let flipDurationMs: number;

	$: specChanged = 0;
	let prevSpec: VisualizationSpec = vlSpec;
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
		mounted = true;
	});
	// helper functions for drag and drop
	// passed to sub-components
	function handleDndConsider(shelfId: any, e: any) {
		const shelfIdx = dndState.findIndex((d) => d.id === shelfId);
		dndState[shelfIdx].items = e.detail.items;
	}
	function handleDndFinalize(shelfId: any, e: any) {
		if (e.srcElement.id != "variables") {
			const shelfIdx = dndState.findIndex((d) => d.id === shelfId);
			// 1 if x-row
			console.log("current", dndState[shelfIdx].items[dndState[shelfIdx].items.length - 1].name);
			// {id: 'x-drop', name: 'x', items: Array(1)}
			// id: "x-drop"
			// items: Array(1)
			// 0: {id: 0, idx: 0, name: 'name'}
			// current {id: 'x-drop', name: 'x', items: Array(2)}
			var varName = e.detail.items[0].name;
			console.log("compare", varName);
			if (dndState[shelfIdx].items[dndState[shelfIdx].items.length - 1].name != varName) {
				console.log("HERE !!!!!!!!!!!");
				console.log(dndState);
				encodingToData(
					dndState[shelfIdx].name,
					shelfId,
					dndState[shelfIdx].items
				);
				console.log("what about now !!!!!!!!!!!");
				console.log(dndState);
			}

			dndState[shelfIdx].items = e.detail.items;
			dndState = [...dndState];
			prevSpec = deepCopy(vlSpec);
			if (e.detail.items.length != 0) {
				var varSample = data[0][varName];
				console.log("varSample", varSample);
				console.log(data[0]);
				console.log(varName, data[0][varName]);
				var varType;
				if (typeof varSample == "number") {
					varType = "quantitative";
				} else if (typeof varSample == "string") {
					varType = "nominal";
				}
				const tempEncoding = {
					field: e.detail.items[0].name,
					type: varType,
				};
				if (varType == "nominal") {
					tempEncoding.aggregate = "count";
					vlSpec.mark = "bar";
				}
				console.log(tempEncoding);
				if (shelfId == "x-drop") {
					vlSpec.encoding.x = tempEncoding;
				}
				if (shelfId == "y-drop" && e.detail.items.length != 0) {
					vlSpec.encoding.y = tempEncoding;
				}
				if (shelfId == "row-drop") {
					vlSpec.encoding.row = { field: e.detail.items[0].name };
					console.log("facet", vlSpec);
				}
				if (shelfId == "col-drop") {
					vlSpec.encoding.column = { field: e.detail.items[0].name };
					console.log("facet", vlSpec);
				}
			}
			// continuous x continuous scatter plot
			if (vlSpec.encoding.x && vlSpec.encoding.y) {
				if (
					vlSpec.encoding.x.type == vlSpec.encoding.y.type &&
					vlSpec.encoding.x.type == "quantitative"
				) {
					vlSpec.mark = "point";
				}
			}
			vlSpec = { ...vlSpec };
			specChanged++;
			console.log("vlspec:", vlSpec);
		}
	}

	function encodingToData(variable: any, shelfId: any, item: any) {
		console.log("NEW FUNCTION !!!!!!!!!");
		console.log("variable", variable, "shelfId", shelfId, "item", item);
		console.log("before any changes", vlSpec.encoding);
		console.log(typeof dndState[0]);

		console.log(item);
		const shelfIdx = dndState.findIndex((d) => d.id === shelfId);
		console.log("why doesn't it change", dndState[shelfIdx]);
		dndState[shelfIdx].items = [];
		console.log("?????", dndState[shelfIdx], "this should be empty", dndState[shelfIdx].items);
		console.log(dndState[0]);
		dndState[0].items.push(item[item.length-1]);
		console.log("now?????", dndState[shelfIdx]);
		console.log(dndState);
		dndState = [...dndState];
		if (shelfId == "x-drop" || shelfId == "y-drop") {
			if (shelfId == "x-drop") {
				delete vlSpec.encoding.x;
			} else {
				delete vlSpec.encoding.y;
			}
			vlSpec.mark = "tick";
		}
		if (shelfId == "row-drop") {
			delete vlSpec.encoding.row;
		}
		if (shelfId == "col-drop") {
			delete vlSpec.encoding.column;
		}

		vlSpec = { ...vlSpec };
		specChanged++;
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

	function deepCopy(inObject) {
		let outObject, value, key;

		if (typeof inObject !== "object" || inObject === null) {
			return inObject; // Return the value if inObject is not an object
		}

		// Create an array or object to hold the values
		outObject = Array.isArray(inObject) ? [] : {};

		for (key in inObject) {
			value = inObject[key];

			// Recursively (deep) copy for nested objects, including arrays
			outObject[key] = deepCopy(value);
		}

		return outObject;
	}

	// console.log(document.getElementsByClassName("vega-embed"));
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
					<EncodingPanel
						{dndState}
						{flipDurationMs}
						{handleDndConsider}
						{handleDndFinalize}
						{encodingToData}
					/>
				</Column>
				<Column style="width: 100%;">
					{#if Object.keys(vlSpec.encoding).length != 0}
						{#key specChanged}
							vlSpec has changed
							<ChartPanel bind:data bind:vlSpec />
						{/key}
					{/if}
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
