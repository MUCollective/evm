<script lang="ts">
	import type { VisualizationSpec } from "vega-embed";
	import { VegaLite } from "svelte-vega";

	// from App.svelte
	export let data:any;
	export let vlSpec: VisualizationSpec;

	let dataset = { "table": data };
</script>

<!-- data panel -->
<div class="chart-panel card">
	<h3>Visualization Canvas</h3>
	<!-- ignore the below error, it's due to the wrongly declared type in VegaLite; it is also ignored in Svelte.Vega -->
	<VegaLite data={dataset} spec={vlSpec} />
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
	}

</style>
