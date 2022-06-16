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
	// console.log("canvas", horzSpace, vertSpace);

	// set default chart appearance
	let defaultSize = 200,
		minSize = 20,
		interChartPad = 10,
		stripSize = 15,
		minX = Infinity,
		maxX = Number.NEGATIVE_INFINITY,
		uniqueX = [],
		minY = Infinity,
		maxY = Number.NEGATIVE_INFINITY,
		uniqueY = [],
		chartType = "scatterplot"; // default

	// process input data, looking for signs that we have a model to show
	let dataset = { table: dataChanged };
	let distinctModelGroups = distinctValues(dataset.table, "modelcheck_group");
	if (distinctModelGroups.includes("undefined")) {
		distinctModelGroups.pop(); // remove "undefined" if needed
	}
	let modelNameRegex = /^.+\|/,
		haveModelToShow = distinctModelGroups.some(
		elem => modelNameRegex.test(elem)
	);

	// infer chart type
	getChartType();
	$: vlSpec, getChartType();

	// add color scale to vega-lite spec for modelcheck
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

		vlSpec = { ...vlSpec };
	}
	console.log("vega-lite spec", vlSpec);

	// convert vega-lite spec to vega to add model checks
	let vgSpec = vegaLite.compile(vlSpec).spec;
	console.log("compiled vega spec", vgSpec);

	if (modeling && haveModelToShow) {
		// // faceting for scatterplots
		// if (vlSpec.mark.type == "circle") {

		if (vlSpec.encoding.row && vlSpec.encoding.column) {
			// borrow encoding info from compiled spec
			let cellIdx = vgSpec.marks.findIndex((elem) => elem.name == "cell"),
				originalEncoding = vgSpec.marks[cellIdx].marks[0].encode.update;
			if (chartType == "stripx") {
				originalEncoding.width = {signal: "x_step"};
			} else if (chartType == "stripy") {
				originalEncoding.height = {signal: "y_step"};
			} else {
				originalEncoding.shape = {signal: "shape"};
			}
			// borrow scales from compiled spec, and modify them as needed
			let originalScales = vgSpec.scales.filter((elem) => (elem.name == "x" || elem.name == "y" || elem.name == "color")),
				xIdx = originalScales.findIndex((elem) => elem.name == "x"),
				yIdx = originalScales.findIndex((elem) => elem.name == "y");
			if (xIdx != -1) {
				originalScales[xIdx].range = [0, { signal: "child_width" }];
				originalScales[xIdx].domain = { data: "data_0", fields: [{ signal: "x_domain" }] };
			}
			if (yIdx != -1) {
				originalScales[yIdx].range = [{ signal: "child_height" }, 0];
				originalScales[yIdx].domain = { data: "data_0", fields: [{ signal: "y_domain" }] };
			}
			// console.log("scales", originalScales);
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
								"expr": chartType == "stripy_uni"
									? `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"])`
									: `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"]) && isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
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
						{
							"name": "child_height", 
							"update": chartType == "stripy_uni"
								? `${minSize}`
								: `max(${minSize}, min((${vertSpace} - 40 - ${interChartPad} * length(data('row_domain'))) / (length(data('row_domain')) + 2), ${defaultSize}))`
						},
						{
							"name": "x_domain", 
							"update": chartType == "stripx" || chartType == "barx" || chartType == "heatmap" 
								? `[${uniqueX}]`
								// ? `sequence(${minX}, ${maxX + 1})`
								: `[${minX}, ${maxX}]`
						},
    					{
							"name": "y_domain", 
							"update": chartType == "stripy" || chartType == "bary" || chartType == "heatmap" 
								? `[${uniqueY}]`
								// ? `sequence(${minY}, ${maxY + 1})`
								: `[${minY}, ${maxY}]`
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
								"orient": "top",
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
							"axes": chartType == "stripy_uni"
								? []
								: [
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
									"labelAlign": (chartType == "stripx" || chartType == "barx" || chartType == "heatmap") 
										? "right"
										: "center",
      								"labelAngle": (chartType == "stripx" || chartType == "barx" || chartType == "heatmap") 
										? 270
										: 0,
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
								{"name": chartType.startsWith("stripx") ? "x_step" : "y_step", "value": stripSize},
          						{
									"name": chartType.startsWith("stripx") 
										? "width"
										: "height", // case chartType.startsWith("stripx") 
									"update": chartType == "stripx" 
										? "bandspace(domain('x').length, 1, 0.5) * x_step" 
										: chartType == "stripy"
											? "bandspace(domain('y').length, 1, 0.5) * y_step"
											: "20" // case chartType == "stripx_uni" || chartType == "stripy_uni"
								}
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
							"axes": chartType == "stripy_uni"
								? [
									{
										"scale": "x",
										"orient": "bottom",
										"grid": true,
										"tickCount": {"signal": "ceil(child_width / 30)"},
										"domain": false,
										"labels": false,
										"aria": false,
										"maxExtent": 0,
										"minExtent": 0,
										"ticks": false,
										"zindex": 0
									}
								]
								: [
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
							"fill": "color",
							"symbolType": chartType.startsWith("strip") 
								? "stroke"
								: chartType.startsWith("bar")
									? "square"
									: "circle",
							"title": "Model group",
							"encode": {
								"symbols": {
									"update": {
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
								"expr": chartType == "stripx_uni"
									? `isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
									: `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"]) && isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
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
						{
							"name": "child_width", 
							"update": chartType == "stripx_uni" 
								? `${minSize}`
								: `max(${minSize}, min((${horzSpace} - 40 - ${interChartPad} * length(data('column_domain'))) / (length(data('column_domain')) + 2), ${defaultSize}))`
						},
						{"name": "child_height", "update": `max(${minSize}, min((${vertSpace} - 40 - ${interChartPad} * length(data('row_domain'))) / length(data('row_domain')), ${defaultSize}))`},
						{
							"name": "x_domain", 
							"update": chartType == "stripx" || chartType == "barx" || chartType == "heatmap" 
								? `[${uniqueX}]`
								// ? `sequence(${minX}, ${maxX + 1})`
								: `[${minX}, ${maxX}]`
						},
    					{
							"name": "y_domain", 
							"update": chartType == "stripy" || chartType == "bary" || chartType == "heatmap" 
								? `[${uniqueY}]`
								// ? `sequence(${minY}, ${maxY + 1})`
								: `[${minY}, ${maxY}]`
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
								"orient": "top",
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
							"axes": chartType == "stripx_uni"
								? []
								: [
									{
										"scale": "x",
										"orient": "bottom",
										"grid": false,
										"title": vlSpec.encoding.x.field,
										"labelAlign": (chartType == "stripx" || chartType == "barx" || chartType == "heatmap") 
											? "right"
											: "center",
										"labelAngle": (chartType == "stripx" || chartType == "barx" || chartType == "heatmap") 
											? 270
											: 0,
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
								{"name": chartType.startsWith("stripx") ? "x_step" : "y_step", "value": stripSize},
          						{
									"name": chartType.startsWith("stripx") 
										? "width"
										: "height", // case chartType.startsWith("stripx") 
									"update": chartType == "stripx" 
										? "bandspace(domain('x').length, 1, 0.5) * x_step" 
										: chartType == "stripy"
											? "bandspace(domain('y').length, 1, 0.5) * y_step"
											: "20" // case chartType == "stripx_uni" || chartType == "stripy_uni"
								}
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
							"axes": chartType == "stripx_uni"
							? [
								{
									"scale": "y",
									"orient": "left",
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
							: [
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
							"fill": "color",
							"symbolType": chartType.startsWith("strip") 
								? "stroke"
								: chartType.startsWith("bar")
									? "square"
									: "circle",
							"title": "Model group",
							"encode": {
								"symbols": {
									"update": {
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
			if (chartType == "stripx") {
				originalEncoding.width = {signal: "x_step"};
			} else if (chartType == "stripy") {
				originalEncoding.height = {signal: "y_step"};
			} else {
				originalEncoding.shape = {signal: "shape"};
			}
			// borrow scales from compiled spec, and modify them as needed
			let originalScales = vgSpec.scales.filter((elem) => (elem.name == "x" || elem.name == "y" || elem.name == "color")),
				xIdx = originalScales.findIndex((elem) => elem.name == "x"),
				yIdx = originalScales.findIndex((elem) => elem.name == "y");
			if (xIdx != -1) {
				originalScales[xIdx].range = [0, { signal: "child_width" }];
				originalScales[xIdx].domain = { data: "data_0", fields: [{ signal: "x_domain" }] };
			}
			if (yIdx != -1) {
				originalScales[yIdx].range = [{ signal: "child_height" }, 0];
				originalScales[yIdx].domain = { data: "data_0", fields: [{ signal: "y_domain" }] };
			}
			// console.log("scales", originalScales);
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
									"expr": chartType == "stripy_uni"
										? `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"])`
										: `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"]) && isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
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
						{
							"name": "child_height", 
							"update": chartType == "stripy_uni" 
								? `${minSize}`
								: `max(${minSize}, min((${vertSpace} - 40 - ${interChartPad} * length(data('row_domain'))) / (length(data('row_domain')) + 2), ${defaultSize}))`
						},
						{
							"name": "x_domain", 
							"update": chartType == "stripx" || chartType == "barx" || chartType == "heatmap" 
								? `[${uniqueX}]`
								// ? `sequence(${minX}, ${maxX + 1})`
								: `[${minX}, ${maxX}]`
						},
    					{
							"name": "y_domain", 
							"update": chartType == "stripy" || chartType == "bary" || chartType == "heatmap" 
								? `[${uniqueY}]`
								// ? `sequence(${minY}, ${maxY + 1})`
								: `[${minY}, ${maxY}]`
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
							"axes": chartType == "stripy_uni"
								? []
								: [
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
									"labelAlign": (chartType == "stripx" || chartType == "barx" || chartType == "heatmap") 
										? "right"
										: "center",
      								"labelAngle": (chartType == "stripx" || chartType == "barx" || chartType == "heatmap") 
										? 270
										: 0,
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
								{"name": chartType.startsWith("stripx") ? "x_step" : "y_step", "value": stripSize},
          						{
									"name": chartType.startsWith("stripx") 
										? "width"
										: "height", // case chartType.startsWith("stripx") 
									"update": chartType == "stripx" 
										? "bandspace(domain('x').length, 1, 0.5) * x_step" 
										: chartType == "stripy"
											? "bandspace(domain('y').length, 1, 0.5) * y_step"
											: "20" // case chartType == "stripx_uni" || chartType == "stripy_uni"
								}
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
							"axes": chartType == "stripy_uni"
								? [
									{
										"scale": "x",
										"orient": "bottom",
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
									}
								]
								: [
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
							"fill": "color",
							"symbolType": chartType.startsWith("strip") 
								? "stroke"
								: chartType.startsWith("bar")
									? "square"
									: "circle",
							"title": "Model group",
							"encode": {
								"symbols": {
									"update": {
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
									"expr": chartType == "stripx_uni"
										? `isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
										: `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"]) && isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
								}
							]
						},
						{
							"name": "row_domain",
							"source": "data_0",
							"transform": [{"type": "aggregate", "groupby": [vlSpec.encoding.row.field]}]
						},
						{
							"name": "column_domain",
							"source": "data_0",
							"transform": [{"type": "aggregate", "groupby": ["modelcheck_group"]}]
						}
					],
					"signals": [
						{
							"name": "child_width", 
							"update": chartType == "stripx_uni"
								? `${minSize}`
								: `max(${minSize}, min((${horzSpace} - 40 - ${interChartPad} * length(data('column_domain'))) / (length(data('column_domain')) + 2), ${defaultSize}))`
						},
						{"name": "child_height", "update": `max(${minSize}, min((${vertSpace} - 40 - ${interChartPad} * length(data('row_domain'))) / length(data('row_domain')), ${defaultSize}))`},
						{
							"name": "x_domain", 
							"update": chartType == "stripx" || chartType == "barx" || chartType == "heatmap" 
								? `[${uniqueX}]`
								// ? `sequence(${minX}, ${maxX + 1})`
								: `[${minX}, ${maxX}]`
						},
    					{
							"name": "y_domain", 
							"update": chartType == "stripy" || chartType == "bary" || chartType == "heatmap" 
								? `[${uniqueY}]`
								// ? `sequence(${minY}, ${maxY + 1})`
								: `[${minY}, ${maxY}]`
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
							"from": {"data": "column_domain"},
							"encode": {"update": {"width": {"signal": "child_width"}}},
							"axes": chartType == "stripx_uni"
								? []
								: [
									{
										"scale": "x",
										"orient": "bottom",
										"grid": false,
										"title": vlSpec.encoding.x.field,
										"labelAlign": (chartType == "stripx" || chartType == "barx" || chartType == "heatmap") 
											? "right"
											: "center",
										"labelAngle": (chartType == "stripx" || chartType == "barx" || chartType == "heatmap") 
											? 270
											: 0,
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
								{"name": chartType.startsWith("stripx") ? "x_step" : "y_step", "value": stripSize},
          						{
									"name": chartType.startsWith("stripx") 
										? "width"
										: "height", // case chartType.startsWith("stripx") 
									"update": chartType == "stripx" 
										? "bandspace(domain('x').length, 1, 0.5) * x_step" 
										: chartType == "stripy"
											? "bandspace(domain('y').length, 1, 0.5) * y_step"
											: "20" // case chartType == "stripx_uni" || chartType == "stripy_uni"
								}
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
							"axes": chartType == "stripx_uni"
								? [
									{
										"scale": "y",
										"orient": "left",
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
								: [
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
							"fill": "color",
							"symbolType": chartType.startsWith("strip") 
								? "stroke"
								: chartType.startsWith("bar")
									? "square"
									: "circle",
							"title": "Model group",
							"encode": {
								"symbols": {
									"update": {
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
			if (chartType == "stripx") {
				originalEncoding.width = {signal: "x_step"};
			} else if (chartType == "stripy") {
				originalEncoding.height = {signal: "y_step"};
			} else {
				originalEncoding.shape = {signal: "shape"};
			}
			// borrow scales from compiled spec, and modify them as needed
			let originalScales = vgSpec.scales.filter((elem) => (elem.name == "x" || elem.name == "y" || elem.name == "color")),
				xIdx = originalScales.findIndex((elem) => elem.name == "x"),
				yIdx = originalScales.findIndex((elem) => elem.name == "y");
			if (xIdx != -1) {
				originalScales[xIdx].range = [0, { signal: "child_width" }];
				originalScales[xIdx].domain = { data: "data_0", fields: [{ signal: "x_domain" }] };
			}
			if (yIdx != -1) {
				originalScales[yIdx].range = [{ signal: "child_height" }, 0];
				originalScales[yIdx].domain = { data: "data_0", fields: [{ signal: "y_domain" }] };
			}
			// console.log("scales", originalScales);
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
									"expr": chartType == "stripy_uni"
										? `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"])`
										: `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"]) && isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
								}
							]
						},
						{
							"name": "column_domain",
							"source": "data_0",
							"transform": [
								{
									"type": "aggregate",
									"groupby": [vlSpec.encoding.column.field]
								}
							]
						},
						{
							"name": "row_domain",
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
						{
							"name": "child_height", 
							"update": chartType == "stripy_uni"
								? `${minSize}`
								: `max(${minSize}, min((${vertSpace} - 40 - ${interChartPad} * length(data('row_domain'))) / (length(data('row_domain')) + 2), ${defaultSize}))`
						},
						{
							"name": "x_domain", 
							"update": chartType == "stripx" || chartType == "barx" || chartType == "heatmap" 
								? `[${uniqueX}]`	
								// ? `sequence(${minX}, ${maxX + 1})`
								: `[${minX}, ${maxX}]`
						},
    					{
							"name": "y_domain", 
							"update": chartType == "stripy" || chartType == "bary" || chartType == "heatmap" 
								? `[${uniqueY}]`
								// ? `sequence(${minY}, ${maxY + 1})`
								: `[${minY}, ${maxY}]`
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
								"data": "row_domain"
							},
							"encode": {
								"update": {
									"height": {
										"signal": "child_height"
									}
								}
							},
							"axes": chartType == "stripy_uni"
								? []
								: [
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
									"labelAlign": (chartType == "stripx" || chartType == "barx" || chartType == "heatmap") 
										? "right"
										: "center",
      								"labelAngle": (chartType == "stripx" || chartType == "barx" || chartType == "heatmap") 
										? 270
										: 0,
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
								{"name": chartType.startsWith("stripx") ? "x_step" : "y_step", "value": stripSize},
          						{
									"name": chartType.startsWith("stripx") 
										? "width"
										: "height", // case chartType.startsWith("stripx") 
									"update": chartType == "stripx" 
										? "bandspace(domain('x').length, 1, 0.5) * x_step" 
										: chartType == "stripy"
											? "bandspace(domain('y').length, 1, 0.5) * y_step"
											: "20" // case chartType == "stripx_uni" || chartType == "stripy_uni"
								}
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
							"axes": chartType == "stripy_uni"
								? [
									{
										"scale": "x",
										"orient": "bottom",
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
									}
								]
								: [
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
							"fill": "color",
							"symbolType": chartType.startsWith("strip") 
								? "stroke"
								: chartType.startsWith("bar")
									? "square"
									: "circle",
							"title": "Model group",
							"encode": {
								"symbols": {
									"update": {
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
									"expr": chartType == "stripx_uni"
										? `isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
										: `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"]) && isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
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
						{
							"name": "child_width", 
							"update": chartType == "stripx_uni"
								? `${minSize}`
								: `max(${minSize}, min((${horzSpace} - 40 - ${interChartPad} * length(data('column_domain'))) / (length(data('column_domain')) + 2), ${defaultSize}))`
						},
						{"name": "child_height", "value": defaultSize},
						{
							"name": "x_domain", 
							"update": chartType == "stripx" || chartType == "barx" || chartType == "heatmap" 
								? `[${uniqueX}]`
								// ? `sequence(${minX}, ${maxX + 1})`
								: `[${minX}, ${maxX}]`
						},
    					{
							"name": "y_domain", 
							"update": chartType == "stripy" || chartType == "bary" || chartType == "heatmap" 
								? `[${uniqueY}]`	
								// ? `sequence(${minY}, ${maxY + 1})`
								: `[${minY}, ${maxY}]`
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
							"axes": chartType == "stripx_uni"
								? []
								: [
									{
										"scale": "x",
										"orient": "bottom",
										"grid": false,
										"title": vlSpec.encoding.x.field,
										"labelAlign": (chartType == "stripx" || chartType == "barx" || chartType == "heatmap") 
											? "right"
											: "center",
										"labelAngle": (chartType == "stripx" || chartType == "barx" || chartType == "heatmap") 
											? 270
											: 0,
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
								{"name": chartType.startsWith("stripx") ? "x_step" : "y_step", "value": stripSize},
          						{
									"name": chartType.startsWith("stripx") 
										? "width"
										: "height", // case chartType.startsWith("stripx") 
									"update": chartType == "stripx" 
										? "bandspace(domain('x').length, 1, 0.5) * x_step" 
										: chartType == "stripy"
											? "bandspace(domain('y').length, 1, 0.5) * y_step"
											: "20" // case chartType == "stripx_uni" || chartType == "stripy_uni"
								}
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
							"axes": chartType == "stripx_uni" 
								? [
									{
										"scale": "y",
										"orient": "left",
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
								: [
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
							"fill": "color",
							"symbolType": chartType.startsWith("strip") 
								? "stroke"
								: chartType.startsWith("bar")
									? "square"
									: "circle",
							"title": "Model group",
							"encode": {
								"symbols": {
									"update": {
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
			if (chartType == "stripx") {
				originalEncoding.width = {signal: "x_step"};
			} else if (chartType == "stripy") {
				originalEncoding.height = {signal: "y_step"};
			} else {
				originalEncoding.shape = {signal: "shape"};
			}
			// borrow scales from compiled spec, and modify them as needed
			let originalScales = vgSpec.scales.filter((elem) => (elem.name == "x" || elem.name == "y" || elem.name == "color")),
				xIdx = originalScales.findIndex((elem) => elem.name == "x"),
				yIdx = originalScales.findIndex((elem) => elem.name == "y");
			if (xIdx != -1) {
				originalScales[xIdx].range = [0, { signal: "child_width" }];
				originalScales[xIdx].domain = { data: "data_0", fields: [{ signal: "x_domain" }] };
			}
			if (yIdx != -1) {
				originalScales[yIdx].range = [{ signal: "child_height" }, 0];
				originalScales[yIdx].domain = { data: "data_0", fields: [{ signal: "y_domain" }] };
			}
			// console.log("scales", originalScales);
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
									"expr": chartType == "stripy_uni"
									? `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"])`
									: `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"]) && isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
								}
							]
						},
						{
							"name": "row_domain",
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
						{
							"name": "child_height", 
							"update": chartType == "stripy_uni"
								? `${minSize}`
								: `max(${minSize}, min((${vertSpace} - 40 - ${interChartPad} * length(data('row_domain'))) / (length(data('row_domain')) + 2), ${defaultSize}))`
						},
						{
							"name": "x_domain", 
							"update": chartType == "stripx" || chartType == "barx" || chartType == "heatmap" 
								? `[${uniqueX}]`
								// ? `sequence(${minX}, ${maxX + 1})`
								: `[${minX}, ${maxX}]`
						},
    					{
							"name": "y_domain", 
							"update": chartType == "stripy" || chartType == "bary" || chartType == "heatmap" 
								? `[${uniqueY}]`	
								// ? `sequence(${minY}, ${maxY + 1})`
								: `[${minY}, ${maxY}]`
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
							"from": {"data": "row_domain"},
							"sort": {
								"field": ["datum[\"modelcheck_group\"]"],
								"order": ["ascending"]
							},
							"encode": {"update": {"height": {"signal": "child_height"}}}
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
									"labelAlign": (chartType == "stripx" || chartType == "barx" || chartType == "heatmap") 
										? "right"
										: "center",
      								"labelAngle": (chartType == "stripx" || chartType == "barx" || chartType == "heatmap") 
										? 270
										: 0,
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
								{"name": chartType.startsWith("stripx") ? "x_step" : "y_step", "value": stripSize},
          						{
									"name": chartType.startsWith("stripx") 
										? "width"
										: "height", // case chartType.startsWith("stripx") 
									"update": chartType == "stripx" 
										? "bandspace(domain('x').length, 1, 0.5) * x_step" 
										: chartType == "stripy"
											? "bandspace(domain('y').length, 1, 0.5) * y_step"
											: "20" // case chartType == "stripx_uni" || chartType == "stripy_uni"
								}
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
							"axes": chartType == "stripy_uni"
							? [
								{
									"scale": "x",
									"orient": "bottom",
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
								}
							]
							: [
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
							"fill": "color",
							"symbolType": chartType.startsWith("strip") 
								? "stroke"
								: chartType.startsWith("bar")
									? "square"
									: "circle",
							"title": "Model group",
							"encode": {
								"symbols": {
									"update": {
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
									"expr": chartType == "stripx_uni" 
									? `isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
									: `isValid(datum[\"${vlSpec.encoding.x.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.x.field}\"]) && isValid(datum[\"${vlSpec.encoding.y.field}\"]) && isFinite(+datum[\"${vlSpec.encoding.y.field}\"])`
								}
							]
						},
						{
							"name": "column_domain",
							"source": "data_0",
							"transform": [{"type": "aggregate", "groupby": ["modelcheck_group"]}]
						}
					],
					"signals": [
						{
							"name": "child_width", 
							"update": chartType == "stripx_uni"
								? `${minSize}`
								: `max(${minSize}, min((${horzSpace} - 40 - ${interChartPad} * length(data('column_domain'))) / (length(data('column_domain')) + 2), ${defaultSize}))`
						},
						{"name": "child_height", "value": defaultSize},
						{
							"name": "x_domain", 
							"update": chartType == "stripx" || chartType == "barx" || chartType == "heatmap" 
								? `[${uniqueX}]`	
								// ? `sequence(${minX}, ${maxX + 1})`
								: `[${minX}, ${maxX}]`
						},
    					{
							"name": "y_domain", 
							"update": chartType == "stripy" || chartType == "bary" || chartType == "heatmap" 
								? `[${uniqueY}]`	
								// ? `sequence(${minY}, ${maxY + 1})`
								: `[${minY}, ${maxY}]`
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
							"from": {"data": "column_domain"},
							"encode": {"update": {"width": {"signal": "child_width"}}},
							"axes": chartType == "stripx_uni" 
							? []
							: [
								{
									"scale": "x",
									"orient": "bottom",
									"grid": false,
									"title": vlSpec.encoding.x.field,
									"labelAlign": (chartType == "stripx" || chartType == "barx" || chartType == "heatmap") 
										? "right"
										: "center",
      								"labelAngle": (chartType == "stripx" || chartType == "barx" || chartType == "heatmap") 
										? 270
										: 0,
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
								{"name": chartType.startsWith("stripx") ? "x_step" : "y_step", "value": stripSize},
          						{
									"name": chartType.startsWith("stripx") 
										? "width"
										: "height", // case chartType.startsWith("stripx") 
									"update": chartType == "stripx" 
										? "bandspace(domain('x').length, 1, 0.5) * x_step" 
										: chartType == "stripy"
											? "bandspace(domain('y').length, 1, 0.5) * y_step"
											: "20" // case chartType == "stripx_uni" || chartType == "stripy_uni"
								}
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
							"axes": chartType == "stripx_uni" 
							? [
								{
									"scale": "y",
									"orient": "left",
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
							: [
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
							"fill": "color",
							"symbolType": chartType.startsWith("strip") 
								? "stroke"
								: chartType.startsWith("bar")
									? "square"
									: "circle",
							"title": "Model group",
							"encode": {
								"symbols": {
									"update": {
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
		if (vgSpec.signals) {
			// child width and height
			let areColumns = vgSpec.data.filter((d) => d.name == "column_domain").length > 0,
				areRows = vgSpec.data.filter((d) => d.name == "row_domain").length > 0,
				childWidthIdx = vgSpec.signals.findIndex((d) => d.name == "child_width"),
				childHeightIdx = vgSpec.signals.findIndex((d) => d.name == "child_height");
			if (areColumns && (chartType == "stripx" || chartType == "barx")) {
				vgSpec.signals[childWidthIdx] = {"name": "child_width", "update": "bandspace(domain('x').length, 1, 0.5) * x_step"};
			} else if (areColumns) {
				vgSpec.signals[childWidthIdx] = {"name": "child_width", "update": `max(${minSize}, min((${horzSpace} - 40 - ${interChartPad} * length(data('column_domain'))) / (length(data('column_domain')) + 2), ${defaultSize}))`};
			}
			if (areRows && (chartType == "stripy"|| chartType == "bary")) {
				vgSpec.signals[childHeightIdx] = {"name": "child_height", "update": "bandspace(domain('y').length, 1, 0.5) * y_step"};
			// } else if (areColumns && chartType == "stripx_uni") {
			// 	// TODO: probably need hardcode signals at inner level of nested marks; not sure if this depends on columns only 
			// } else if (areRows && chartType == "stripy_uni") {
			// 	// TODO: probably need hardcode signals at inner level of nested marks; not sure if this depends on rows only
			} else if (areRows) {
				vgSpec.signals[childHeightIdx] = {"name": "child_height", "update": `max(${minSize}, min((${vertSpace} - 40 - ${interChartPad} * length(data('row_domain'))) / (length(data('row_domain')) + 2), ${defaultSize}))`};
			}
		}
		// // x/y domains
		// vgSpec.signals.push({
		// 	"name": "x_domain", 
		// 	"update": chartType == "stripx" || chartType == "barx" || chartType == "heatmap" 
		// 		? `sequence(${minX}, ${maxX + 1})`
		// 		: `[${minX}, ${maxX}]`
		// });
		// vgSpec.signals.push({
		// 	"name": "y_domain", 
		// 	"update": chartType == "stripy" || chartType == "bary" || chartType == "heatmap" 
		// 		? `sequence(${minY}, ${maxY + 1})`
		// 		: `[${minY}, ${maxY}]`
		// });
		// other settings:
		vgSpec.padding = 5;
		if (vgSpec.layout) {
			vgSpec.layout.padding = interChartPad;
		}
		if (vgSpec.width) {
			vgSpec.width = chartType.startsWith("stripx") ? minSize : defaultSize;
		}
		if (vgSpec.height) {
			vgSpec.height = chartType.startsWith("stripy") ? minSize : defaultSize;
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

	function getChartType() {
		if (vlSpec.encoding.x && vlSpec.encoding.y) {
			// bivariate charts
			if ((vlSpec.encoding.x.type == "nominal" || vlSpec.encoding.x.type == "ordinal") && vlSpec.encoding.y.type == "quantitative") {
				chartType = "stripx";
				horzSpace = horzSpace / 1.5;
				let xMult = distinctValues(dataset.table, vlSpec.encoding.x.field).length,
					colMult = vlSpec.encoding.column ? distinctValues(dataset.table, vlSpec.encoding.column.field).length : 1,
					modelMult = haveModelToShow ? distinctModelGroups.length : 1;
				stripSize = Math.min(stripSize, (horzSpace - 40 - interChartPad * colMult * modelMult) / (xMult * colMult * modelMult * 1.5));
			} else if ((vlSpec.encoding.y.type == "nominal" || vlSpec.encoding.y.type == "ordinal") && vlSpec.encoding.x.type == "quantitative") {
				chartType = "stripy";
				let yMult = distinctValues(dataset.table, vlSpec.encoding.y.field).length,
					rowMult = vlSpec.encoding.row ? distinctValues(dataset.table, vlSpec.encoding.row.field).length : 1,
					modelMult = haveModelToShow ? distinctModelGroups.length : 1;
				stripSize = Math.min(stripSize, (vertSpace - 40 - interChartPad * rowMult * modelMult) / (yMult * rowMult * modelMult * 1.5));
			} else if ((vlSpec.encoding.x.type == "nominal" || vlSpec.encoding.x.type == "ordinal") && (vlSpec.encoding.y.type == "nominal" || vlSpec.encoding.y.type == "ordinal")) {
				chartType = "heatmap";
				horzSpace = horzSpace / 1.5;
			} else if (vlSpec.encoding.x && (vlSpec.encoding.x.type == "nominal" || vlSpec.encoding.x.type == "ordinal") && vlSpec.encoding.y && vlSpec.encoding.y.aggregate) {
				chartType = "barx";
			} else if (vlSpec.encoding.y && (vlSpec.encoding.y.type == "nominal" || vlSpec.encoding.y.type == "ordinal") && vlSpec.encoding.x && vlSpec.encoding.x.aggregate) {
				chartType = "bary";
			} // else "scatterplot"
		} else {
			// univariate charts
			if (vlSpec.encoding.y && vlSpec.encoding.y.type == "quantitative") {
				chartType = "stripx_uni";
				horzSpace = horzSpace / 4;
			} else if (vlSpec.encoding.x && vlSpec.encoding.x.type == "quantitative") {
				chartType = "stripy_uni";
				vertSpace = vertSpace / 4;
			}
		}
		console.log("chart type", chartType);
		console.log("stripSize", stripSize);
		console.log("models", models);

		updateDataDomain(); // needs to know chart type, and should be recomputed when chart type is determined
	}

	function updateDataDomain() {
		// reset default values
		minX = Infinity;
		maxX = Number.NEGATIVE_INFINITY;
		uniqueX = [];
		minY = Infinity;
		maxY = Number.NEGATIVE_INFINITY;
		uniqueY = [];

		// min/max from individual records
		dataset.table.forEach((e) => {
			if (vlSpec.encoding.x && chartType != "stripx_uni" && chartType != "bary") { 
				// x variable exists, and is not an aggregate count
				if (e[vlSpec.encoding.x.field] < minX) {
					minX = e[vlSpec.encoding.x.field];
				}
				if (e[vlSpec.encoding.x.field] > maxX) {
					maxX = e[vlSpec.encoding.x.field];
				}
				if ((chartType == "stripx" || chartType == "barx" || chartType == "heatmap") && !uniqueX.includes(e[vlSpec.encoding.x.field])) {
					uniqueX.push(e[vlSpec.encoding.x.field]);
				}
			}
			if (vlSpec.encoding.y && chartType != "stripy_uni" && chartType != "barx") { 
				// y variable exists, and is not an aggregate count
				if (e[vlSpec.encoding.y.field] < minY) {
					minY = e[vlSpec.encoding.y.field];
				}
				if (e[vlSpec.encoding.y.field] > maxY) {
					maxY = e[vlSpec.encoding.y.field];
				}
				if ((chartType == "stripy" || chartType == "bary" || chartType == "heatmap") && !uniqueY.includes(e[vlSpec.encoding.y.field])) {
					uniqueY.push(e[vlSpec.encoding.y.field]);
				}
			}
		});

		// min/max from counts
		if (chartType == "bary") { 
			// compute max count to display on x axis; min = 0
			minX = 0;
			if (vlSpec.encoding.row && vlSpec.encoding.column) {
				maxX = maxGroupCount([vlSpec.encoding.y.field, vlSpec.encoding.row.field, vlSpec.encoding.column.field]);
			} else if (vlSpec.encoding.row) {
				maxX = maxGroupCount([vlSpec.encoding.y.field, vlSpec.encoding.row.field]);
			} else if (vlSpec.encoding.column) {
				maxX = maxGroupCount([vlSpec.encoding.y.field, vlSpec.encoding.column.field]);
			} else {
				maxX = maxGroupCount([vlSpec.encoding.y.field]);
			}
		} else if (chartType == "barx") { 
			// compute max count to display on y axis; min = 0
			minY = 0;
			if (vlSpec.encoding.row && vlSpec.encoding.column) {
				maxY = maxGroupCount([vlSpec.encoding.x.field, vlSpec.encoding.row.field, vlSpec.encoding.column.field]);
			} else if (vlSpec.encoding.row) {
				maxY = maxGroupCount([vlSpec.encoding.x.field, vlSpec.encoding.row.field]);
			} else if (vlSpec.encoding.column) {
				maxY = maxGroupCount([vlSpec.encoding.x.field, vlSpec.encoding.column.field]);
			} else {
				maxY = maxGroupCount([vlSpec.encoding.x.field]);
			}
		} else if (chartType == "stripx_uni") { 
			minX = 0; // placeholder values for non-existant scales
			maxX = 0;
		} else if (chartType == "stripy_uni") { 
			minY = 0; // placeholder values for non-existant scales
			maxY = 0;
		}

		uniqueX.sort();
		uniqueY.sort().reverse();

		console.log("x/y min/max", minX, maxX, uniqueX, minY, maxY, uniqueY);
	}

	function maxGroupCount(groupBySet) {
		// get counts per group
		let counts = dataset.table.reduce((r, row) => {
			// id for variable set intersection for current row
			let setId = "";
			groupBySet.forEach((field) => {
				setId += "_" + row[field];
			})
			// count how often we see this unique set
			r[setId] = ++r[setId] || 1;

			return r;
		}, {});

		// reformat JSON
		let setCounts = Object.keys(counts).map((key) => ({ "setId": key, "count": counts[key] }));

		// compute max count
		return setCounts.reduce((acc, set) => acc = acc > set.count ? acc : set.count, 0);
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
