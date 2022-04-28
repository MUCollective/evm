import App from './App.svelte';

const app = new App({
	target: document.body,
	props: {
		name: 'Exploratory Modeling',
		mounted: false,
		modeling: false,
		outcomeName: "outcome",
		flipDurationMs: 300,
		data: null,
		dataChanged: null,
		dataModelOutput: null,
		filters: [],
		transformations: [],
		models: [],
		dndState: [
			{
				id: "variables",
				name: "Cars",
				// name: "Forest fires",
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
			{
				id: "row-drop",
				name: "row",
				items: [],
			},
			{
				id: "col-drop",
				name: "col",
				items: [],
			},
		],
		originalDndState:[],
		
		vlSpec: {
			$schema: "https://vega.github.io/schema/vega-lite/v5.json",
			description: "A simple bar chart with embedded data.",
			data: {
				name: "table",
			},
			mark: "tick",
			encoding: {
				// x: { field: "", type: "nominal" },
				// y: { field: "", type: "quantitative", aggregate: "mean" },
			},
			transform :[]
		}
	}
});

export default app;