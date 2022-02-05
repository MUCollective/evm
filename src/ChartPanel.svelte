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
	let outcomeName; 

	// color and offset for modelcheck
	if (modeling && haveModelToShow) {
		// add "data" if needed (to maintain consistent colors for model predictions vs residuals)
		if (!distinctModelGroups.includes("data")) {
			distinctModelGroups.unshift("data");
		}

		// get outcome name
		outcomeName = distinctModelGroups[1].substring(
			distinctModelGroups[1].indexOf("|") + 1, 
			distinctModelGroups[1].indexOf("~")
		);
		outcomeName = outcomeName.trim();
		console.log("outcome", outcomeName);

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
		console.log("hardcoded domain to prevent rescaling with hops", minX, minY, maxX, maxY);
		// vlSpec.encoding.<x or y>.scale.range = [<min of outcome>, <max of outcome>]
		if (typeof vlSpec.encoding.x != "undefined") {
			vlSpec.encoding.x.scale = vlSpec.encoding.x.scale
				? vlSpec.encoding.x.scale
				: { domain: null };
			vlSpec.encoding.x.scale.domain = [minX, maxX];
		}
		if (typeof vlSpec.encoding.y != "undefined") {
			vlSpec.encoding.y.scale = vlSpec.encoding.y.scale
				? vlSpec.encoding.y.scale
				: { domain: null };
			vlSpec.encoding.y.scale.domain = [minY, maxY];
		}

		vlSpec = { ...vlSpec };
	}

	console.log("vega-lite spec", vlSpec);

	// convert vega-lite spec to vega to add modelchecks
	// console.log("vegaLite.compile(vlSpec)", vegaLite.compile(vlSpec));
	let vgSpec = vegaLite.compile(vlSpec).spec;
	console.log("vgSpec before changes", vgSpec);
	if (modeling && haveModelToShow) {
		// hops:
		// make sure signals exist
		vgSpec.signals = vgSpec.signals ? vgSpec.signals : [];
		// make sure transform exists
		vgSpec.data[0].transform = vgSpec.data[0].transform ? vgSpec.data[0].transform : [];
		// add sample parameter for hops
		vgSpec.signals.push({
			name: "sample",
			value: 1,
			on: [
				{
					events: "timer{1500}",
					update: "1 + ((sample + 1) % 5)",
				},
			],
		});
		// add filtering transform for hops
		vgSpec.data[0].transform.push({
			type: "filter",
			expr: "datum.draw == sample",
		});

		// faceting:
		// make sure scales exists
		vgSpec.scales = vgSpec.scales ? vgSpec.scales : [];
		// make sure axes exists
		vgSpec.axes = vgSpec.axes ? vgSpec.axes : [];
		// make sure marks exists
		vgSpec.marks = vgSpec.marks ? vgSpec.marks : [];
		// add band scale to position different modelcheck groups, and re-encode data within groups 
		if (vlSpec.encoding.x.field == outcomeName) {
			console.log("re-encoding y axis")
			// add yscale if the outcome var is x
			vgSpec.scales.push({
				name: "yscale",
				type: "band",
				domain: {"data": "table", "field": "modelcheck_group"},
				range: "height",
				padding: 0.2
			});
			// we'll neew to replace original x and y scales inside of marks to get nested axes)
			let originalScales = vgSpec.scales.filter((elem) => elem.name == "x" || elem.name == "y" );
			originalScales[originalScales.findIndex((elem) => elem.name == "y")].range = { signal: "bandHeight" }; // make height respond to signal
			// remove original y scale
			vgSpec.scales = vgSpec.scales.filter((elem) => !(elem.name == "y") );
			// add axis for modelcheck group
			vgSpec.axes.push({
				orient: "left", 
				scale: "yscale", 
				tickSize: 0, 
				labelPadding: 4, 
				zindex: 1
			});
			// remove original y axis and x grid (we re-add them back inside of marks to get nested axes)
			let originalAxis = vgSpec.axes.filter((elem) => elem.scale == "y" || (elem.scale == "x" && elem.grid) );
			vgSpec.axes = vgSpec.axes.filter((elem) => !(elem.scale == "y" || (elem.scale == "x" && elem.grid)) );
			// re-encode data within facets...
			// borrow encoding info from initial spec
			let originalEncoding = vgSpec.marks[0].encode.update;
			// overwrite marks for not to avoid conflicts with compiled spec
			vgSpec.marks = [ 
				{
					// group by modelcheck group to create data sources for each subplot
					type: "group",
					from: {
						facet: {
							data: "data_0",
							name: "facet",
							groupby: "modelcheck_group" // do this!
						}
					},
					// put modelcheck check group on the main axis
					encode: {
						enter: {
							y: { scale: "yscale", field: "modelcheck_group" } 
						}
					},
					// adjust the extent of the subplot area based on the band type scale created above
					signals: [
						{ name: "bandHeight", update: "bandwidth('yscale')" }
					],
					// re-encode whatever was on the original axis within each facet
					scales: originalScales,
					// re-construct marks
					marks: [
						{
							name: "marks",
							from: { data: "facet" },
							type: vlSpec.mark.type, // may need to redo orient
							encode: { update: originalEncoding },
							axes: originalAxis
						}
					]
				}
			];
		} else if (vlSpec.encoding.y.field == outcomeName) {
			console.log("re-encoding x axis")
			// add xscale if the outcome var is y
			vgSpec.scales.push({
				name: "xscale",
				type: "band",
				domain: {"data": "table", "field": "modelcheck_group"},
				range: "width",
				padding: 0.2
			});
			// we'll neew to replace original x and y scales inside of marks to get nested axes)
			let originalScales = vgSpec.scales.filter((elem) => elem.name == "x" || elem.name == "y" );
			originalScales[originalScales.findIndex((elem) => elem.name == "x")].range = { signal: "bandWidth" }; // make width respond to signal
			// remove original x scale
			vgSpec.scales = vgSpec.scales.filter((elem) => !(elem.name == "x") );
			// add axis for modelcheck group
			vgSpec.axes.push({
				orient: "bottom", 
				scale: "xscale", 
				tickSize: 0, 
				labelPadding: 4, 
				zindex: 1
			});
			// remove original x axis and y grid (we re-add them back inside of marks to get nested axes)
			let originalAxis = vgSpec.axes.filter((elem) => elem.scale == "x" || (elem.scale == "y" && elem.grid) );
			vgSpec.axes = vgSpec.axes.filter((elem) => !(elem.scale == "x" || (elem.scale == "y" && elem.grid)) );
			// re-encode data within facets...
			// borrow encoding info from initial spec
			let originalEncoding = vgSpec.marks[0].encode.update;
			// overwrite marks for not to avoid conflicts with compiled spec
			vgSpec.marks = [ 
				{
					// group by modelcheck group to create data sources for each subplot
					type: "group",
					from: {
						facet: {
							data: "data_0",
							name: "facet",
							groupby: "modelcheck_group" // do this!
						}
					},
					// put modelcheck check group on the main axis
					encode: {
						enter: {
							x: { scale: "xscale", field: "modelcheck_group" } 
						}
					},
					// adjust the extent of the subplot area based on the band type scale created above
					signals: [
						{ name: "bandWidth", update: "bandwidth('xscale')" }
					],
					// re-encode whatever was on the original axis within each facet
					scales: originalScales,
					// re-construct marks
					marks: [
						{
							name: "marks",
							from: { data: "facet" },
							type: vlSpec.mark.type, // may need to redo orient
							encode: { update: originalEncoding },
							axes: originalAxis
						}
					]
				}
			];
		}

		// console.log("vgSpec.data", vgSpec.data);
		console.log("vgSpec after changes", vgSpec);
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
