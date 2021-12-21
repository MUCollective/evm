<script lang="ts">
	import type { VisualizationSpec, EmbedOptions } from "vega-embed";
	import { VegaLite } from "svelte-vega";
	import { chartX, chartY } from "./EncodingPanel.svelte";
	import { get } from "svelte/store";
	import * as VegaEmbed from 'vega-embed';

	// from App.svelte
	export let dataChanged: any;
	// export let dataTrans: any;
	export let vlSpec: VisualizationSpec;
	export let options:EmbedOptions = {"renderer": "svg"};

	let dataset = { table: dataChanged };
	// let dataset = { table: dataTrans };



</script>

<!-- data panel -->
<div class="chart-panel card" id="chart">
	<h3>Visualization Canvas</h3>
	<!-- <VegaEmbed {vlSpec} {dataset} /> -->
	<!-- ignore the below error, it's due to the wrongly declared type in VegaLite; it is also ignored in Svelte.Vega -->
	<div id="container">

		<VegaLite bind:data={dataset} bind:spec={vlSpec} bind:options={options}/>
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
