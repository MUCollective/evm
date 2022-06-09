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
	// export let showLoadingIcon: boolean;
	export let models: any;
	export let outcomeName: string;
	// export let showPredictionOrResidual;

	// get width and height of chart canvas
	let chartCanvas = document.getElementById("chart-canvas"),
		horzSpace = chartCanvas.offsetWidth,
		vertSpace = chartCanvas.offsetHeight;
	console.log("canvas", horzSpace, vertSpace);
	// set default size
	let defaultSize = 200,
		minSize = 50,
		interChartPad = 15,
		chartType = "scatterplot"; // default

	// process input data, looking for signs that we have a model to show
	let dataset = { table: dataChanged };
	let distinctModelGroups = distinctValues(dataset.table, "modelcheck_group");
	if (distinctModelGroups.includes("undefined")) {
		distinctModelGroups.pop(); // remove "undefined" if needed
	}
	let modelNameRegex = /^.+\|/,
		haveModelToShow = distinctModelGroups.some(
		// (elem) => elem.startsWith("normal|") || elem.startsWith("res|") // TODO: make this work for non-normal families
		elem => modelNameRegex.test(elem)
	);
	console.log("modelcheck groups in the chart data", distinctModelGroups);
	console.log("model to show?", haveModelToShow);
	let minX = Infinity,
		maxX = Number.NEGATIVE_INFINITY,
		minY = Infinity,
		maxY = Number.NEGATIVE_INFINITY;

	// color and facet for modelcheck
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

		// infer chart type
		// TODO: add contingenies for bar charts and heatmaps
		if (vlSpec.mark == "tick" || vlSpec.mark.type == "tick") {
			if (!vlSpec.encoding.x || vlSpec.encoding.x.type == "nominal" || vlSpec.encoding.x.type == "ordinal") {
				chartType = "stripx";
			} else if (!vlSpec.encoding.y || vlSpec.encoding.y.type == "nominal" || vlSpec.encoding.y.type == "ordinal") {
				chartType = "stripy";
			}
		}
		console.log("chart type", chartType);
		console.log("chartpanel dataset", dataset);
		console.log("models", models);

		// vlSpec.encoding.<x or y>.scale.range = [<min of outcome>, <max of outcome>]

		console.log(Object.keys(dataset));
		console.log(dataset.table.length);

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
		if (typeof vlSpec.encoding.x != "undefined" && vlSpec.encoding.x.type == "quantitative") {
			vlSpec.encoding.x.scale = vlSpec.encoding.x.scale
				? vlSpec.encoding.x.scale
				: { domain: null };
			vlSpec.encoding.x.scale.domain = [minX, maxX];
		}
		if (typeof vlSpec.encoding.y != "undefined" && vlSpec.encoding.y.type == "quantitative") {
			vlSpec.encoding.y.scale = vlSpec.encoding.y.scale
				? vlSpec.encoding.y.scale
				: { domain: null };
			vlSpec.encoding.y.scale.domain = [minY, maxY];
		}

		vlSpec = { ...vlSpec };
	}

	console.log("vega-lite spec", vlSpec);

	// convert vega-lite spec to vega to add modelchecks
	let vgSpec = vegaLite.compile(vlSpec).spec;
	console.log("compiled vega spec", vgSpec);
	if (modeling && haveModelToShow) {
		// // faceting for scatterplots
		// if (vlSpec.mark.type == "circle") {

		if (vlSpec.encoding.row && vlSpec.encoding.column) {
			// borrow encoding info from compiled spec
			let cellIdx = vgSpec.marks.findIndex((elem) => elem.name == "cell"),
				originalEncoding = vgSpec.marks[cellIdx].marks[0].encode.update;
			originalEncoding.shape = { signal: "shape" };
			// borrow scales from compiled spec, and modify them as needed
			let originalScales = vgSpec.scales.filter((elem) => (elem.name == "x" || elem.name == "y" || elem.name == "color")),
				xIdx = originalScales.findIndex((elem) => elem.name == "x"),
				yIdx = originalScales.findIndex((elem) => elem.name == "y");
			if (xIdx != -1) {
				originalScales[xIdx].range = [0, { signal: "child_width" }];
			}
			if (yIdx != -1) {
				originalScales[yIdx].range = [{ signal: "child_height" }, 0];
			}
			console.log("scales", originalScales);
			if (vlSpec.encoding.x && vlSpec.encoding.x.field == outcomeName) {
				// when outcome is on x, facet on y
				// fill in standardized template based on vlSpec
				vgSpec = {
					"$schema": "https://vega.github.io/schema/vega/v5.json",
					"background": "white",
					"padding": 5,
					"data": [
						{
							"name": "table",
							"transform": [
								{
									"type": "filter",
									"expr": "datum.draw == sample"
								}
							],
							"values": [] // will be filled by Svelte-Vega
						},
						{
							"name": "data_0",
							"source": "table",
							"transform": [
								{
								"type": "filter",
								"expr": `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"]) && isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
								}
							]
						},
						{
							"name": "column_domain",
							"source": "data_0",
							"transform": [{"type": "aggregate", "groupby": [vlSpec.encoding.column.field]}]
						},
						{
							"name": "row_domain",
							"source": "data_0",
							"transform": [{"type": "aggregate", "groupby": ["modelcheck_group", vlSpec.encoding.row.field]}]
						}
					],
					"signals": [
						{"name": "child_width", "update": `max(${minSize}, min((${horzSpace} - 40 - ${interChartPad} * length(data('column_domain'))) / length(data('column_domain')), ${defaultSize}))`},
						{"name": "child_height", "update": `max(${minSize}, min((${vertSpace} - 60 - ${interChartPad} * length(data('row_domain'))) / (length(data('row_domain')) + 2), ${defaultSize}))`},
						{
							"name": "sample",
							"value": 1,
							"on": [
								{
									"events": "timer{500}",
									"update": "((sample + 1) % 5) + 1"
								}
							]
						}
					],
					"layout": {
						"padding": interChartPad,
						"offset": {"rowTitle": 10, "columnTitle": 10},
						"columns": {"signal": "length(data('column_domain'))"},
						"bounds": "full",
						"align": "all"
					},
					"marks": [
						{
							"name": "row-title",
							"type": "group",
							"role": "row-title",
							"title": {
								"text": vlSpec.encoding.row.field,
								"orient": "left",
								"style": "guide-title",
								"offset": 10
							}
						},
						{
							"name": "column-title",
							"type": "group",
							"role": "column-title",
							"title": {
								"text": vlSpec.encoding.column.field,
								"orient": "left",
								"style": "guide-title",
								"offset": 10
							}
						},
						{
							"name": "row_header",
							"type": "group",
							"role": "row-header",
							"from": {"data": "row_domain"},
							"sort": {
								"field": ["datum[\"modelcheck_group\"]", `datum[\"${vlSpec.encoding.row.field}\"]`], 
								"order": ["ascending", "ascending"] 
							},
							"title": {
								"text": {
									"signal": `isValid(parent[\"${vlSpec.encoding.row.field}\"]) ? parent[\"${vlSpec.encoding.row.field}\"] : \"\"+parent[\"${vlSpec.encoding.row.field}\"]`
								},
								"orient": "left",
								"style": "guide-label",
								"frame": "group",
								"offset": 10
							},
							"encode": {"update": {"height": {"signal": "child_height"}}},
							"axes": [
								{
									"scale": "y",
									"orient": "left",
									"grid": false,
									"title": vlSpec.encoding.y.field,
									"labelOverlap": true,
									"tickCount": {"signal": "ceil(child_height / 30)"},
									"zindex": 0
								}
							]
						},
						{
							"name": "column_header",
							"type": "group",
							"role": "column-header",
							"from": {"data": "column_domain"},
							"sort": {"field": `datum[\"${vlSpec.encoding.column.field}\"]`, "order": "ascending"},
							"title": {
								"text": {
									"signal": `isValid(parent[\"${vlSpec.encoding.column.field}\"]) ? parent[\"${vlSpec.encoding.column.field}\"] : \"\"+parent[\"${vlSpec.encoding.column.field}\"]`
								},
								"style": "guide-label",
								"frame": "group",
								"offset": 10
							},
							"encode": {"update": {"width": {"signal": "child_width"}}}
						},
						{
							"name": "column_footer",
							"type": "group",
							"role": "column-footer",
							"from": {"data": "column_domain"},
							"sort": {"field": `datum[\"${vlSpec.encoding.column.field}\"]`, "order": "ascending"},
							"encode": {"update": {"width": {"signal": "child_width"}}},
							"axes": [
								{
									"scale": "x",
									"orient": "bottom",
									"grid": false,
									"title": vlSpec.encoding.x.field,
									"labelFlush": true,
									"labelOverlap": true,
									"tickCount": {"signal": "ceil(child_width / 30)"},
									"zindex": 0
								}
							]
						},
						{
							"name": "cell",
							"type": "group",
							"style": "cell",
							"from": {
								"facet": {
									"name": "facet",
									"data": "data_0",
									"groupby": ["modelcheck_group", vlSpec.encoding.row.field, vlSpec.encoding.column.field],
									"aggregate": {"cross": true}
								}
							},
							"sort": {
								"field": ["datum[\"modelcheck_group\"]", `datum[\"${vlSpec.encoding.row.field}\"]`, `datum[\"${vlSpec.encoding.column.field}\"]`],
								"order": ["ascending", "ascending", "ascending"]
							},
							"encode": {
								"update": {
									"width": {"signal": "child_width"},
									"height": {"signal": "child_height"}
								}
							},
							"signals": [
								{"name": "shape", "value": "circle"},
								{"name": chartType == "stripx" ? "x_step" : "y_step", "value": 20},
          						{"name": "width", "update": chartType == "stripx" ? "bandspace(domain('x').length, 1, 0.5) * x_step" : "bandspace(domain('y').length, 1, 0.5) * y_step"}
							],
							"marks": [
								{
									"name": "child_marks",
									"type": chartType == "scatterplot" ? "symbol" : "rect",
									"style": chartType == "scatterplot" ? ["circle"] : ["tick"],
									"from": {"data": "facet"},
									"encode": {
										"update": originalEncoding // plug in compiled encoding for primary axes
									}
								}
							],
							"axes": [
								{
									"scale": "x",
									"orient": "bottom",
									"gridScale": "y",
									"grid": true,
									"tickCount": {"signal": "ceil(child_width / 30)"},
									"domain": false,
									"labels": false,
									"aria": false,
									"maxExtent": 0,
									"minExtent": 0,
									"ticks": false,
									"zindex": 0
								},
								{
									"scale": "y",
									"orient": "left",
									"gridScale": "x",
									"grid": true,
									"tickCount": {"signal": "ceil(child_height / 30)"},
									"domain": false,
									"labels": false,
									"aria": false,
									"maxExtent": 0,
									"minExtent": 0,
									"ticks": false,
									"zindex": 0
								}
							]
						}
					],
					"scales": originalScales, // plug in original scales to keep vegaLite settings
					"legends": [
						{
							"stroke": "color",
							"symbolType": "circle",
							"title": "Model group",
							"encode": {
								"symbols": {
									"update": {
										"fill": {
											"value": "transparent"
										},
										"opacity": {
											"value": 0.7
										}
									}
								}
							}
						}
					]
				}
			} else {
				// else, facet on x
				// fill in standardized template based on vlSpec
				vgSpec = {
					"$schema": "https://vega.github.io/schema/vega/v5.json",
					"background": "white",
					"padding": 5,
					"data": [
						{
							"name": "table",
							"transform": [
								{
									"type": "filter",
									"expr": "datum.draw == sample"
								}
							],
							"values": [] // will be filled by Svelte-Vega
						},
						{
							"name": "data_0",
							"source": "table",
							"transform": [
								{
								"type": "filter",
								"expr": `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"]) && isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
								}
							]
						},
						{
							"name": "column_domain",
							"source": "data_0",
							"transform": [{"type": "aggregate", "groupby": ["modelcheck_group", vlSpec.encoding.column.field]}]
						},
						{
							"name": "row_domain",
							"source": "data_0",
							"transform": [{"type": "aggregate", "groupby": [vlSpec.encoding.row.field]}]
						}
					],
					"signals": [
						{"name": "child_width", "update": `max(${minSize}, min((${horzSpace} - 40 - ${interChartPad} * length(data('column_domain'))) / (length(data('column_domain')) + 2), ${defaultSize}))`},
						{"name": "child_height", "update": `max(${minSize}, min((${vertSpace} - 60 - ${interChartPad} * length(data('row_domain'))) / length(data('row_domain')), ${defaultSize}))`},
						{
							"name": "sample",
							"value": 1,
							"on": [
								{
									"events": "timer{500}",
									"update": "((sample + 1) % 5) + 1"
								}
							]
						}
					],
					"layout": {
						"padding": interChartPad,
						"offset": {"rowTitle": 10, "columnTitle": 10},
						"columns": {"signal": "length(data('column_domain'))"},
						"bounds": "full",
						"align": "all"
					},
					"marks": [
						{
							"name": "row-title",
							"type": "group",
							"role": "row-title",
							"title": {
								"text": vlSpec.encoding.row.field,
								"orient": "left",
								"style": "guide-title",
								"offset": 10
							}
						},
						{
							"name": "column-title",
							"type": "group",
							"role": "column-title",
							"title": {
								"text": vlSpec.encoding.column.field,
								"orient": "left",
								"style": "guide-title",
								"offset": 10
							}
						},
						{
							"name": "row_header",
							"type": "group",
							"role": "row-header",
							"from": {"data": "row_domain"},
							"sort": {"field": `datum[\"${vlSpec.encoding.row.field}\"]`, "order": "ascending"},
							"title": {
								"text": {
									"signal": `isValid(parent[\"${vlSpec.encoding.row.field}\"]) ? parent[\"${vlSpec.encoding.row.field}\"] : \"\"+parent[\"${vlSpec.encoding.row.field}\"]`
								},
								"orient": "left",
								"style": "guide-label",
								"frame": "group",
								"offset": 10
							},
							"encode": {"update": {"height": {"signal": "child_height"}}},
							"axes": [
								{
									"scale": "y",
									"orient": "left",
									"grid": false,
									"title": vlSpec.encoding.y.field,
									"labelOverlap": true,
									"tickCount": {"signal": "ceil(child_height / 30)"},
									"zindex": 0
								}
							]
						},
						{
							"name": "column_header",
							"type": "group",
							"role": "column-header",
							"from": {"data": "column_domain"},
							"sort": {
								"field": ["datum[\"modelcheck_group\"]", `datum[\"${vlSpec.encoding.column.field}\"]`], 
								"order": ["ascending", "ascending"]
							},
							"title": {
								"text": {
									"signal": `isValid(parent[\"${vlSpec.encoding.column.field}\"]) ? parent[\"${vlSpec.encoding.column.field}\"] : \"\"+parent[\"${vlSpec.encoding.column.field}\"]`
								},
								"style": "guide-label",
								"frame": "group",
								"offset": 10
							},
							"encode": {"update": {"width": {"signal": "child_width"}}}
						},
						{
							"name": "column_footer",
							"type": "group",
							"role": "column-footer",
							"from": {"data": "column_domain"},
							"sort": {
								"field": ["datum[\"modelcheck_group\"]", `datum[\"${vlSpec.encoding.column.field}\"]`], 
								"order": ["ascending", "ascending"]
							},
							"encode": {"update": {"width": {"signal": "child_width"}}},
							"axes": [
								{
									"scale": "x",
									"orient": "bottom",
									"grid": false,
									"title": vlSpec.encoding.x.field,
									"labelFlush": true,
									"labelOverlap": true,
									"tickCount": {"signal": "ceil(child_width / 30)"},
									"zindex": 0
								}
							]
						},
						{
							"name": "cell",
							"type": "group",
							"style": "cell",
							"from": {
								"facet": {
									"name": "facet",
									"data": "data_0",
									"groupby": ["modelcheck_group", vlSpec.encoding.column.field, vlSpec.encoding.row.field],
									"aggregate": {"cross": true}
								}
							},
							"sort": {
								"field": [`datum[\"${vlSpec.encoding.row.field}\"]`, "datum[\"modelcheck_group\"]", `datum[\"${vlSpec.encoding.column.field}\"]`],
								"order": ["ascending", "ascending", "ascending"]
							},
							"encode": {
								"update": {
									"width": {"signal": "child_width"},
									"height": {"signal": "child_height"}
								}
							},
							"signals": [
								{"name": "shape", "value": "circle"},
								{"name": chartType == "stripx" ? "x_step" : "y_step", "value": 20},
          						{"name": "width", "update": chartType == "stripx" ? "bandspace(domain('x').length, 1, 0.5) * x_step" : "bandspace(domain('y').length, 1, 0.5) * y_step"}
							],
							"marks": [
								{
									"name": "child_marks",
									"type": chartType == "scatterplot" ? "symbol" : "rect",
									"style": chartType == "scatterplot" ? ["circle"] : ["tick"],
									"from": {"data": "facet"},
									"encode": {
										"update": originalEncoding // plug in compiled encoding for primary axes
									}
								}
							],
							"axes": [
								{
									"scale": "x",
									"orient": "bottom",
									"gridScale": "y",
									"grid": true,
									"tickCount": {"signal": "ceil(child_width / 30)"},
									"domain": false,
									"labels": false,
									"aria": false,
									"maxExtent": 0,
									"minExtent": 0,
									"ticks": false,
									"zindex": 0
								},
								{
									"scale": "y",
									"orient": "left",
									"gridScale": "x",
									"grid": true,
									"tickCount": {"signal": "ceil(child_height / 30)"},
									"domain": false,
									"labels": false,
									"aria": false,
									"maxExtent": 0,
									"minExtent": 0,
									"ticks": false,
									"zindex": 0
								}
							]
						}
					],
					"scales": originalScales, // plug in original scales to keep vegaLite settings
					"legends": [
						{
							"stroke": "color",
							"symbolType": "circle",
							"title": "Model group",
							"encode": {
								"symbols": {
									"update": {
										"fill": {
											"value": "transparent"
										},
										"opacity": {
											"value": 0.7
										}
									}
								}
							}
						}
					]
				}
			}

		} else if (vlSpec.encoding.row) {
			// borrow encoding info from compiled spec
			let cellIdx = vgSpec.marks.findIndex((elem) => elem.name == "cell"),
				originalEncoding = vgSpec.marks[cellIdx].marks[0].encode.update;
			originalEncoding.shape = { signal: "shape" };
			// borrow scales from compiled spec, and modify them as needed
			let originalScales = vgSpec.scales.filter((elem) => (elem.name == "x" || elem.name == "y" || elem.name == "color")),
				xIdx = originalScales.findIndex((elem) => elem.name == "x"),
				yIdx = originalScales.findIndex((elem) => elem.name == "y");
			if (xIdx != -1) {
				originalScales[xIdx].range = [0, { signal: "child_width" }];
			}
			if (yIdx != -1) {
				originalScales[yIdx].range = [{ signal: "child_height" }, 0];
			}
			console.log("scales", originalScales);
			if (vlSpec.encoding.x && vlSpec.encoding.x.field == outcomeName) {
				// when outcome is on x, facet on y
				// fill in standardized template based on vlSpec
				vgSpec = {
					"$schema": "https://vega.github.io/schema/vega/v5.json",
					"background": "white",
					"padding": 5,
					"data": [
						{
							"name": "table",
							"transform": [
								{
									"type": "filter",
									"expr": "datum.draw == sample"
								}
							],
							"values": [] // will be filled by Svelte-Vega
						},
						{
							"name": "data_0",
							"source": "table",
							"transform": [
								{
									"type": "filter",
									"expr": `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"]) && isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
								}
							]
						},
						{
							"name": "row_domain",
							"source": "data_0",
							"transform": [{"type": "aggregate", "groupby": ["modelcheck_group", vlSpec.encoding.row.field]}]
						}
					],
					"signals": [
						{"name": "child_width", "value": defaultSize},
						{"name": "child_height", "update": `max(${minSize}, min((${vertSpace} - 60 - ${interChartPad} * length(data('row_domain'))) / (length(data('row_domain')) + 2), ${defaultSize}))`},
						{
							"name": "sample",
							"value": 1,
							"on": [
								{
									"events": "timer{500}",
									"update": "((sample + 1) % 5) + 1"
								}
							]
						}
					],
					"layout": {
						"padding": interChartPad,
						"offset": {
							"rowTitle": 10
						},
						"columns": 1,
						"bounds": "full",
						"align": "all"
					},
					"marks": [
						{
							"name": "row-title",
							"type": "group",
							"role": "row-title",
							"title": {
								"text": vlSpec.encoding.row.field,
								"orient": "left",
								"style": "guide-title",
								"offset": 10
							}
						},
						{
							"name": "row_header",
							"type": "group",
							"role": "row-header",
							"from": {
								"data": "row_domain"
							},
							"sort": {
								"field": ["datum[\"modelcheck_group\"]", `datum[\"${vlSpec.encoding.row.field}\"]`],
								"order": ["ascending", "ascending"]
							},
							"title": {
								"text": {
									"signal": `isValid(parent[\"${vlSpec.encoding.row.field}\"]) ? parent[\"${vlSpec.encoding.row.field}\"] : \"\"+parent[\"${vlSpec.encoding.row.field}\"]`
								},
								"orient": "left",
								"style": "guide-label",
								"frame": "group",
								"offset": 10
							},
							"encode": {
								"update": {
									"height": {
										"signal": "child_height"
									}
								}
							},
							"axes": [
								{
									"scale": "y",
									"orient": "left",
									"grid": false,
									"title": vlSpec.encoding.y.field,
									"labelOverlap": true,
									"tickCount": {
										"signal": "ceil(child_height / 30)"
									},
									"zindex": 1
								}
							]
						},
						{
							"name": "column_footer",
							"type": "group",
							"role": "column-footer",
							"encode": {"update": {"width": {"signal": "child_width"}}},
							"axes": [
								{
									"scale": "x",
									"orient": "bottom",
									"grid": false,
									"title": vlSpec.encoding.x.field,
									"offset": -5,
									"labelFlush": true,
									"labelOverlap": true,
									"tickCount": {"signal": "ceil(child_width / 30)"},
									"zindex": 1
								}
							]
						},
						{
							"type": "group",
							"from": {
								"facet": {
									"data": "data_0",
									"name": "facet",
									"groupby": ["modelcheck_group", vlSpec.encoding.row.field],
									"aggregate": {"cross": true}
								}
							},
							"sort": {
								"field": ["datum[\"modelcheck_group\"]", `datum[\"${vlSpec.encoding.row.field}\"]`],
								"order": ["ascending", "ascending"]
							},
							"encode": {
								"update": {
									"width": {"signal": "child_width"},
									"height": {"signal": "child_height"}
								}
							},
							"signals": [
								{"name": "shape", "value": "circle"},
								{"name": chartType == "stripx" ? "x_step" : "y_step", "value": 20},
          						{"name": "width", "update": chartType == "stripx" ? "bandspace(domain('x').length, 1, 0.5) * x_step" : "bandspace(domain('y').length, 1, 0.5) * y_step"}
							],
							"marks": [
								{
									"name": "child_marks",
									"from": {
										"data": "facet"
									},
									"type": chartType == "scatterplot" ? "symbol" : "rect",
									"style": chartType == "scatterplot" ? ["circle"] : ["tick"],
									"encode": {
										"update": originalEncoding // plug in compiled encoding for primary axes
									}
								}
							],
							"axes": [
								{
									"scale": "x",
									"orient": "bottom",
									"gridScale": "y",
									"grid": true,
									"tickCount": {
										"signal": "ceil(child_width / 30)"
									},
									"domain": false,
									"labels": false,
									"aria": false,
									"maxExtent": 0,
									"minExtent": 0,
									"ticks": false,
									"zindex": 0
								},
								{
									"scale": "y",
									"orient": "left",
									"gridScale": "x",
									"grid": true,
									"tickCount": {
										"signal": "ceil(child_height / 30)"
									},
									"domain": false,
									"labels": false,
									"aria": false,
									"maxExtent": 0,
									"minExtent": 0,
									"ticks": false,
									"zindex": 0
								}
							]
						}
					],
					"scales": originalScales, // plug in original scales to keep vegaLite settings
					"legends": [
						{
							"stroke": "color",
							"symbolType": "circle",
							"title": "Model group",
							"encode": {
								"symbols": {
									"update": {
										"fill": {
											"value": "transparent"
										},
										"opacity": {
											"value": 0.7
										}
									}
								}
							}
						}
					]
				}
			} else {
				// else, facet on x
				// fill in standardized template based on vlSpec
				vgSpec = {
					"$schema": "https://vega.github.io/schema/vega/v5.json",
					"background": "white",
					"padding": 5,
					"data": [
						{
							"name": "table",
							"transform": [
								{
									"type": "filter",
									"expr": "datum.draw == sample"
								}
							],
							"values": [] // will be filled by Svelte-Vega
						},
						{
							"name": "data_0",
							"source": "table",
							"transform": [
								{
									"type": "filter",
									"expr": `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"]) && isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
								}
							]
						},
						{
							"name": "row_domain",
							"source": "data_0",
							"transform": [{"type": "aggregate", "groupby": [vlSpec.encoding.row.field]}]
						},
						{
							"name": "model_domain",
							"source": "data_0",
							"transform": [{"type": "aggregate", "groupby": ["modelcheck_group"]}]
						}
					],
					"signals": [
						{"name": "child_width", "update": `max(${minSize}, min((${horzSpace} - 40 - ${interChartPad} * length(data('column_domain'))) / (length(data('column_domain')) + 2), ${defaultSize}))`},
						{"name": "child_height", "update": `max(${minSize}, min((${vertSpace} - 60 - ${interChartPad} * length(data('row_domain'))) / length(data('row_domain')), ${defaultSize}))`},
						{
							"name": "sample",
							"value": 1,
							"on": [
								{
									"events": "timer{500}",
									"update": "((sample + 1) % 5) + 1"
								}
							]
						}
					],
					"layout": {
						"padding": interChartPad,
						"offset": {
							"rowTitle": 10
						},
						"columns": {"signal": "length(data('model_domain'))"},
						"bounds": "full",
						"align": "all"
					},
					"marks": [
						{
							"name": "row-title",
							"type": "group",
							"role": "row-title",
							"title": {
								"text": vlSpec.encoding.row.field,
								"orient": "left",
								"style": "guide-title",
								"offset": 10
							}
						},
						{
							"name": "row_header",
							"type": "group",
							"role": "row-header",
							"from": {
								"data": "row_domain"
							},
							"sort": {
								"field": `datum[\"${vlSpec.encoding.row.field}\"]`,
								"order": "ascending"
							},
							"title": {
								"text": {
									"signal": `isValid(parent[\"${vlSpec.encoding.row.field}\"]) ? parent[\"${vlSpec.encoding.row.field}\"] : \"\"+parent[\"${vlSpec.encoding.row.field}\"]`
								},
								"orient": "left",
								"style": "guide-label",
								"frame": "group",
								"offset": 10
							},
							"encode": {
								"update": {
									"height": {
										"signal": "child_height"
									}
								}
							},
							"axes": [
								{
									"scale": "y",
									"orient": "left",
									"grid": false,
									"title": vlSpec.encoding.y.field,
									"labelOverlap": true,
									"tickCount": {
										"signal": "ceil(child_height / 30)"
									},
									"zindex": 1
								}
							]
						}, 
						{
							"name": "column_footer",
							"type": "group",
							"role": "column-footer",
							"from": {"data": "model_domain"},
							"encode": {"update": {"width": {"signal": "child_width"}}},
							"axes": [
								{
									"scale": "x",
									"orient": "bottom",
									"grid": false,
									"title": vlSpec.encoding.x.field,
									"offset": -5,
									"labelFlush": true,
									"labelOverlap": true,
									"tickCount": {"signal": "ceil(child_width / 30)"},
									"zindex": 0
								}
							]
						},
						{
							"type": "group",
							"from": {
								"facet": {
									"data": "data_0",
									"name": "facet",
									"groupby": ["modelcheck_group", vlSpec.encoding.row.field],
									"aggregate": {"cross": true}
								}
							},
							"encode": {
								"update": {
									"width": {"signal": "child_width"},
									"height": {"signal": "child_height"}
								}
							},
							"signals": [
								{"name": "shape", "value": "circle"},
								{"name": chartType == "stripx" ? "x_step" : "y_step", "value": 20},
          						{"name": "width", "update": chartType == "stripx" ? "bandspace(domain('x').length, 1, 0.5) * x_step" : "bandspace(domain('y').length, 1, 0.5) * y_step"}
							],
							"marks": [
								{
									"name": "child_marks",
									"from": {
										"data": "facet"
									},
									"type": chartType == "scatterplot" ? "symbol" : "rect",
									"style": chartType == "scatterplot" ? ["circle"] : ["tick"],
									"encode": {
										"update": originalEncoding // plug in compiled encoding for primary axes
									}
								}
							],
							"axes": [
								{
									"scale": "x",
									"orient": "bottom",
									"gridScale": "y",
									"grid": true,
									"tickCount": {
										"signal": "ceil(child_width / 30)"
									},
									"domain": false,
									"labels": false,
									"aria": false,
									"maxExtent": 0,
									"minExtent": 0,
									"ticks": false,
									"zindex": 0
								},
								{
									"scale": "y",
									"orient": "left",
									"gridScale": "x",
									"grid": true,
									"tickCount": {
										"signal": "ceil(child_height / 30)"
									},
									"domain": false,
									"labels": false,
									"aria": false,
									"maxExtent": 0,
									"minExtent": 0,
									"ticks": false,
									"zindex": 0
								}
							]
						}
					],
					"scales": originalScales, // plug in original scales to keep vegaLite settings
					"legends": [
						{
							"stroke": "color",
							"symbolType": "circle",
							"title": "Model group",
							"encode": {
								"symbols": {
									"update": {
										"fill": {
											"value": "transparent"
										},
										"opacity": {
											"value": 0.7
										}
									}
								}
							}
						}
					]
				}
			}
			
		} else if (vlSpec.encoding.column) {
			// borrow encoding info from compiled spec
			let cellIdx = vgSpec.marks.findIndex((elem) => elem.name == "cell"),
				originalEncoding = vgSpec.marks[cellIdx].marks[0].encode.update;
			originalEncoding.shape = { signal: "shape" };
			// borrow scales from compiled spec, and modify them as needed
			let originalScales = vgSpec.scales.filter((elem) => (elem.name == "x" || elem.name == "y" || elem.name == "color")),
				xIdx = originalScales.findIndex((elem) => elem.name == "x"),
				yIdx = originalScales.findIndex((elem) => elem.name == "y");
			if (xIdx != -1) {
				originalScales[xIdx].range = [0, { signal: "child_width" }];
			}
			if (yIdx != -1) {
				originalScales[yIdx].range = [{ signal: "child_height" }, 0];
			}
			console.log("scales", originalScales);
			if (vlSpec.encoding.x && vlSpec.encoding.x.field == outcomeName) {
				// if outcome on x, facet on y
				// fill in standardized template based on vlSpec
				vgSpec = {
					"$schema": "https://vega.github.io/schema/vega/v5.json",
					"background": "white",
					"padding": 5,
					"data": [
						{
							"name": "table",
							"transform": [
								{
									"type": "filter",
									"expr": "datum.draw == sample"
								}
							],
							"values": [] // will be filled by Svelte-Vega
						},
						{
							"name": "data_0",
							"source": "table",
							"transform": [
								{
									"type": "filter",
									"expr": `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"]) && isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
								}
							]
						},
						{
							"name": "column_domain",
							"source": "data_0",
							"transform": [
								{
									"type": "aggregate",
									"groupby": [
										vlSpec.encoding.column.field
									]
								}
							]
						},
						{
							"name": "model_domain",
							"source": "data_0",
							"transform": [
								{
									"type": "aggregate",
									"groupby": ["modelcheck_group"]
								}
							]
						}
					],
					"signals": [
						{"name": "child_width", "update": `max(${minSize}, min((${horzSpace} - 40 - ${interChartPad} * length(data('column_domain'))) / length(data('column_domain')), ${defaultSize}))`},
						{"name": "child_height", "update": `max(${minSize}, min((${vertSpace} - 60 - ${interChartPad} * length(data('row_domain'))) / (length(data('row_domain')) + 2), ${defaultSize}))`},
						{
							"name": "sample",
							"value": 1,
							"on": [
								{
									"events": "timer{500}",
									"update": "((sample + 1) % 5) + 1"
								}
							]
						}
					],
					"layout": {
						"padding": interChartPad,
						"offset": {
							"rowTitle": 10
						},
						"bounds": "full",
						"align": "all",
						"columns": {"signal": "length(data('column_domain'))"},
					},
					"marks": [
						{
							"name": "column-title",
							"type": "group",
							"role": "column-title",
							"title": {
								"text": vlSpec.encoding.column.field,
								"orient": "top",
								"style": "guide-title",
								"offset": 10
							}
						},
						{
							"name": "row_header",
							"type": "group",
							"role": "row-header",
							"from": {
								"data": "model_domain"
							},
							"encode": {
								"update": {
									"height": {
										"signal": "child_height"
									}
								}
							},
							"axes": [
								{
									"scale": "y",
									"orient": "left",
									"grid": false,
									"title": vlSpec.encoding.y.field,
									"labelOverlap": true,
									"tickCount": {
										"signal": "ceil(child_height / 30)"
									},
									"zindex": 1
								}
							]
						},
						{
							"name": "column_header",
							"type": "group",
							"role": "column-header",
							"from": {
								"data": "column_domain"
							},
							"sort": {
								"field": `datum[\"${vlSpec.encoding.column.field}\"]`,
								"order": "ascending"
							},
							"title": {
								"text": {
									"signal": `isValid(parent[\"${vlSpec.encoding.column.field}\"]) ? parent[\"${vlSpec.encoding.column.field}\"] : \"\"+parent[\"${vlSpec.encoding.column.field}\"]`
								},
								"orient": "top",
								"style": "guide-label",
								"frame": "group",
								"offset": 10
							},
							"encode": {
								"update": {
									"width": {
										"signal": "child_width"
									}
								}
							}
						},
						{
							"name": "column_footer",
							"type": "group",
							"role": "column-footer",
							"from": {
								"data": "column_domain"
							},
							"encode": {
								"update": {
									"width": {
										"signal": "child_width"
									}
								}
							},
							"axes": [
								{
									"scale": "x",
									"orient": "bottom",
									"grid": false,
									"title": vlSpec.encoding.x.field,
									"offset": -5,
									"labelFlush": true,
									"labelOverlap": true,
									"tickCount": {
										"signal": "ceil(child_width / 30)"
									},
									"zindex": 0
								}
							]
						},
						{
							"type": "group",
							"style": "cell",
							"from": {
								"facet": {
									"data": "data_0",
									"name": "facet",
									"groupby": ["modelcheck_group", vlSpec.encoding.column.field],
									"aggregate": {
										"cross": true
									}
								}
							},
							"sort": {
								"field": ["datum[\"modelcheck_group\"]", `datum[\"${vlSpec.encoding.column.field}\"]`],
								"order": ["ascending", "ascending"]
							},
							"encode": {
								"update": {
									"width": {
										"signal": "child_width"
									},
									"height": {
										"signal": "child_height"
									}
								}
							},
							"signals": [
								{"name": "shape", "value": "circle"},
								{"name": chartType == "stripx" ? "x_step" : "y_step", "value": 20},
          						{"name": "width", "update": chartType == "stripx" ? "bandspace(domain('x').length, 1, 0.5) * x_step" : "bandspace(domain('y').length, 1, 0.5) * y_step"}
							],
							"marks": [
								{
									"name": "child_marks",
									"from": {
										"data": "facet"
									},
									"type": chartType == "scatterplot" ? "symbol" : "rect",
									"style": chartType == "scatterplot" ? ["circle"] : ["tick"],
									"encode": {
										"update": originalEncoding // plug in compiled encoding for primary axes
									}
								}
							],
							"axes": [
								{
									"scale": "x",
									"orient": "bottom",
									"gridScale": "y",
									"grid": true,
									"tickCount": {
										"signal": "ceil(child_width / 30)"
									},
									"domain": false,
									"labels": false,
									"aria": false,
									"maxExtent": 0,
									"minExtent": 0,
									"ticks": false,
									"zindex": 0
								},
								{
									"scale": "y",
									"orient": "left",
									"gridScale": "x",
									"grid": true,
									"tickCount": {
										"signal": "ceil(child_height / 30)"
									},
									"domain": false,
									"labels": false,
									"aria": false,
									"maxExtent": 0,
									"minExtent": 0,
									"ticks": false,
									"zindex": 0
								}
							]
						}
					],
					"scales": originalScales, // plug in original scales to keep vegaLite settings
					"legends": [
						{
							"stroke": "color",
							"symbolType": "circle",
							"title": "Model group",
							"encode": {
								"symbols": {
									"update": {
										"fill": {
											"value": "transparent"
										},
										"opacity": {
											"value": 0.7
										}
									}
								}
							}
						}
					]
				}
			} else {
				// else, facet on x
				// fill in standardized template based on vlSpec
				vgSpec = {
					"$schema": "https://vega.github.io/schema/vega/v5.json",
					"background": "white",
					"padding": 5,
					"data": [
						{
						"name": "table",
						"transform": [
							// { // season hack
							// 	"type": "formula",
							// 	"expr": `datum[\"season\"]===\"winter\" ? 0 : datum[\"season\"]===\"spring\" ? 1 : datum[\"season\"]===\"summer\" ? 2 : datum[\"season\"]===\"dec\" ? 3 : 4`,
							// 	"as": "column_season_sort_index"
							// },
							{
								"type": "filter",
								"expr": "datum.draw == sample"
							}
						],
						"values": [] // will be filled by Svelte-Vega
						},
						{
							"name": "data_0",
							"source": "table",
							"transform": [
								{
									"type": "filter",
									"expr": `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"]) && isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
								}
							]
						},
						{
							"name": "column_domain",
							"source": "data_0",
							"transform": [{"type": "aggregate", "groupby": ["modelcheck_group", vlSpec.encoding.column.field//, "column_season_sort_index" // season hack
							]}]
						}
					],
					"signals": [
						{"name": "child_width", "update": `max(${minSize}, min((${horzSpace} - 40 - ${interChartPad} * length(data('column_domain'))) / (length(data('column_domain')) + 2), ${defaultSize}))`},
						{"name": "child_height", "value": defaultSize},
						{
							"name": "sample",
							"value": 1,
							"on": [
								{
									"events": "timer{500}",
									"update": "((sample + 1) % 5) + 1"
								}
							]
						}
					],
					"layout": {
						"padding": interChartPad,
						"offset": {
							"rowTitle": 10
						},
						"columns": {"signal": "length(data('column_domain'))"},
						"bounds": "full",
						"align": "all"
					},
					"marks": [
						{
							"name": "column-title",
							"type": "group",
							"role": "column-title",
							"title": {
								"text": vlSpec.encoding.column.field,
								"orient": "top",
								"style": "guide-title",
								"offset": 10
							}
						},
						{
							"name": "row_header",
							"type": "group",
							"role": "row-header",
							"encode": {"update": {"height": {"signal": "child_height"}}},
							"axes": [
								{
									"scale": "y",
									"orient": "left",
									"grid": false,
									"title": vlSpec.encoding.y.field,
									"labelOverlap": true,
									"tickCount": {
										"signal": "ceil(child_height / 30)"
									},
									"zindex": 1
								}
							]
						}, 
						{
							"name": "column_header",
							"type": "group",
							"role": "column-header",
							"from": {
								"data": "column_domain"
							},
							// "sort": { // season hack
							// 	"field": "datum[\"column_season_sort_index\"]",
							// 	"order": "ascending"
							// },
							"sort": {
								"field": ["datum[\"modelcheck_group\"]", `datum[\"${vlSpec.encoding.column.field}\"]`],
								"order": ["ascending", "ascending"]
							},
							"title": {
								"text": {
									"signal": `isValid(parent[\"${vlSpec.encoding.column.field}\"]) ? parent[\"${vlSpec.encoding.column.field}\"] : \"\"+parent[\"${vlSpec.encoding.column.field}\"]`
								},
								"orient": "top",
								"style": "guide-label",
								"frame": "group",
								"offset": 10
							},
							"encode": {
								"update": {
									"width": {
										"signal": "child_width"
									}
								}
							}
						},
						{
							"name": "column_footer",
							"type": "group",
							"role": "column-footer",
							"from": {
								"data": "column_domain"
							},
							// "sort": { // season hack
							// 	"field": "datum[\"column_season_sort_index\"]",
							// 	"order": "ascending"
							// },
							"sort": {
								"field": ["datum[\"modelcheck_group\"]", `datum[\"${vlSpec.encoding.column.field}\"]`],
								"order": ["ascending", "ascending"]
							},
							"encode": {"update": {"width": {"signal": "child_width"}}},
							"axes": [
								{
									"scale": "x",
									"orient": "bottom",
									"grid": false,
									"title": vlSpec.encoding.x.field,
									"offset": -5,
									"labelFlush": true,
									"labelOverlap": true,
									"tickCount": {"signal": "ceil(child_width / 30)"},
									"zindex": 1
								}
							]
						},
						{
							"type": "group",
							"from": {
								"facet": {
									"data": "data_0",
									"name": "facet",
									"groupby": ["modelcheck_group", vlSpec.encoding.column.field],
									"aggregate": {"cross": true}
								}
							},
							"sort": {
								"field": ["datum[\"modelcheck_group\"]", `datum[\"${vlSpec.encoding.column.field}\"]`],
								"order": ["ascending", "ascending"]
							},
							"encode": {
								"update": {
									"width": {"signal": "child_width"},
									"height": {"signal": "child_height"}
								}
							},
							"signals": [
								{"name": "shape", "value": "circle"},
								{"name": chartType == "stripx" ? "x_step" : "y_step", "value": 20},
          						{"name": "width", "update": chartType == "stripx" ? "bandspace(domain('x').length, 1, 0.5) * x_step" : "bandspace(domain('y').length, 1, 0.5) * y_step"}
							],
							"marks": [
								{
									"name": "child_marks",
									"from": {
										"data": "facet"
									},
									"type": chartType == "scatterplot" ? "symbol" : "rect",
									"style": chartType == "scatterplot" ? ["circle"] : ["tick"],
									"encode": {
										"update": originalEncoding // plug in compiled encoding for primary axes
									}
								}
							],
							"axes": [
								{
									"scale": "x",
									"orient": "bottom",
									"gridScale": "y",
									"grid": true,
									"tickCount": {
										"signal": "ceil(child_width / 30)"
									},
									"domain": false,
									"labels": false,
									"aria": false,
									"maxExtent": 0,
									"minExtent": 0,
									"ticks": false,
									"zindex": 0
								},
								{
									"scale": "y",
									"orient": "left",
									"gridScale": "x",
									"grid": true,
									"tickCount": {
										"signal": "ceil(child_height / 30)"
									},
									"domain": false,
									"labels": false,
									"aria": false,
									"maxExtent": 0,
									"minExtent": 0,
									"ticks": false,
									"zindex": 0
								}
							]
						}
					],
					"scales": originalScales, // plug in original scales to keep vegaLite settings
					"legends": [
						{
							"stroke": "color",
							"symbolType": "circle",
							"title": "Model group",
							"encode": {
								"symbols": {
									"update": {
										"fill": {
											"value": "transparent"
										},
										"opacity": {
											"value": 0.7
										}
									}
								}
							}
						}
					]
				}
			}

		} else { // no facet
			// borrow encoding info from compiled spec
			let originalEncoding = vgSpec.marks[0].encode.update;
			originalEncoding.shape = { signal: "shape" };
			// borrow scales from compiled spec, and modify them as needed
			let originalScales = vgSpec.scales.filter((elem) => (elem.name == "x" || elem.name == "y" || elem.name == "color")),
				xIdx = originalScales.findIndex((elem) => elem.name == "x"),
				yIdx = originalScales.findIndex((elem) => elem.name == "y");
			if (xIdx != -1) {
				originalScales[xIdx].range = [0, { signal: "child_width" }];
			}
			if (yIdx != -1) {
				originalScales[yIdx].range = [{ signal: "child_height" }, 0];
			}
			console.log("scales", originalScales);
			if (vlSpec.encoding.x && vlSpec.encoding.x.field == outcomeName) {
				// if outcome on x, facet on y
				// fill in standardized template based on vlSpec
				vgSpec = {
					"$schema": "https://vega.github.io/schema/vega/v5.json",
					"background": "white",
					"padding": 5,
					"data": [
						{
							"name": "table",
							"transform": [
								{
									"type": "filter",
									"expr": "datum.draw == sample"
								}
							],
							"values": [] // will be filled by Svelte-Vega
						},
						{
							"name": "data_0",
							"source": "table",
							"transform": [
								{
									"type": "filter",
									"expr": `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"]) && isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
								}
							]
						},
						{
							"name": "model_domain",
							"source": "data_0",
							"transform": [
								{
									"type": "aggregate",
									"groupby": [
										"modelcheck_group"
									]
								}
							]
						}
					],
					"signals": [
						{"name": "child_width", "value": defaultSize},
						{"name": "child_height", "update": `max(${minSize}, min((${vertSpace} - 60 - ${interChartPad} * length(data('row_domain'))) / (length(data('row_domain')) + 2), ${defaultSize}))`},
						{
							"name": "sample",
							"value": 1,
							"on": [
								{
									"events": "timer{500}",
									"update": "((sample + 1) % 5) + 1"
								}
							]
						}
					],
					"layout": {
						"padding": interChartPad,
						"offset": {
							"rowTitle": 10
						},
						"bounds": "full",
						"align": "all",
						"columns": 1,
					},
					"marks": [
						{
							"name": "row_header",
							"type": "group",
							"role": "row-header",
							"from": {"data": "model_domain"},
							"sort": {
								"field": ["datum[\"modelcheck_group\"]"],
								"order": ["ascending"]
							},
							"encode": {
								"update": {
									"height": {
										"signal": "child_height"
									}
								}
							}
						},
						{
							"name": "column_footer",
							"type": "group",
							"role": "column-footer",
							"encode": {
								"update": {
									"width": {
										"signal": "child_width"
									}
								}
							},
							"axes": [
								{
									"scale": "x",
									"orient": "bottom",
									"grid": false,
									"title": vlSpec.encoding.x.field,
									"offset": -5,
									"labelFlush": true,
									"labelOverlap": true,
									"tickCount": {
										"signal": "ceil(child_width / 30)"
									},
									"zindex": 0
								}
							]
						},
						{
							"type": "group",
							"style": "cell",
							"from": {
								"facet": {
									"data": "data_0",
									"name": "facet",
									"groupby": ["modelcheck_group"],
									"aggregate": {"cross": true}
								}
							},
							"sort": {
								"field": ["datum[\"modelcheck_group\"]"],
								"order": ["ascending"]
							},
							"encode": {
								"update": {
									"width": {
										"signal": "child_width"
									},
									"height": {
										"signal": "child_height"
									}
								}
							},
							"signals": [
								{"name": "shape", "value": "circle"},
								{"name": chartType == "stripx" ? "x_step" : "y_step", "value": 20},
          						{"name": "width", "update": chartType == "stripx" ? "bandspace(domain('x').length, 1, 0.5) * x_step" : "bandspace(domain('y').length, 1, 0.5) * y_step"}
							],
							"marks": [
								{
									"name": "child_marks",
									"from": {
										"data": "facet"
									},
									"type": chartType == "scatterplot" ? "symbol" : "rect",
									"style": chartType == "scatterplot" ? ["circle"] : ["tick"],
									"encode": {
										"update": originalEncoding // plug in compiled encoding for primary axes
									}
								}
							],
							"axes": [
								{
									"scale": "x",
									"orient": "bottom",
									"gridScale": "y",
									"grid": true,
									"tickCount": {
										"signal": "ceil(child_width / 30)"
									},
									"domain": false,
									"labels": false,
									"aria": false,
									"maxExtent": 0,
									"minExtent": 0,
									"ticks": false,
									"zindex": 0
								},
								{
									"scale": "y",
									"orient": "left",
									"gridScale": "x",
									"grid": true,
									"tickCount": {
										"signal": "ceil(child_height / 30)"
									},
									"domain": false,
									"labels": false,
									"aria": false,
									"maxExtent": 0,
									"minExtent": 0,
									"ticks": false,
									"zindex": 0
								},
								{
									"scale": "y",
									"orient": "left",
									"grid": false,
									"title": vlSpec.encoding.y.field,
									"labelOverlap": true,
									"tickCount": {
										"signal": "ceil(child_height / 30)"
									},
									"zindex": 1
								}
							]
						}
					],
					"scales": originalScales, // plug in original scales to keep vegaLite settings
					"legends": [
						{
							"stroke": "color",
							"symbolType": "circle",
							"title": "Model group",
							"encode": {
								"symbols": {
									"update": {
										"fill": {
											"value": "transparent"
										},
										"opacity": {
											"value": 0.7
										}
									}
								}
							}
						}
					]
				}
			} else { 
				// else, facet on x
				// fill in standardized template based on vlSpec
				vgSpec = {
					"$schema": "https://vega.github.io/schema/vega/v5.json",
					"background": "white",
					"padding": 5,
					"data": [
						{
							"name": "table",
							"transform": [
								{
									"type": "filter",
									"expr": "datum.draw == sample"
								}
							],
							"values": [] // will be filled by Svelte-Vega
						},
						{
							"name": "data_0",
							"source": "table",
							"transform": [
								{
									"type": "filter",
									"expr": `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"]) && isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
								}
							]
						},
						{
							"name": "model_domain",
							"source": "data_0",
							"transform": [{"type": "aggregate", "groupby": ["modelcheck_group"]}]
						}
					],
					"signals": [
						{"name": "child_width", "update": `max(${minSize}, min((${horzSpace} - 40 - ${interChartPad} * length(data('column_domain'))) / (length(data('column_domain')) + 2), ${defaultSize}))`},
						{"name": "child_height", "value": defaultSize},
						{
							"name": "sample",
							"value": 1,
							"on": [
								{
									"events": "timer{500}",
									"update": "((sample + 1) % 5) + 1"
								}
							]
						}
					],
					"layout": {
						"padding": interChartPad,
						"offset": {
							"rowTitle": 10
						},
						"columns": {"signal": "length(data('model_domain'))"},
						"bounds": "full",
						"align": "all"
					},
					"marks": [
						{
							"name": "row_header",
							"type": "group",
							"role": "row-header",
							"encode": {
								"update": {
									"height": {
										"signal": "child_height"
									}
								}
							},
							"axes": [
								{
									"scale": "y",
									"orient": "left",
									"grid": false,
									"title": vlSpec.encoding.y.field,
									"labelOverlap": true,
									"tickCount": {
										"signal": "ceil(child_height / 30)"
									},
									"zindex": 1
								}
							]
						}, 
						{
							"name": "column_footer",
							"type": "group",
							"role": "column-footer",
							"from": {"data": "model_domain"},
							"encode": {"update": {"width": {"signal": "child_width"}}},
							"axes": [
								{
									"scale": "x",
									"orient": "bottom",
									"grid": false,
									"title": vlSpec.encoding.x.field,
									"offset": -5,
									"labelFlush": true,
									"labelOverlap": true,
									"tickCount": {"signal": "ceil(child_width / 30)"},
									"zindex": 0
								}
							]
						},
						{
							"type": "group",
							"from": {
								"facet": {
									"data": "data_0",
									"name": "facet",
									"groupby": ["modelcheck_group"],
									"aggregate": {"cross": true}
								}
							},
							"encode": {
								"update": {
									"width": {"signal": "child_width"},
									"height": {"signal": "child_height"}
								}
							},
							"signals": [
								{"name": "shape", "value": "circle"},
								{"name": chartType == "stripx" ? "x_step" : "y_step", "value": 20},
          						{"name": "width", "update": chartType == "stripx" ? "bandspace(domain('x').length, 1, 0.5) * x_step" : "bandspace(domain('y').length, 1, 0.5) * y_step"}
							],
							"marks": [
								{
									"name": "child_marks",
									"from": {
										"data": "facet"
									},
									"type": chartType == "scatterplot" ? "symbol" : "rect",
									"style": chartType == "scatterplot" ? ["circle"] : ["tick"],
									"encode": {
										"update": originalEncoding // plug in compiled encoding for primary axes
									}
								}
							],
							"axes": [
								{
									"scale": "x",
									"orient": "bottom",
									"gridScale": "y",
									"grid": true,
									"tickCount": {
										"signal": "ceil(child_width / 30)"
									},
									"domain": false,
									"labels": false,
									"aria": false,
									"maxExtent": 0,
									"minExtent": 0,
									"ticks": false,
									"zindex": 0
								},
								{
									"scale": "y",
									"orient": "left",
									"gridScale": "x",
									"grid": true,
									"tickCount": {
										"signal": "ceil(child_height / 30)"
									},
									"domain": false,
									"labels": false,
									"aria": false,
									"maxExtent": 0,
									"minExtent": 0,
									"ticks": false,
									"zindex": 0
								}
							]
						}
					],
					"scales": originalScales, // plug in original scales to keep vegaLite settings
					"legends": [
						{
							"stroke": "color",
							"symbolType": "circle",
							"title": "Model group",
							"encode": {
								"symbols": {
									"update": {
										"fill": {
											"value": "transparent"
										},
										"opacity": {
											"value": 0.7
										}
									}
								}
							}
						}
					]
				}
			}
				
			
		}

	} else {
		// when no model check to show, edit default chart dimensions to keep defaults consistent
		vgSpec.padding = 5;
		if (vgSpec.signals) {
			let areColumns = vgSpec.data.filter((d) => d.name == "column_domain").length > 0,
				areRows = vgSpec.data.filter((d) => d.name == "row_domain").length > 0,
				isStripX = vgSpec.signals.filter((d) => d.name == "x_step").length > 0,
				isStripY = vgSpec.signals.filter((d) => d.name == "y_step").length > 0,
				childWidthIdx = vgSpec.signals.findIndex((d) => d.name == "child_width"),
				childHeightIdx = vgSpec.signals.findIndex((d) => d.name == "child_height");
			if (areColumns && isStripX) {
				vgSpec.signals[childWidthIdx] = {"name": "child_width", "update": "bandspace(domain('x').length, 1, 0.5) * x_step"};
			} else if (areColumns) {
				vgSpec.signals[childWidthIdx] = {"name": "child_width", "update": `max(${minSize}, min((${horzSpace} - 40 - ${interChartPad} * length(data('column_domain'))) / (length(data('column_domain')) + 2), ${defaultSize}))`};
			}
			if (areRows && isStripY) {
				vgSpec.signals[childHeightIdx] = {"name": "child_height", "update": "bandspace(domain('y').length, 1, 0.5) * y_step"};
			} else if (areRows) {
				vgSpec.signals[childHeightIdx] = {"name": "child_height", "update": `max(${minSize}, min((${vertSpace} - 60 - ${interChartPad} * length(data('row_domain'))) / (length(data('row_domain')) + 2), ${defaultSize}))`};
			}
		}
		if (vgSpec.layout) {
			vgSpec.layout.padding = interChartPad;
		}
		if (vgSpec.width) {
			vgSpec.width = 200;
		}
		if (vgSpec.height) {
			vgSpec.height = 200;
		}
	}
	console.log("use vgSpec", vgSpec);


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
		max-width: 53vw;
		overflow-x: scroll;
	}

	#container {
		width: 100%;
		height: 100%;
	}
</style>
