import App from './App.svelte';

const app = new App({
	target: document.body,
	props: {
		name: 'Exploratory Modeling',
		mounted: false,
		charting: false,
		modeling: false,
		flipDurationMs: 300,
		data: null,
		dndState: [
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
		vlSpec: {
			$schema: "https://vega.github.io/schema/vega-lite/v5.json",
			description: "A simple bar chart with embedded data.",
			data: {
				name: "table",
			},
			mark: "bar",
			encoding: {
				// x: { field: "", type: "nominal" },
				// y: { field: "", type: "quantitative", aggregate: "mean" },
			},
		}
	}
});

export default app;