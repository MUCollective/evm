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
		minSize = 50;

	// process input data, looking for signs that we have a model to show
	let dataset = { table: dataChanged };
	let distinctModelGroups = distinctValues(dataset.table, "modelcheck_group");
	if (distinctModelGroups.includes("undefined")) {
		distinctModelGroups.pop(); // remove "undefined" if needed
	}
	let haveModelToShow = distinctModelGroups.some(
		(elem) => elem.startsWith("normal|") || elem.startsWith("res|") // TODO: make this work for non-normal families
	);
	console.log("modelcheck groups in the chart data", distinctModelGroups);
	console.log("model to show?", haveModelToShow);
	let minX = Infinity,
		maxX = Number.NEGATIVE_INFINITY,
		minY = Infinity,
		maxY = Number.NEGATIVE_INFINITY;

	// color and offset for modelcheck
	if (modeling && haveModelToShow) {
		// add "data" if needed (to maintain consistent colors for model predictions vs residuals)
		if (!distinctModelGroups.includes("data")) {
			distinctModelGroups.unshift("data");
		}

		// // get outcome name
		// outcomeName = distinctModelGroups[1].substring(
		// 	distinctModelGroups[1].indexOf("|") + 1, 
		// 	distinctModelGroups[1].indexOf("~")
		// );
		// outcomeName = outcomeName.trim();
		// console.log("outcome", outcomeName);

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
		if (vlSpec.mark == "bar" || vlSpec.mark.type == "bar" || vlSpec.mark == "tick" || vlSpec.mark.type == "tick") {
			if (!vlSpec.encoding.x || vlSpec.encoding.x.type == "nominal" || vlSpec.encoding.x.type == "ordinal") {
				vlSpec.encoding.xOffset = vlSpec.encoding.xOffset
					? vlSpec.encoding.xOffset
					: { field: null, type: null };
				vlSpec.encoding.xOffset.field = "modelcheck_group";
				vlSpec.encoding.xOffset.type = "ordinal";
			} else if (!vlSpec.encoding.y || vlSpec.encoding.y.type == "nominal" || vlSpec.encoding.y.type == "ordinal") {
				vlSpec.encoding.yOffset = vlSpec.encoding.yOffset
					? vlSpec.encoding.yOffset
					: { field: null, type: null };
				vlSpec.encoding.yOffset.field = "modelcheck_group";
				vlSpec.encoding.yOffset.type = "ordinal";
			}
		}
		console.log("chartpanel dataset", dataset);
		console.log("models", models);
		// mpg ~ 1
		// console.log(models[0].exp[0]);

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
		// faceting for scatterplots
		if (vlSpec.mark.type == "circle") {
			if (vlSpec.encoding.row && vlSpec.encoding.column) {
				// borrow encoding info from compiled spec
				let cellIdx = vgSpec.marks.findIndex((elem) => elem.name == "cell"),
					originalEncoding = vgSpec.marks[cellIdx].marks[0].encode.update;
				originalEncoding.shape = { signal: "shape" };
				// borrow scales from compiled spec, and modify them as needed
				let originalScales = vgSpec.scales.filter((elem) => (elem.name == "x" || elem.name == "y" || elem.name == "color")),
					xIdx = originalScales.findIndex((elem) => elem.name == "x"),
					yIdx = originalScales.findIndex((elem) => elem.name == "y");
				originalScales[xIdx].range = [0, { signal: "child_width" }];
				originalScales[yIdx].range = [{ signal: "child_height" }, 0];
				console.log("scales", originalScales);
				if (vlSpec.encoding.x.field == outcomeName) {
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
								"transform": [{"type": "aggregate", "groupby": [vlSpec.encoding.row.field, "modelcheck_group"]}]
							}
						],
						"signals": [
							// {"name": "child_width", "value": 200},
							// {"name": "child_height", "value": 200},
							{"name": "child_width", "update": `max(${minSize}, min(${horzSpace} / length(data('column_domain')), ${defaultSize}))`},
							{"name": "child_height", "update": `max(${minSize}, min(${vertSpace} / length(data('row_domain')), ${defaultSize}))`},
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
							"padding": 5,
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
								"title": {"text": "origin", "style": "guide-title", "offset": 10}
							},
							{
								"name": "row_header",
								"type": "group",
								"role": "row-header",
								"from": {"data": "row_domain"},
								"sort": {
									"field": [`datum[\"${vlSpec.encoding.row.field}\"]`, "datum[\"modelcheck_group\"]"], 
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
										"title": vlSpec.encoding.y.field != "modelcheck_group" ? vlSpec.encoding.y.field : "",
										"labelOverlap": true,
										"tickCount": {"signal": "ceil(child_height/40)"},
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
										"title": vlSpec.encoding.x.field != "modelcheck_group" ? vlSpec.encoding.x.field : "",
										"labelFlush": true,
										"labelOverlap": true,
										"tickCount": {"signal": "ceil(child_width/40)"},
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
										"groupby": [vlSpec.encoding.row.field, "modelcheck_group", vlSpec.encoding.column.field],
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
									{
										"name": "shape",
										"value": "circle"
									}
								],
								"marks": [
									{
										"name": "child_marks",
										"type": "symbol",
										"style": ["circle"],
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
										"tickCount": {"signal": "ceil(child_width/40)"},
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
										"tickCount": {"signal": "ceil(child_height/40)"},
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
								"title": "modelcheck_group",
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
								"transform": [{"type": "aggregate", "groupby": [vlSpec.encoding.column.field, "modelcheck_group"]}]
							},
							{
								"name": "row_domain",
								"source": "data_0",
								"transform": [{"type": "aggregate", "groupby": [vlSpec.encoding.row.field]}]
							}
						],
						"signals": [
							// {"name": "child_width", "value": 200},
							// {"name": "child_height", "value": 200},
							{"name": "child_width", "update": `max(${minSize}, min(${horzSpace} / length(data('column_domain')), ${defaultSize}))`},
							{"name": "child_height", "update": `max(${minSize}, min(${vertSpace} / length(data('row_domain')), ${defaultSize}))`},
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
							"padding": 5,
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
								"title": {"text": "origin", "style": "guide-title", "offset": 10}
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
										"title": vlSpec.encoding.y.field != "modelcheck_group" ? vlSpec.encoding.y.field : "",
										"labelOverlap": true,
										"tickCount": {"signal": "ceil(child_height/40)"},
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
									"field": [`datum[\"${vlSpec.encoding.column.field}\"]`, "datum[\"modelcheck_group\"]"], 
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
									"field": [`datum[\"${vlSpec.encoding.column.field}\"]`, "datum[\"modelcheck_group\"]"], 
									"order": ["ascending", "ascending"]
								},
								"encode": {"update": {"width": {"signal": "child_width"}}},
								"axes": [
									{
										"scale": "x",
										"orient": "bottom",
										"grid": false,
										"title": vlSpec.encoding.x.field != "modelcheck_group" ? vlSpec.encoding.x.field : "",
										"labelFlush": true,
										"labelOverlap": true,
										"tickCount": {"signal": "ceil(child_width/40)"},
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
										"groupby": [vlSpec.encoding.column.field, "modelcheck_group", vlSpec.encoding.row.field],
										"aggregate": {"cross": true}
									}
								},
								"sort": {
									"field": [`datum[\"${vlSpec.encoding.column.field}\"]`, "modelcheck_group", `datum[\"${vlSpec.encoding.row.field}\"]`],
									"order": ["ascending", "ascending", "ascending"]
								},
								"encode": {
									"update": {
										"width": {"signal": "child_width"},
										"height": {"signal": "child_height"}
									}
								},
								"signals": [
									{
										"name": "shape",
										"value": "circle"
									}
								],
								"marks": [
									{
										"name": "child_marks",
										"type": "symbol",
										"style": ["circle"],
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
										"tickCount": {"signal": "ceil(child_width/40)"},
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
										"tickCount": {"signal": "ceil(child_height/40)"},
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
								"title": "modelcheck_group",
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
				originalScales[xIdx].range = [0, { signal: "child_width" }];
				originalScales[yIdx].range = [{ signal: "child_height" }, 0];
				console.log("scales", originalScales);
				if (vlSpec.encoding.x.field == outcomeName) {
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
								"transform": [{"type": "aggregate", "groupby": [vlSpec.encoding.row.field, "modelcheck_group"]}]
							}
						],
						"signals": [
							// {"name": "child_width", "value": 200},
							// {"name": "child_height", "value": 200},
							{"name": "child_width", "value": defaultSize},
							{"name": "child_height", "update": `max(${minSize}, min(${vertSpace} / length(data('row_domain')), ${defaultSize}))`},
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
							"padding": 5,
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
										"title": vlSpec.encoding.y.field != "modelcheck_group" ? vlSpec.encoding.y.field : "",
										"labelOverlap": true,
										"tickCount": {
											"signal": "ceil(child_height/40)"
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
										"title": vlSpec.encoding.x.field != "modelcheck_group" ? vlSpec.encoding.x.field : "",
										"offset": -5,
										"labelFlush": true,
										"labelOverlap": true,
										"tickCount": {"signal": "ceil(child_width/40)"},
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
										"groupby": [vlSpec.encoding.row.field, "modelcheck_group"],
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
									{
										"name": "shape",
										"value": "circle"
									}
								],
								"marks": [
									{
										"name": "child_marks",
										"from": {
											"data": "facet"
										},
										"type": "symbol",
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
											"signal": "ceil(child_width/40)"
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
											"signal": "ceil(child_height/40)"
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
								"title": "modelcheck_group",
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
							// {"name": "child_width", "value": 200},
							// {"name": "child_height", "value": 200},
							{"name": "child_width", "update": `max(${minSize}, min(${horzSpace} / length(data('model_domain')), ${defaultSize}))`},
							{"name": "child_height", "update": `max(${minSize}, min(${vertSpace} / length(data('row_domain')), ${defaultSize}))`},
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
							"padding": 5,
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
										"title": vlSpec.encoding.y.field != "modelcheck_group" ? vlSpec.encoding.y.field : "",
										"labelOverlap": true,
										"tickCount": {
											"signal": "ceil(child_height/40)"
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
										"title": vlSpec.encoding.x.field != "modelcheck_group" ? vlSpec.encoding.x.field : "",
										"offset": -5,
										"labelFlush": true,
										"labelOverlap": true,
										"tickCount": {"signal": "ceil(child_width/40)"},
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
										"groupby": [vlSpec.encoding.row.field,"modelcheck_group"],
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
									{
										"name": "shape",
										"value": "circle"
									}
								],
								"marks": [
									{
										"name": "child_marks",
										"from": {
											"data": "facet"
										},
										"type": "symbol",
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
											"signal": "ceil(child_width/40)"
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
											"signal": "ceil(child_height/40)"
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
								"title": "modelcheck_group",
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
				originalScales[xIdx].range = [0, { signal: "child_width" }];
				originalScales[yIdx].range = [{ signal: "child_height" }, 0];
				console.log("scales", originalScales);
				if (vlSpec.encoding.x.field == outcomeName) {
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
										"groupby": [
											"modelcheck_group"
										]
									}
								]
							}
						],
						"signals": [
							{
								"name": "child_width",
								"value": 200
							},
							{
								"name": "child_height",
								"value": 200
							},
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
							"padding": 5,
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
										"title": vlSpec.encoding.y.field != "modelcheck_group" ? vlSpec.encoding.y.field : "",
										"labelOverlap": true,
										"tickCount": {
											"signal": "ceil(child_height/40)"
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
										"title": vlSpec.encoding.x.field != "modelcheck_group" ? vlSpec.encoding.x.field : "",
										"offset": -5,
										"labelFlush": true,
										"labelOverlap": true,
										"tickCount": {
											"signal": "ceil(child_width/40)"
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
										"groupby": [
											"modelcheck_group",
											vlSpec.encoding.column.field
										],
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
									{
										"name": "shape",
										"value": "circle"
									}
								],
								"marks": [
									{
										"name": "child_marks",
										"from": {
											"data": "facet"
										},
										"type": "symbol",
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
											"signal": "ceil(child_width/40)"
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
											"signal": "ceil(child_height/40)"
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
								"title": "modelcheck_group",
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
								{ // month hack
									"type": "formula",
									"expr": `datum[\"month\"]===\"jan\" ? 0 : datum[\"month\"]===\"feb\" ? 1 : datum[\"month\"]===\"mar\" ? 2 : datum[\"month\"]===\"apr\" ? 3 : datum[\"month\"]===\"may\" ? 4 : datum[\"month\"]===\"jun\" ? 5 : datum[\"month\"]===\"jul\" ? 6 : datum[\"month\"]===\"aug\" ? 7 : datum[\"month\"]===\"sep\" ? 8 : datum[\"month\"]===\"oct\" ? 9 : datum[\"month\"]===\"nov\" ? 10 : datum[\"month\"]===\"dec\" ? 11 : 12`,
									"as": "column_month_sort_index"
								},
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
								"transform": [{"type": "aggregate", "groupby": [vlSpec.encoding.column.field, "modelcheck_group",
									"column_month_sort_index" // month hack
								]}]
							}
						],
						"signals": [
							// {"name": "child_width", "value": 200},
							// {"name": "child_height", "value": 200},
							{"name": "child_width", "update": `max(${minSize}, min(${horzSpace} / length(data('column_domain')), ${defaultSize}))`},
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
							"padding": 5,
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
										"title": vlSpec.encoding.y.field != "modelcheck_group" ? vlSpec.encoding.y.field : "",
										"labelOverlap": true,
										"tickCount": {
											"signal": "ceil(child_height/40)"
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
								"sort": { // month hack
									"field": "datum[\"column_month_sort_index\"]",
									"order": "ascending"
								},
								// "sort": {
								// 	"field": `datum[\"${vlSpec.encoding.column.field}\"]`,
								// 	"order": "ascending"
								// },
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
								"sort": { // month hack
									"field": "datum[\"column_month_sort_index\"]",
									"order": "ascending"
								},
								"encode": {"update": {"width": {"signal": "child_width"}}},
								"axes": [
									{
										"scale": "x",
										"orient": "bottom",
										"grid": false,
										"title": vlSpec.encoding.x.field != "modelcheck_group" ? vlSpec.encoding.x.field : "",
										"offset": -5,
										"labelFlush": true,
										"labelOverlap": true,
										"tickCount": {"signal": "ceil(child_width/40)"},
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
										"groupby": [vlSpec.encoding.column.field, "modelcheck_group"],
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
									{
										"name": "shape",
										"value": "circle"
									}
								],
								"marks": [
									{
										"name": "child_marks",
										"from": {
											"data": "facet"
										},
										"type": "symbol",
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
											"signal": "ceil(child_width/40)"
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
											"signal": "ceil(child_height/40)"
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
								"title": "modelcheck_group",
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
				// turn compiled spec into HOPs:
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
							events: "timer{500}",
							update: "1 + ((sample + 1) % 5)",
						},
					],
				});
				// add filtering transform for hops
				vgSpec.data[0].transform.push({
					type: "filter",
					expr: "datum.draw == sample",
				});

				// faceting within scatterplots:
				// make sure scales exists
				vgSpec.scales = vgSpec.scales ? vgSpec.scales : [];
				// make sure axes exists
				vgSpec.axes = vgSpec.axes ? vgSpec.axes : [];
				// make sure marks exists
				vgSpec.marks = vgSpec.marks ? vgSpec.marks : [];
				// add band scale to position different modelcheck groups, and re-encode data within groups 
				if (vlSpec.encoding.x.field == outcomeName) {
					console.log("re-encoding y axis")
					// double chart height
					vgSpec.signals.push({ name: "height", update: "height*2" });
					// add y_scale if the outcome var is x
					vgSpec.scales.push({
						name: "y_scale",
						type: "band",
						domain: {"data": "table", "field": "modelcheck_group"},
						range: "height",
						padding: 0.07
					});
					// we'll need to replace the original y scale inside of marks to get nested axes
					let originalScales = vgSpec.scales.filter((elem) => elem.name == "y" );
					// // add axis for modelcheck group
					// vgSpec.axes.push({
					// 	orient: "left", 
					// 	scale: "y_scale", 
					// 	tickSize: 0, 
					// 	labelPadding: 40, 
					// 	zindex: 0
					// });
					// we'll also remove the original y axis and grids, so we can later add them back inside of marks to get nested axes
					let originalAxis = vgSpec.axes.filter((elem) => elem.scale == "y" || elem.grid);
					vgSpec.axes = vgSpec.axes.filter((elem) => !(elem.scale == "y" || elem.grid)); // remove
					console.log("originalAxis", originalAxis);
					// change properties of original axis as needed
					let yAxisIdx = originalAxis.findIndex((elem) => (elem.scale == "y" && !elem.grid)),
						xGridIdx = originalAxis.findIndex((elem) => (elem.scale == "x" && elem.grid));
					originalAxis[yAxisIdx].zindex = 1;
					originalAxis[xGridIdx].translate = { "signal": "height" }; // assume point
					originalAxis[xGridIdx].tickOffset = { "signal": "-height" };
					// borrow encoding info from initial spec
					let originalEncoding = vgSpec.marks[0].encode.update;
					originalEncoding.shape = { signal: "shape" }; // assume point
					// re-encode data within facets...
					// overwrite marks to avoid conflicts with compiled spec
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
									y: { scale: "y_scale", field: "modelcheck_group" } 
								}
							},
							// adjust the extent of the subplot area based on the band type scale created above
							signals: [
								{ name: "height", update: "bandwidth('y_scale')" },
								{ name: "shape", value: "circle" }
							],
							// re-encode whatever was on the original axis within each facet
							// add nested scale
							scales: originalScales,
							// re-construct marks
							marks: [
								{
									name: "marks",
									from: { data: "facet" },
									type: "symbol", // assume point
									encode: { update: originalEncoding }
								}
							],
							// add a nested axis
							axes: originalAxis
						}
					];
				} else { //if (vlSpec.encoding.y.field == outcomeName) or the outcome isn't encoded on either primary position
					console.log("re-encoding x axis")
					// double chart width
					vgSpec.signals.push({ name: "width", update: "width*2" });
					// add x_scale if the outcome var is y
					vgSpec.scales.push({
						name: "x_scale",
						type: "band",
						domain: {"data": "table", "field": "modelcheck_group"},
						range: "width",
						padding: 0.07
					});
					// we'll need to place the original x scale inside of marks to get nested axes
					let originalScales = vgSpec.scales.filter((elem) => elem.name == "x");
					// // add axis for modelcheck group
					// vgSpec.axes.push({
					// 	orient: "bottom", 
					// 	scale: "x_scale", 
					// 	tickSize: 0, 
					// 	labelPadding: 40, 
					// 	zindex: 1
					// });
					// we'll also remove the original x axis and grids, so we can later add them back inside of marks to get nested axes
					let originalAxis = vgSpec.axes.filter((elem) => elem.scale == "x" || elem.grid);
					vgSpec.axes = vgSpec.axes.filter((elem) => !(elem.scale == "x" || elem.grid)); // remove
					console.log("originalAxis", originalAxis);
					// change properties of original axis as needed
					let xAxisIdx = originalAxis.findIndex((elem) => (elem.scale == "x" && !elem.grid)),
						xGridIdx = originalAxis.findIndex((elem) => (elem.scale == "x" && elem.grid));
					originalAxis[xAxisIdx].zindex = 1;
					originalAxis[xAxisIdx].offset = { "signal": "height" };
					originalAxis[xGridIdx].translate = { "signal": "height" }; // assume point
					originalAxis[xGridIdx].tickOffset = { "signal": "-height" };
					// borrow encoding info from initial spec
					let originalEncoding = vgSpec.marks[0].encode.update;
					originalEncoding.shape = { signal: "shape" }; // assume point
					// re-encode data within facets...
					// overwrite marks to avoid conflicts with compiled spec
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
									x: { scale: "x_scale", field: "modelcheck_group" } 
								}
							},
							// adjust the extent of the subplot area based on the band type scale created above
							signals: [
								{ name: "width", update: "bandwidth('x_scale')" },
								{ name: "shape", value: "circle" }
							],
							// re-encode whatever was on the original axis within each facet
							// add nested scale
							scales: originalScales,
							// re-construct marks
							marks: [
								{
									name: "marks",
									from: { data: "facet" },
									type: "symbol", // assume point
									encode: { update: originalEncoding }
								}
							],
							// add a nested axis
							axes: originalAxis
						}
					];
				}
			}
		} else { // strip plots and bar charts
			// turn compiled spec into HOPs:
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
						events: "timer{500}",
						update: "1 + ((sample + 1) % 5)",
					},
				],
			});
			// add filtering transform for hops
			vgSpec.data[0].transform.push({
				type: "filter",
				expr: "datum.draw == sample",
			});
		}
		// // faceting for scatterplots:
		// if (vlSpec.mark.type == "point" || vlSpec.mark.type == "circle") {
		// 	// make sure scales exists
		// 	vgSpec.scales = vgSpec.scales ? vgSpec.scales : [];
		// 	// make sure axes exists
		// 	vgSpec.axes = vgSpec.axes ? vgSpec.axes : [];
		// 	// make sure marks exists
		// 	vgSpec.marks = vgSpec.marks ? vgSpec.marks : [];
		// 	if (vlSpec.encoding.row || vlSpec.encoding.column) {
		// 		// add band scale to position different modelcheck groups, and re-encode data within groups 
		// 		if (vlSpec.encoding.x.field == outcomeName) {
		// 			console.log("re-encoding y axis")
		// 			// double chart height
		// 			vgSpec.signals.push({ name: "height", update: "height*2" });
		// 			// add y_scale if the outcome var is x
		// 			vgSpec.scales.push({
		// 				name: "y_scale",
		// 				type: "band",
		// 				domain: {"data": "table", "field": "modelcheck_group"},
		// 				range: "height",
		// 				padding: 0.07
		// 			});
		// 			// we'll need to replace the original y scale inside of marks to get nested axes
		// 			let originalScales = vgSpec.scales.filter((elem) => elem.name == "y" );
		// 			// add axis for modelcheck group
		// 			vgSpec.axes.push({
		// 				orient: "left", 
		// 				scale: "y_scale", 
		// 				tickSize: 0, 
		// 				labelPadding: 40, 
		// 				zindex: 0
		// 			});
		// 			// we'll also remove the original y axis and grids, so we can later add them back inside of marks to get nested axes
		// 			let rowHeaderIdx = vgSpec.marks.findIndex((elem) => elem.name == "row_header"),
		// 				cellIdx = vgSpec.marks.findIndex((elem) => elem.name == "cell"),
		// 				yAxis = vgSpec.marks[rowHeaderIdx].axes.filter((elem) => elem.scale == "y"),
		// 				grids = vgSpec.marks[cellIdx].axes.filter((elem) => elem.grid);
		// 			let originalAxis = grids.concat(yAxis);
		// 			vgSpec.marks[rowHeaderIdx].axes = vgSpec.marks[rowHeaderIdx].axes.filter((elem) => !(elem.scale == "y")); // remove y
		// 			vgSpec.marks[cellIdx].axes = vgSpec.marks[cellIdx].axes.filter((elem) => !elem.grid); // remove grid
		// 			console.log("originalAxis", originalAxis);
		// 			// change properties of original axis as needed
		// 			let yAxisIdx = originalAxis.findIndex((elem) => (elem.scale == "y" && !elem.grid)),
		// 				xGridIdx = originalAxis.findIndex((elem) => (elem.scale == "x" && elem.grid));
		// 			originalAxis[yAxisIdx].zindex = 1;
		// 			if (vlSpec.mark.type == "point") {
		// 				originalAxis[xGridIdx].translate = { "signal": "child_height" };
		// 				originalAxis[xGridIdx].tickOffset = { "signal": "-child_height" };
		// 			}
		// 			// borrow encoding info from initial spec
		// 			cellIdx = vgSpec.marks.findIndex((elem) => elem.name == "cell"); // update
		// 			let originalEncoding = vgSpec.marks[cellIdx].marks[0].encode.update;
		// 			originalEncoding.shape = { signal: "shape" }; // assume point
		// 			// re-encode data within facets...
		// 			// overwrite marks only inside of the inner cell
		// 			vgSpec.marks[cellIdx] = {
		// 				// group by modelcheck group to create data sources for each subplot
		// 				type: "group",
		// 				from: {
		// 					facet: {
		// 						data: "data_0",
		// 						name: "facet",
		// 						groupby: "modelcheck_group" // do this!
		// 					}
		// 				},
		// 				// put modelcheck check group on the main axis
		// 				encode: {
		// 					enter: {
		// 						y: { scale: "y_scale", field: "modelcheck_group" } 
		// 					}
		// 				},
		// 				// adjust the extent of the subplot area based on the band type scale created above
		// 				signals: [
		// 					{ name: "height", update: "bandwidth('y_scale')" },
		// 					{ name: "shape", value: "circle" }
		// 				],
		// 				// re-encode whatever was on the original axis within each facet
		// 				// add nested scale
		// 				scales: originalScales,
		// 				// re-construct marks
		// 				marks: [
		// 					{
		// 						name: "child_marks",
		// 						from: { data: "facet" },
		// 						type: "symbol", // assume point
		// 						encode: { update: originalEncoding }
		// 					}
		// 				],
		// 				// add a nested axis
		// 				axes: originalAxis
		// 			};
		// 		} else { //if (vlSpec.encoding.y.field == outcomeName) or the outcome isn't encoded on either primary position
		// 			console.log("re-encoding x axis")
		// 			// double chart width
		// 			vgSpec.signals.push({ name: "width", update: "width*2" });
		// 			// add x_scale if the outcome var is y
		// 			vgSpec.scales.push({
		// 				name: "x_scale",
		// 				type: "band",
		// 				domain: {"data": "table", "field": "modelcheck_group"},
		// 				range: "width",
		// 				padding: 0.07
		// 			});
		// 			// we'll need to place the original x scale inside of marks to get nested axes
		// 			let originalScales = vgSpec.scales.filter((elem) => elem.name == "x");
		// 			// add axis for modelcheck group
		// 			vgSpec.axes.push({
		// 				orient: "bottom", 
		// 				scale: "x_scale", 
		// 				tickSize: 0, 
		// 				labelPadding: 40, 
		// 				zindex: 1
		// 			});
		// 			// we'll also remove the original x axis and grids, so we can later add them back inside of marks to get nested axes
		// 			let colFooterIdx = vgSpec.marks.findIndex((elem) => elem.name == "column_footer"),
		// 				cellIdx = vgSpec.marks.findIndex((elem) => elem.name == "cell"),
		// 				xAxis = vgSpec.marks[colFooterIdx].axes.filter((elem) => elem.scale == "x"),
		// 				grids = vgSpec.marks[cellIdx].axes.filter((elem) => elem.grid),
		// 				originalAxis = grids.concat(xAxis);
		// 			vgSpec.marks[colFooterIdx].axes = vgSpec.marks[colFooterIdx].axes.filter((elem) => !(elem.scale == "x")); // remove x
		// 			vgSpec.marks[cellIdx].axes = vgSpec.marks[cellIdx].axes.filter((elem) => !elem.grid); // remove grid
		// 			console.log("originalAxis", originalAxis);
		// 			// change properties of original axis as needed
		// 			let xAxisIdx = originalAxis.findIndex((elem) => (elem.scale == "x" && !elem.grid)),
		// 				xGridIdx = originalAxis.findIndex((elem) => (elem.scale == "x" && elem.grid));
		// 			originalAxis[xAxisIdx].zindex = 1;
		// 			originalAxis[xAxisIdx].offset = { "signal": "child_height" };
		// 			if (vlSpec.mark.type == "point") {
		// 				originalAxis[xGridIdx].translate = { "signal": "child_height" };
		// 				originalAxis[xGridIdx].tickOffset = { "signal": "-child_height" };
		// 			}
		// 			// borrow encoding info from initial spec
		// 			cellIdx = vgSpec.marks.findIndex((elem) => elem.name == "cell"); // update
		// 			let originalEncoding = vgSpec.marks[cellIdx].marks[0].encode.update;
		// 			originalEncoding.shape = { signal: "shape" }; // assume point
		// 			// re-encode data within facets...
		// 			// overwrite marks only inside of the inner cell
		// 			vgSpec.marks[cellIdx] = {
		// 				// group by modelcheck group to create data sources for each subplot
		// 				type: "group",
		// 				from: {
		// 					facet: {
		// 						data: "data_0",
		// 						name: "facet",
		// 						groupby: "modelcheck_group" // do this!
		// 					}
		// 				},
		// 				// put modelcheck check group on the main axis
		// 				encode: {
		// 					enter: {
		// 						x: { scale: "x_scale", field: "modelcheck_group" } 
		// 					}
		// 				},
		// 				// adjust the extent of the subplot area based on the band type scale created above
		// 				signals: [
		// 					{ name: "width", update: "bandwidth('x_scale')" },
		// 					{ name: "shape", value: "circle" }
		// 				],
		// 				// re-encode whatever was on the original axis within each facet
		// 				// add nested scale
		// 				scales: originalScales,
		// 				// re-construct marks
		// 				marks: [
		// 					{
		// 						name: "child_marks",
		// 						from: { data: "facet" },
		// 						type: "symbol", // assume point
		// 						encode: { update: originalEncoding }
		// 					}
		// 				],
		// 				// add a nested axis
		// 				axes: originalAxis
		// 			};
		// 		}
		// 	} else { // standalone scatterplot (no row or column encoding)
		// 		// add band scale to position different modelcheck groups, and re-encode data within groups 
		// 		if (vlSpec.encoding.x.field == outcomeName) {
		// 			console.log("re-encoding y axis")
		// 			// double chart height
		// 			vgSpec.signals.push({ name: "height", update: "height*2" });
		// 			// add y_scale if the outcome var is x
		// 			vgSpec.scales.push({
		// 				name: "y_scale",
		// 				type: "band",
		// 				domain: {"data": "table", "field": "modelcheck_group"},
		// 				range: "height",
		// 				padding: 0.07
		// 			});
		// 			// we'll need to replace the original y scale inside of marks to get nested axes
		// 			let originalScales = vgSpec.scales.filter((elem) => elem.name == "y" );
		// 			// add axis for modelcheck group
		// 			vgSpec.axes.push({
		// 				orient: "left", 
		// 				scale: "y_scale", 
		// 				tickSize: 0, 
		// 				labelPadding: 40, 
		// 				zindex: 0
		// 			});
		// 			// we'll also remove the original y axis and grids, so we can later add them back inside of marks to get nested axes
		// 			let originalAxis = vgSpec.axes.filter((elem) => elem.scale == "y" || elem.grid);
		// 			vgSpec.axes = vgSpec.axes.filter((elem) => !(elem.scale == "y" || elem.grid)); // remove
		// 			console.log("originalAxis", originalAxis);
		// 			// change properties of original axis as needed
		// 			let yAxisIdx = originalAxis.findIndex((elem) => (elem.scale == "y" && !elem.grid)),
		// 				xGridIdx = originalAxis.findIndex((elem) => (elem.scale == "x" && elem.grid));
		// 			originalAxis[yAxisIdx].zindex = 1;
		// 			if (vlSpec.mark.type == "point") {
		// 				originalAxis[xGridIdx].translate = { "signal": "height" };
		// 				originalAxis[xGridIdx].tickOffset = { "signal": "-height" };
		// 			}
		// 			// borrow encoding info from initial spec
		// 			let originalEncoding = vgSpec.marks[0].encode.update;
		// 			originalEncoding.shape = { signal: "shape" }; // assume point
		// 			// re-encode data within facets...
		// 			// overwrite marks to avoid conflicts with compiled spec
		// 			vgSpec.marks = [ 
		// 				{
		// 					// group by modelcheck group to create data sources for each subplot
		// 					type: "group",
		// 					from: {
		// 						facet: {
		// 							data: "data_0",
		// 							name: "facet",
		// 							groupby: "modelcheck_group" // do this!
		// 						}
		// 					},
		// 					// put modelcheck check group on the main axis
		// 					encode: {
		// 						enter: {
		// 							y: { scale: "y_scale", field: "modelcheck_group" } 
		// 						}
		// 					},
		// 					// adjust the extent of the subplot area based on the band type scale created above
		// 					signals: [
		// 						{ name: "height", update: "bandwidth('y_scale')" },
		// 						{ name: "shape", value: "circle" }
		// 					],
		// 					// re-encode whatever was on the original axis within each facet
		// 					// add nested scale
		// 					scales: originalScales,
		// 					// re-construct marks
		// 					marks: [
		// 						{
		// 							name: "marks",
		// 							from: { data: "facet" },
		// 							type: "symbol", // assume point
		// 							encode: { update: originalEncoding }
		// 						}
		// 					],
		// 					// add a nested axis
		// 					axes: originalAxis
		// 				}
		// 			];
		// 		} else { //if (vlSpec.encoding.y.field == outcomeName) or the outcome isn't encoded on either primary position
		// 			console.log("re-encoding x axis")
		// 			// double chart width
		// 			vgSpec.signals.push({ name: "width", update: "width*2" });
		// 			// add x_scale if the outcome var is y
		// 			vgSpec.scales.push({
		// 				name: "x_scale",
		// 				type: "band",
		// 				domain: {"data": "table", "field": "modelcheck_group"},
		// 				range: "width",
		// 				padding: 0.07
		// 			});
		// 			// we'll need to place the original x scale inside of marks to get nested axes
		// 			let originalScales = vgSpec.scales.filter((elem) => elem.name == "x");
		// 			// add axis for modelcheck group
		// 			vgSpec.axes.push({
		// 				orient: "bottom", 
		// 				scale: "x_scale", 
		// 				tickSize: 0, 
		// 				labelPadding: 40, 
		// 				zindex: 1
		// 			});
		// 			// we'll also remove the original x axis and grids, so we can later add them back inside of marks to get nested axes
		// 			let originalAxis = vgSpec.axes.filter((elem) => elem.scale == "x" || elem.grid);
		// 			vgSpec.axes = vgSpec.axes.filter((elem) => !(elem.scale == "x" || elem.grid)); // remove
		// 			console.log("originalAxis", originalAxis);
		// 			// change properties of original axis as needed
		// 			let xAxisIdx = originalAxis.findIndex((elem) => (elem.scale == "x" && !elem.grid)),
		// 				xGridIdx = originalAxis.findIndex((elem) => (elem.scale == "x" && elem.grid));
		// 			originalAxis[xAxisIdx].zindex = 1;
		// 			originalAxis[xAxisIdx].offset = { "signal": "height" };
		// 			if (vlSpec.mark.type == "point") {
		// 				originalAxis[xGridIdx].translate = { "signal": "height" };
		// 				originalAxis[xGridIdx].tickOffset = { "signal": "-height" };
		// 			}
		// 			// borrow encoding info from initial spec
		// 			let originalEncoding = vgSpec.marks[0].encode.update;
		// 			originalEncoding.shape = { signal: "shape" }; // assume point
		// 			// re-encode data within facets...
		// 			// overwrite marks to avoid conflicts with compiled spec
		// 			vgSpec.marks = [ 
		// 				{
		// 					// group by modelcheck group to create data sources for each subplot
		// 					type: "group",
		// 					from: {
		// 						facet: {
		// 							data: "data_0",
		// 							name: "facet",
		// 							groupby: "modelcheck_group" // do this!
		// 						}
		// 					},
		// 					// put modelcheck check group on the main axis
		// 					encode: {
		// 						enter: {
		// 							x: { scale: "x_scale", field: "modelcheck_group" } 
		// 						}
		// 					},
		// 					// adjust the extent of the subplot area based on the band type scale created above
		// 					signals: [
		// 						{ name: "width", update: "bandwidth('x_scale')" },
		// 						{ name: "shape", value: "circle" }
		// 					],
		// 					// re-encode whatever was on the original axis within each facet
		// 					// add nested scale
		// 					scales: originalScales,
		// 					// re-construct marks
		// 					marks: [
		// 						{
		// 							name: "marks",
		// 							from: { data: "facet" },
		// 							type: "symbol", // assume point
		// 							encode: { update: originalEncoding }
		// 						}
		// 					],
		// 					// add a nested axis
		// 					axes: originalAxis
		// 				}
		// 			];
		// 		}
		// 	}
		// }

	}
	console.log("use vgSpec", vgSpec);

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
