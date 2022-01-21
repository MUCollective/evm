<script lang="ts">
	import type { VisualizationSpec, EmbedOptions } from "vega-embed";
	import { VegaLite } from "svelte-vega";

	// from App.svelte
	export let dataChanged: any;
	// export let dataTrans: any;
	export let vlSpec: VisualizationSpec;
	export let options: EmbedOptions = { renderer: "svg" };
	export let modeling: boolean;

	let dataset = { table: dataChanged };
	// let dataset = { table: dataTrans };
	let distinctModelGroups = uniqueModelcheckGroups(dataset.table);
	console.log("modelcheck groups in the chart data", distinctModelGroups);

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

	export let showPredictionOrResidual;

	// function onChange(event) {
	// 	showPredictionOrResidual = event.currentTarget.value;
	// 	console.log(showPredictionOrResidual);
	// }
	function uniqueModelcheckGroups(dataObj) {
		var lookup = {};
		var result = [];
		for (var item, i = 0; item = dataObj[i++];) {
			var name = item.modelcheck_group;

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
		<VegaLite bind:data={dataset} bind:spec={vlSpec} bind:options />
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
