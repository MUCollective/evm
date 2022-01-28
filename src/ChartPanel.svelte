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
	export let models: any;
	export let showPredictionOrResidual;

	// process input data, looking for signs that we have a model to show
	let dataset = { table: dataChanged };
	let distinctModelGroups = distinctValues(dataset.table, "modelcheck_group");
	if (distinctModelGroups.includes("undefined")) {
		distinctModelGroups.pop(); // remove "undefined" if needed
	}
	let haveModelToShow = distinctModelGroups.some(
		(elem) => elem.startsWith("normal|") || elem.startsWith("res|")
	);
	console.log("modelcheck groups in the chart data", distinctModelGroups);
	console.log("model to show?", haveModelToShow);

	// color and offset for modelcheck
	if (modeling && haveModelToShow) {
		// add "data" if needed (to maintain consistent colors for model predictions vs residuals)
		if (!distinctModelGroups.includes("data")) {
			distinctModelGroups.unshift("data");
		}

		// make sure color exists and encode modelcheck_group
		vlSpec.encoding.color = vlSpec.encoding.color
			? vlSpec.encoding.color
			: { field: null, type: null };
		vlSpec.encoding.color.field = "modelcheck_group";
		vlSpec.encoding.color.type = "nominal";

		// make sure scale exists with field domain set to distinctModelGroups
		vlSpec.encoding.color.scale = vlSpec.encoding.color.scale
			? vlSpec.encoding.color.scale
			: { domain: null };
		vlSpec.encoding.color.scale.domain = distinctModelGroups;

		// assign offsets for nominal axes, but not for quant axes
		if (vlSpec.mark == "bar" || vlSpec.mark == "tick") {
			if (
				typeof vlSpec.encoding.x == "undefined" ||
				vlSpec.encoding.x.type == "nominal"
			) {
				vlSpec.encoding.xOffset = vlSpec.encoding.xOffset
					? vlSpec.encoding.xOffset
					: { field: null, type: null };
				vlSpec.encoding.xOffset.field = "modelcheck_group";
				vlSpec.encoding.xOffset.type = "nominal";
			} else if (
				typeof vlSpec.encoding.y == "undefined" ||
				vlSpec.encoding.y.type == "nominal"
			) {
				vlSpec.encoding.yOffset = vlSpec.encoding.yOffset
					? vlSpec.encoding.yOffset
					: { field: null, type: null };
				vlSpec.encoding.yOffset.field = "modelcheck_group";
				vlSpec.encoding.yOffset.type = "nominal";
			}
		}
		console.log("chartpanel dataset", dataset);
		console.log("models", models);
		// mpg ~ 1
		console.log(models[0].exp[0]);

		// vlSpec.encoding.<x or y>.scale.range = [<min of outcome>, <max of outcome>]

		console.log(Object.keys(dataset));
		console.log(dataset.table.length);
		// mpg = mpg
		// var v = vlSpec.encoding.x.field;
		// const mu_spec = models[0].exp[0];
		// console.log(mu_spec.substr(0, mu_spec.indexOf('~')));
		let minX = Infinity;
		let maxX = Number.NEGATIVE_INFINITY;
		let minY = Infinity;
		let maxY = Number.NEGATIVE_INFINITY;

		dataset.table.forEach((e) => {
			// console.log(e[vlSpec.encoding.x]);
			if (typeof vlSpec.encoding.x != "undefined") {
				if (e[vlSpec.encoding.x.field] < minX) {
					minX = e[vlSpec.encoding.x.field];
				}
				if (e[vlSpec.encoding.x.field] > maxX) {
					maxX = e[vlSpec.encoding.x.field];
				}
			}
			if (typeof vlSpec.encoding.y != "undefined") {
				if (e[vlSpec.encoding.y.field] < minY) {
					minY = e[vlSpec.encoding.y.field];
				}
				if (e[vlSpec.encoding.y.field] > maxY) {
					maxY = e[vlSpec.encoding.y.field];
				}
			}
		});
		console.log(minX, minY, maxX, maxY);
		// vlSpec.encoding.<x or y>.scale.range = [<min of outcome>, <max of outcome>]
		if (typeof vlSpec.encoding.x != "undefined") {
			vlSpec.encoding.x.scale = vlSpec.encoding.x.scale
				? vlSpec.encoding.x.scale
				: { domain: null};
			vlSpec.encoding.x.scale.domain = [minX, maxX];
		}
		if (typeof vlSpec.encoding.y != "undefined") {
			vlSpec.encoding.y.scale = vlSpec.encoding.y.scale
				? vlSpec.encoding.y.scale
				: { domain: null};
			vlSpec.encoding.y.scale.domain = [minY, maxY];
		}

		vlSpec = { ...vlSpec };
	}

	console.log("vega-lite spec", vlSpec);

	// convert vega-lite spec to vega to add HOPs?
	let vgSpec = vegaLite.compile(vlSpec).spec;
	console.log("vgSpec vegaLite.compile(vlSpec).spec");
	console.log(vgSpec);
	if (modeling && haveModelToShow) {
		// make sure signals exist
		vgSpec.signals = vgSpec.signals ? vgSpec.signals : [];
		// add sample parameter for hops
		vgSpec.signals.push({
			name: "sample",
			value: 1,
			on: [
				{
					events: "timer{2000}",
					update: "1 + ((sample + 1) % 5)",
				},
			],
		});
		console.log("vgSpec.signals", vgSpec.signals);
		// make sure transform exists
		vgSpec.data[0].transform = vgSpec.data[0].transform
			? vgSpec.data[0].transform
			: [];
		// add filtering transform for hops
		vgSpec.data[0].transform.push({
			type: "filter",
			expr: "datum.draw == sample",
		});

		// TODO: set axis limits to account for min and max across draws
	}

	// function onChange(event) {
	// 	showPredictionOrResidual = event.currentTarget.value;
	// 	console.log(showPredictionOrResidual);
	// }
	function distinctValues(dataObj, key) {
		var lookup = {};
		var result = [];
		for (var item, i = 0; (item = dataObj[i++]); ) {
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
