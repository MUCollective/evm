<script lang="ts">
	import { VisualizationSpec, EmbedOptions, vegaLite } from "vega-embed";
	// import { VegaLite } from "svelte-vega";
	import { Vega } from "svelte-vega";
	

	// from App.svelte
	export let dataChanged: any;
	// export let dataTrans: any;
	export let vlSpec: VisualizationSpec;
	export let options: EmbedOptions = { renderer: "svg" };
	export let modeling: boolean;
	export let showPredictionOrResidual;

	// process input data
	let dataset = { table: dataChanged };
	let distinctModelGroups = distinctValues(dataset.table, "modelcheck_group");
	const distinctDraws = distinctValues(dataset.table, "draw");
	console.log("modelcheck groups in the chart data", distinctModelGroups);

	// color for modelcheck
	// add "data" if needed
	if (!distinctModelGroups.includes("data")) {
		distinctModelGroups.unshift("data");
	}
	// make sure color exists
	vlSpec.encoding.color = vlSpec.encoding.color
		? vlSpec.encoding.color
		: { field: null, type: "nominal" };
	// make sure scale exists with field domain
	vlSpec.encoding.color.scale = vlSpec.encoding.color.scale 
		? vlSpec.encoding.color.scale 
		: { domain: null };
	vlSpec.encoding.color.scale.domain = distinctModelGroups;

	console.log(vlSpec);

	// convert vega-lite spec to vega to add HOPs?
	let vgSpec = vegaLite.compile(vlSpec).spec; 
	if (modeling) {
		// make sure signals exist
		vgSpec.signals = vgSpec.signals
			? vgSpec.signals
			: [];
		// add sample parameter for hops
		vgSpec.signals = [
			{
				"name": "sample", "value": 1,
				"on": [
						{
							"events": "timer{2000}",
							"update": "1 + ((sample + 1) % 5)"
						}
				]
			}
		];

		// make sure transform exists
		vgSpec.data[0].transform = vgSpec.data[0].transform
			? vgSpec.data[0].transform
			: [];
		// add filtering transform for hops
		vgSpec.data[0].transform = [
			{
				"type": "filter", 
				"expr": "datum.draw == sample"
			}
		];
	}

	console.log(vgSpec);

	// function onChange(event) {
	// 	showPredictionOrResidual = event.currentTarget.value;
	// 	console.log(showPredictionOrResidual);
	// }
	function distinctValues(dataObj, key) {
		var lookup = {};
		var result = [];
		for (var item, i = 0; item = dataObj[i++];) {
			var name = "" + item[key]; // cast as string

			if (!(name in lookup)) {
				lookup[name] = 1;
				result.push(name);
			}
		}
		return result;
	}
</script>

<!-- data panel -->
<div class="chart-panel card" id="chart">
	<h3>Visualization Canvas</h3>
	<div id="container">
		<Vega bind:data={dataset} bind:spec={vgSpec} bind:options />
		<!-- <VegaLite bind:data={dataset} bind:spec={vlSpec} bind:options /> -->
	</div>
</div>

<style>
	/* @import "define"; */
	h3 {
		margin-top: 0;
	}

	.card {
		display: block;
		border-radius: 0.5rem;
		padding: 0.5rem;
		margin-left: 0.5rem;
		margin-right: 0.5rem;
		max-height: 70vh;
		overflow-y: scroll;
		max-width: 40vw;
		overflow-x: scroll;
	}

	#container {
		width: 100%;
		height: 100%;
	}
</style>
