<script lang="ts">
	// from libraries
	import { Grid, Row, Column, RadioTile } from "carbon-components-svelte";
	import { onMount } from "svelte";
	import * as d3 from "d3";
	import type { VisualizationSpec } from "vega-embed";
	// app components
	import Header from "./Header.svelte";
	import DataPanel from "./DataPanel.svelte";
	import ChartPanel from "./ChartPanel.svelte";
	import EncodingPanel from "./EncodingPanel.svelte";
	import ModelPanel from "./ModelPanel.svelte";
	// import SaveOutput from "./SaveOutput.svelte";
	import { writable, get } from "svelte/store";
	// import type { forEach } from "vega-lite/build/src/encoding";

	// props
	export let name: string;
	export let mounted: boolean;
	export let modeling: boolean;
	// props for Vega-Lite
	// data should be a {}[] format (pure dataset), this will be wrapped by {"table": data} in the ChartPanel component.
	export let data: any;
	export let dataChanged: any;
	export let dataModelOutput: any;
	export let vlSpec: VisualizationSpec;
	// export let vlSpecModel: VisualizationSpec;
	// export let facet: any;
	// should be a valid vega-lite spec
	// if you update "data", then the data set for the visualization is updated.
	// if you update "vlSpec", then the Vega-Lite spec is updated.
	// if you want multiple vega-lite visualizations, then make it into an array,
	// then duplicate "VegaLite" panel with the "vlSpec" argument changed.
	export const visUpdate = writable(vlSpec);
	// controls the rendering of drag and drop elements
	export let dndState: { id: string; name: string; items: any[] }[];
	export let flipDurationMs: number;
	export let originalDndState: { id: string; name: string; items: any[] }[];
	export let filters: any;
	export let transformations: any;
	export let models: any;
	export let showPredictionOrResidual = "prediction";
	export let outcomeName: string;

	let prevSpec: VisualizationSpec = vlSpec;
	// console.log("PREV prevSpec", prevSpec);

	$: specChanged = 0;
	$: showLoadingIcon = false;
	$: transformations, updateStateTransforms();
	$: outcomeName, updateStateOutcome();

	function onChange(event) {
		showPredictionOrResidual = event.currentTarget.value;
		// console.log(showPredictionOrResidual);
	}

	onMount(async () => {
		// load data
		data = await d3.json("./data/cars.json");
		// data = await d3.csv("./data/forestfires.csv");
		// data = await d3.json("./data/modelcheck.json"); // season hack
		// data = await d3.json("./data/misspec.json");
		console.log("loaded data", data);
		dataChanged = data;
		dataChanged = [...dataChanged];
		// populate dropzone items with variable names from data
		Object.keys(data[0]).forEach((d, i) => {
			dndState[0].items.push({
				id: i, // gets overwritten by drag consider
				idx: i,
				name: d,
				trans: "none",
				outcome: false,
			});
		});
		mounted = true;
		originalDndState = deepCopy(dndState);
	});

	function updateStateTransforms() {
		for (let i = 0; i < dndState.length; i++) { // shelves
			for (let j = 0; j < dndState[i].items.length; j++) { // items w/in shelves
				let varName = dndState[i].items[j].name,
					appliedTrans = transformations.filter(t => t.variable == varName);
				if (appliedTrans.length == 0) {
					dndState[i].items[j].trans = "none";
				} else {
					dndState[i].items[j].trans = appliedTrans[0].transformation;
				}
			}
		}	
	}

	function updateStateOutcome() {
		for (let i = 0; i < dndState.length; i++) { // shelves
			for (let j = 0; j < dndState[i].items.length; j++) { // items w/in shelves
				let test = dndState[i].items[j].name == outcomeName;
				dndState[i].items[j].outcome = test;
			}
		}	
	}

	function handleDndConsider(shelfId: any, e: any) {
		const shelfIdx = dndState.findIndex((d) => d.id === shelfId);
		dndState[shelfIdx].items = e.detail.items;
		// console.log("in consider");
		// console.log(dndState);
		// console.log(dndState[shelfIdx]);
	}

	function handleDndFinalize(shelfId: any, e: any) {
		// console.log("finalize");
		// console.log("shelfId", shelfId);
		// console.log("e", e);
		if (e.srcElement.id == "variables") {
			dndState[0].items.forEach((d) => {
				if (typeof d.isDndShadowItem != "undefined") {
					// console.log("shadow item");
					delete d.isDndShadowItem;
				}
			});
		}
		// console.log(dndState, "after change");
		if (e.srcElement.id != "variables") {
			const shelfIdx = dndState.findIndex((d) => d.id === shelfId);
			// console.log("handle dnd finalize");
			// console.log("dndState[shelfIdx].items");
			// console.log(dndState[shelfIdx].items);
			var varName = e.detail.items[0].name;
			if (
				dndState[shelfIdx].items[dndState[shelfIdx].items.length - 1]
					.name != varName
			) {
				encodingToData(
					dndState[shelfIdx].name,
					shelfId,
					dndState[shelfIdx].items
				);
			}
			dndState[shelfIdx].items = e.detail.items;
			dndState = [...dndState];
			prevSpec = deepCopy(vlSpec);
			if (e.detail.items.length != 0) {
				var varType,
					varValues = data.map((row) => row[varName]),
					varUnique = [...new Set(varValues)];
				// console.log(varName);
				// console.log("varUnique", varUnique);
				if (typeof varUnique[0] == "number" && varUnique.length > 9) {
					varType = "quantitative";
				} else if (typeof varUnique[0] == "number") {
					varType = "ordinal";
				} else {
					varType = "nominal";
				}

				const tempEncoding = {
					field: varName,
					type: varType,
				};

				if (shelfId == "x-drop") {
					vlSpec.encoding.x = tempEncoding;
				}
				if (shelfId == "y-drop" && e.detail.items.length != 0) {
					vlSpec.encoding.y = tempEncoding;
				}
				if (shelfId == "row-drop") {
					vlSpec.encoding.row = { field: e.detail.items[0].name };
				}
				if (shelfId == "col-drop") {
					vlSpec.encoding.column = { field: e.detail.items[0].name };
				}
			}
			determineChartType(vlSpec, varName);
			vlSpec = { ...vlSpec };
			specChanged++;
			// console.log("vlspec:", vlSpec);
		}
	}

	function determineChartType(vlSpec: VisualizationSpec, varName: string) {
		// determine marks for bivariate charts
		if (vlSpec.encoding.x && vlSpec.encoding.y) {
			if (vlSpec.encoding.x.type == vlSpec.encoding.y.type && vlSpec.encoding.x.type == "quantitative") {
				// case scatterplot
				// vlSpec.mark = { type: "point", size: 30, strokeWidth: 2 };
				vlSpec.mark = { type: "circle", size: 30 };
			} else if (vlSpec.encoding.x.type == "quantitative" && (vlSpec.encoding.y.type == "nominal" || vlSpec.encoding.y.type == "ordinal")) {
				// case strips along x-axis
				vlSpec.mark = { type: "tick", orient: "vertical" };
			} else if (vlSpec.encoding.y.type == "quantitative" && (vlSpec.encoding.x.type == "nominal" || vlSpec.encoding.x.type == "ordinal")) {
				// case strips along x-axis
				vlSpec.mark = { type: "tick", orient: "horizontal" };
			} else if ((vlSpec.encoding.x.type == "nominal" || vlSpec.encoding.x.type == "ordinal") && (vlSpec.encoding.y.type == "nominal" || vlSpec.encoding.y.type == "ordinal")) {
				// case 2d histogram
				vlSpec.mark = { type: "circle" };
				vlSpec.encoding.size = { field: varName, aggregate: "count" };
			}
			if (!modeling) {
				// assume y-axis variable is outcome
				outcomeName = vlSpec.encoding.y.field
			}
		// determine marks for univariate charts
		} else if ((vlSpec.encoding.x || vlSpec.encoding.y) && !(vlSpec.encoding.x && vlSpec.encoding.y)) {
			if (vlSpec.encoding.x && (vlSpec.encoding.x.type == "nominal" || vlSpec.encoding.x.type == "ordinal")) {
				// case bars along x-axis
				vlSpec.mark = { type: "bar", orient: "vertical" };
				vlSpec.encoding.y = { field: varName, aggregate: "count" };
				if (!modeling) {
					// assume x-axis variable is outcome
					outcomeName = vlSpec.encoding.x.field
				}
			} else if (vlSpec.encoding.y && (vlSpec.encoding.y.type == "nominal" || vlSpec.encoding.y.type == "ordinal")) {
				// case bars along y-axis
				vlSpec.mark = { type: "bar", orient: "horizontal" };
				vlSpec.encoding.x = { field: varName, aggregate: "count" };
				if (!modeling) {
					// assume y-axis variable is outcome
					outcomeName = vlSpec.encoding.y.field
				}
			} else if (vlSpec.encoding.y && vlSpec.encoding.y.type == "quantitative") {
				// case strips along y-axis
				vlSpec.mark = { type: "tick", orient: "horizontal" };
				if (!modeling) {
					// assume y-axis variable is outcome
					outcomeName = vlSpec.encoding.y.field
				}
			} else if (vlSpec.encoding.x && vlSpec.encoding.x.type == "quantitative") {
				// case strips along x-axis
				vlSpec.mark = { type: "tick", orient: "vertical" };
				if (!modeling) {
					// assume x-axis variable is outcome
					outcomeName = vlSpec.encoding.x.field
				}
			}
		// otherwise don't show anything
		} else {
			// reset
			vlSpec.mark = "tick";
			delete vlSpec.encoding.x;
			delete vlSpec.encoding.y;
			delete vlSpec.encoding.size;
			delete vlSpec.encoding.color;
			delete vlSpec.encoding.row;
			delete vlSpec.encoding.column;
		}
	}

	// function changeMark(selected: any) {
	// 	vlSpec.mark = selected;
	// 	vlSpec = { ...vlSpec };
	// 	specChanged++;
	// }

	// function changeAggregation(aggr: any, shelfId: any) {
	// 	if (shelfId == "x-drop" && typeof vlSpec.encoding.x != "undefined") {
	// 		if (aggr == "none") {
	// 			if (typeof vlSpec.encoding.x.aggregate != "undefined") {
	// 				delete vlSpec.encoding.x.aggregate;
	// 			}
	// 		} else {
	// 			vlSpec.encoding.x.aggregate = aggr;
	// 		}
	// 	} else if (
	// 		shelfId == "y-drop" &&
	// 		typeof vlSpec.encoding.y != "undefined"
	// 	) {
	// 		if (aggr == "none") {
	// 			if (typeof vlSpec.encoding.y.aggregate != "undefined") {
	// 				delete vlSpec.encoding.y.aggregate;
	// 			}
	// 		} else {
	// 			vlSpec.encoding.y.aggregate = aggr;
	// 		}
	// 	} else if (
	// 		shelfId == "col-drop" &&
	// 		typeof vlSpec.encoding.column != "undefined"
	// 	) {
	// 		if (aggr == "none") {
	// 			if (typeof vlSpec.encoding.column.aggregate != "undefined") {
	// 				delete vlSpec.encoding.column.aggregate;
	// 			}
	// 		} else {
	// 			vlSpec.encoding.column.aggregate = aggr;
	// 		}
	// 	} else if (
	// 		shelfId == "row-drop" &&
	// 		typeof vlSpec.encoding.row != "undefined"
	// 	) {
	// 		if (aggr == "none") {
	// 			if (typeof vlSpec.encoding.row.aggregate != "undefined") {
	// 				delete vlSpec.encoding.row.aggregate;
	// 			}
	// 		} else {
	// 			vlSpec.encoding.row.aggregate = aggr;
	// 		}
	// 	}
	// 	if (aggr == "sum") {
	// 		vlSpec.mark = "bar";
	// 	}
	// 	if (
	// 		typeof vlSpec.encoding.x != "undefined" &&
	// 		typeof vlSpec.encoding.x.aggregate == "undefined" &&
	// 		typeof vlSpec.encoding.y != "undefined" &&
	// 		typeof vlSpec.encoding.y.aggregate == "undefined"
	// 	) {
	// 		if (vlSpec.encoding.x && vlSpec.encoding.y) {
	// 			if (
	// 				vlSpec.encoding.x.type == vlSpec.encoding.y.type &&
	// 				vlSpec.encoding.x.type == "quantitative"
	// 			) {
	// 				vlSpec.mark = "point";
	// 			}
	// 		} else {
	// 			vlSpec.mark = "tick";
	// 		}
	// 	}
	// 	vlSpec = { ...vlSpec };
	// 	specChanged++;
	// }

	/**
	* Filtering
	* start
	*/

	function applyFilter(d, varToFilter, includeOrExclude, condition, conditionValue1, conditionValue2) {
		d = d.filter(function (entry) {
			if (condition == "greater") {
				if (includeOrExclude == "include") {
					return entry[varToFilter] > conditionValue1;
				} else {
					return entry[varToFilter] <= conditionValue1;
				}
			} else if (condition == "greaterEqual") {
				if (includeOrExclude == "include") {
					return entry[varToFilter] >= conditionValue1;
				} else {
					return entry[varToFilter] < conditionValue1;
				}
			} else if (condition == "less") {
				if (includeOrExclude == "include") {
					return entry[varToFilter] < conditionValue1;
				} else {
					return entry[varToFilter] >= conditionValue1;
				}
			} else if (condition == "lessEqual") {
				if (includeOrExclude == "include") {
					return entry[varToFilter] <= conditionValue1;
				} else {
					return entry[varToFilter] > conditionValue1;
				}
			} else if (condition == "equal") {
				if (includeOrExclude == "include") {
					return entry[varToFilter] == conditionValue1;
				} else {
					return entry[varToFilter] != conditionValue1;
				}
			} else if (condition == "between") {
				if (includeOrExclude == "include") {
					return (
						conditionValue1 < entry[varToFilter] &&
						entry[varToFilter] < conditionValue2
					);
				} else {
					return (
						conditionValue1 > entry[varToFilter] &&
						entry[varToFilter] > conditionValue2
					);
				}
			}
		});
		d = [...d];
		return d;
	}

	function addFilter(varToFilter, includeOrExclude, condition, conditionValue1, conditionValue2) {
		// add filters to queue
		filters.push({
			variable: varToFilter,
			includeExclude: includeOrExclude,
			condition: condition,
			value1: conditionValue1,
			value2: conditionValue2,
		});
		
		// Promise all pattern
		Promise.all([filters])
			.then((values) => {
				// update data
				let temp = values[0];
				filters = [...temp];
				// console.log("filters after add filter", filters);
			})
			.then(() => {
				// reconcile state changes
				filterTransModel();
			})
			.catch(function (err) {
				console.log(err);
			});
	}

	function removeFilter(index, clearAll = false) {
		var filterTemp;
		clearAll = filters.length == 1;
		if (clearAll) {
			filterTemp = [];
		} else {
			// index of filter
			if (index != 0) {
				filterTemp = filters
					.slice(0, index)
					.concat(filters.slice(index + 1, filters.length));
			} else {
				filterTemp = filters.slice(1);
			}
		}
		Promise.all([filterTemp])
			.then((values) => {
				filterTemp = values[0];
				filters = [...filterTemp];
				// console.log("filters after remove filter", filters);
			})
			.then(() => {
				// reconcile state changes
				filterTransModel();
			})
			.catch(function (err) {
				console.log(err);
			});
	}

	/**
	* Filtering
	* end
	*/

	/**
	* Transforming
	* start
	*/

	function applyTransform(d, variable, trans) {
		let alerted = false;
		d = d.map(function (entry) {
			if (trans == "log") {
				if (entry[variable] < 0) {
					if (!alerted) {
						alert("You should not apply log transform to variables with values less than 0.\nOut of range values will be dropped from the dataset. Remove this transorm to revert to the original data.");
						alerted = true;
					}
					entry[variable] = NaN;
				} else {
					// nudge zeros
					entry[variable] = entry[variable] == 0 
						? 0.01
						: entry[variable];
					// transform
					entry[variable] = Math.log(entry[variable]);
				}
			} else if (trans == "logit") {
				if (entry[variable] < 0 || entry[variable] > 1) {
					if (!alerted) {
						alert("You should not apply log odds transform to variables with values out of the range [0, 1].\nOut of range values will be dropped from the dataset. Remove this transorm to revert to the original data.");
						alerted = true;
					}
					entry[variable] = NaN;
				} else {
					// nudge zeros and ones
					entry[variable] = entry[variable] == 0 
						? 0.01
						: entry[variable];
					entry[variable] = entry[variable] == 1 
						? 0.99
						: entry[variable];
					// transform
					entry[variable] = Math.log(entry[variable] / (1 - entry[variable]));
				}
			}
			return entry;
		}).filter(entry => !isNaN(entry[variable]));
		d = [...d];
		return d;
	}

	function addTransform(transVar, transform) {
		// console.log("adding transformation")
		transformations.push({
			variable: transVar,
			transformation: transform,
		});
		// Promise all pattern
		Promise.all([transformations])
			.then((values) => {
				// update data
				let temp = values[0];
				transformations = [...temp];
				// console.log("transformations after add tranform", transformations);
			})
			.then(() => {
				// reconcile state changes
				filterTransModel();
			})
			.catch(function (err) {
				console.log(err);
			});
	}

	function removeTrans(index, clearAll = false) {
		var transTemp;
		clearAll = transformations.length == 1;
		if (clearAll) {
			transTemp = [];
		} else {
			// index of transformation
			if (index != 0) {
				transTemp = transformations
					.slice(0, index)
					.concat(transformations.slice(index + 1, transformations.length));
			} else {
				transTemp = transformations.slice(1);
			}
		}
		Promise.all([transTemp])
			.then((values) => {
				transTemp = values[0];
				transformations = [...transTemp];
				// console.log("transformations after remove transform", transformations);
			})
			.then(() => {
				// reconcile state changes
				filterTransModel();
			})
			.catch(function (err) {
				console.log(err);
			});
	}

	function formatVariable(varName, transform) {
		// console.log("format var", varName, transform);
		let c = (varName == outcomeName) ? "outcome" : "variable";
		if (transform == "none") {
			return `<span class=${c}>${varName}</span>`;
		} else {
			return `<span class="transform">${transform}(</span><span class=${c}>${varName}</span><span class="transform">)</span>`;
		}
	}

	function getVariableTransform(varName) {
        let trans = transformations.filter(t => t.variable == varName);
        if (trans.length == 0) {
            return "none";
        } else {
            return trans[0].transformation;
        }
    }

	/**
	* Transforming
	* end
	*/

	// run filters, transforms, and models in order to reconcile state changes
	function filterTransModel() {
		// reset data
		let tempData = deepCopy(data);
		showLoadingIcon = true;
		Promise.all([tempData])
			.then((values) => {
				tempData = values[0];
				dataChanged = [...tempData];
				// console.log("data after reset to original", dataChanged);
				// do we still need to filter, transform, or model?
				let finished = filters.length == 0 && transformations.length == 0 && models.length == 0; 
				if (finished) {
					showLoadingIcon = false;
					specChanged++; 
				}	
				return dataChanged;
			})
			.then((d) => {
				// apply filters
				return new Promise((resolve, reject) => {
					if (filters.length == 0) {
						resolve(d);
					} else {	
						filters.forEach((f) => {
							d = applyFilter(
								d,
								f.variable,
								f.includeExclude,
								f.condition,
								f.value1,
								f.value2
							);
						});
						dataChanged = [...d];
						// console.log("data after applying filters", dataChanged);
						// do we still need to transform or model?
						let finished = transformations.length == 0 && models.length == 0; 
						if (finished) {
							showLoadingIcon = false;
							specChanged++; 
						}
						resolve(dataChanged);
					}
					reject("Problem applying filters");
				});
			})
			.then((d) => {
				// apply transforms
				return new Promise((resolve, reject) => {
					if (transformations.length == 0) {
						resolve(d);
					} else {	
						transformations.forEach((t) => {
							d = applyTransform(
								d,
								t.variable,
								t.transformation
							);
						});
						dataChanged = [...d];
						// console.log("data after applying transformations", dataChanged);
						// do we still need to model?
						let finished = models.length == 0; 
						if (finished) {
							showLoadingIcon = false;
							specChanged++; 
						}							
						resolve(dataChanged);
					}
					reject("Problem applying transformations");
				});
			})
			.then((d) => {
				// apply models
				if (models.length != 0) {
					// console.log("rerunning models to reconcile state changes");
					// get outcome name
					outcomeName = models[0].name.substring(models[0].name.indexOf("|") + 1, models[0].name.indexOf("~")).trim();
					// call server to run models
					callModelcheck(d, outcomeName, true) // hardcoded `true' means calc residuals by default
						.then(function (response) {
							// showLoadingIcon = true;
							// console.log("this should be a url");
							// console.log(response);
							return fetchData(response);
						})
						.then(function (modelData) {
							// console.log("this should be a the data with model predictions");
							// console.log(modelData);
							// modelData = modelData.filter((row) => row.draw === 1);
							dataModelOutput = [...modelData];
							// update dataChanged
							dataChanged = deepCopy(dataModelOutput).filter(
								(row) => !row.modelcheck_group.startsWith("res") //&& row.draw === 1
							);
							dataChanged = [...dataChanged];
							// update vlSpec, definitely finished now
							showLoadingIcon = false;
							specChanged++;
						})
						.catch(function (err) {
							console.log(err);
						});
				}
				// specChanged++;
			})
			.catch(function (err) {
				console.log(err);
			});
	}

    /**
	* Modeling
	* start
	*/

	// call main event handler for modeling
	async function callModelcheck(data, outcomeName, calcResiduals = true) {
		// console.log("calling server");
		// console.log("models", models);
		// console.log("data", data);

		showLoadingIcon = true; // do this for individual operations? NO, TOO MUCH LAG IN FEEDBACK

		// connect to server
		ocpu.seturl("//kalealex.ocpu.io/modelcheck/R");

		// call main event handler
		var url = await ocpu.rpc("add_model", {
			df: JSON.stringify(data),
			models: JSON.stringify(models),
			outcome_name: outcomeName,
			residuals: calcResiduals
		});

		return url.split("\n")[0];
	}

	// add model to the vis canvas
	// expects model object formated like this
	// {
	//	  name: "normal| mpg ~ 1| ~1",
	//    family: "normal",
	//    mu_spec: "mpg ~ 1",
    //    sigma_spec: "~1",
	// }
	// families that have no scale submodel should be NULL for sigma_spec
	async function addModel(newModel) {
		// console.log("adding model");
		showPredictionOrResidual = "prediction";
		
		// add the model to our queue
		models.push(newModel);
		models = [...models];
		modeling = true;

		// get outcome name
		outcomeName = newModel.name.substring(newModel.name.indexOf("|") + 1, newModel.name.indexOf("~")).trim();

		// make fresh copy of data to send to avoid async change conflicts
		let passData = deepCopy(dataChanged);

		// event handler will figure out what to do based on current state
		callModelcheck(passData, outcomeName, true) // hardcoded `true' means calc residuals by default
			.then(function (response) {
				// showLoadingIcon = true;
				// console.log("this should be a url");
				// console.log(response);
				return fetchData(response);
			})
			.then(function (modelData) {
				console.log("this should be a the data with model predictions");
				console.log(modelData);
				// modelData = modelData.filter((row) => row.draw === 1);
				dataModelOutput = [...modelData];
				// update dataChanged
				dataChanged = deepCopy(dataModelOutput).filter(
					(row) => !row.modelcheck_group.startsWith("res") //&& row.draw === 1
				);
				dataChanged = [...dataChanged];
				// update vlSpec
				showLoadingIcon = false;
				specChanged++;
			})
			.catch(function (err) {
				console.log(err);
			});
		// specChanged++; // not sure if this is necessary
	}

	// revert to data only
	function removeModelOutputs() {
		let dataOnly = deepCopy(dataChanged);
		dataOnly = dataOnly.filter(
			(row) => row.modelcheck_group === "data" && row.draw === 1
		);
		dataOnly = dataOnly.map((row) => {
			let obj = Object.assign({}, row);
			delete obj["draw"];
			delete obj["modelcheck_group"];
			return obj;
		});

		return dataOnly;
	}

	function removeModel(index, removeAll = false) {
		var modelTemp;
		// determine whether the model we are dropping is the only model to drop
		removeAll = models.length == 1
		if (removeAll) {
			// drop all models
			models = [];
			modeling = false;
			// revert to data only
			dataChanged = removeModelOutputs();
			dataChanged = [...dataChanged];
			// console.log(dataChanged);
			// update spec
			delete vlSpec.encoding.color;
			// delete vlSpec.encoding.xOffset;
			// delete vlSpec.encoding.yOffset;
			vlSpec = { ...vlSpec };
			specChanged++;
			return;
		} else {
			// remove selected model
			// console.log("models object", models);
			var removedModel = models[index];
			if (index != 0) {
				modelTemp = models
					.slice(0, index)
					.concat(models.slice(index + 1, models.length));
			} else {
				modelTemp = models.slice(1);
			}
		}
		// if removing one model but keeping others
		Promise.all([modelTemp, removedModel])
			.then((values) => {
				// update global models queue
				[modelTemp, removedModel] = values;
				models = [...modelTemp];
				// console.log("models after promise", models);
				// console.log("removed model", removedModel);
				return removedModel;
			})
			.then(function (removedModel) {
				// console.log("deleting models");
				dataChanged = dataChanged.filter(
					(row) => !(row.modelcheck_group == removedModel.name || row.modelcheck_group == ("res| " + removedModel.name))
				);
				dataChanged = [...dataChanged];
				// console.log("after remove model data", dataChanged);

				specChanged++;
			})
			.catch(function (err) {
				console.log(err);
			});
	}

	function showResiduals() {
		showLoadingIcon = true;

		// update dataChanged
		dataChanged = deepCopy(dataModelOutput).filter(
			(row) => row.modelcheck_group.startsWith("res") //&& row.draw === 1
		);

		Promise.all([dataChanged])
			.then((values) => {
				// update data
				let temp = values[0];
				dataChanged = [...temp];
				// console.log("data after show residuals filter", dataChanged);
				// update chart
				showLoadingIcon = false;
				specChanged++;
			})
			.catch(function (err) {
				console.log(err);
			});
		// specChanged++;
	}

	function hideResiduals() {
		showLoadingIcon = true;

		// update dataChanged
		dataChanged = deepCopy(dataModelOutput).filter(
			(row) => !row.modelcheck_group.startsWith("res") //&& row.draw === 1
		);
		
		Promise.all([dataChanged])
			.then((values) => {
				// update data
				let temp = values[0];
				dataChanged = [...temp];
				// console.log("data after hide residuals filter", dataChanged);
				// update chart
				showLoadingIcon = false;
				specChanged++;
			})
			.catch(function (err) {
				console.log(err);
			});
		// specChanged++;
	}

	/**
	* Modeling
	* end
	*/

	// // call model on server
	// async function callModel(mu, sigma = "~ 1", useData, model = "normal") {
	// 	console.log("calling server!!");

	// 	console.log(models.length);

	// 	console.log("mu:", mu, "data:", useData);
	// 	showLoadingIcon = true;
	// 	ocpu.seturl("//kalealex.ocpu.io/modelcheck/R");
	// 	var url;
	// 	if (model == "normal") {
	// 		url = await ocpu.rpc("normal_model_check", {
	// 			mu_spec: mu,
	// 			sigma_spec: sigma,
	// 			data: JSON.stringify(useData),
	// 		});
	// 	} else if (model == "ordinal") {
	// 		url = await ocpu.rpc("ordinal_model_check", {
	// 			mu_spec: mu,
	// 			disp_spec: sigma,
	// 			data: JSON.stringify(useData),
	// 		});
	// 	} else if (model == "multinomial") {
	// 		url = await ocpu.rpc("multinomial_model_check", {
	// 			spec: mu,
	// 			data: JSON.stringify(useData),
	// 		});
	// 	} else {
	// 		const model_name = model + "_model_check";
	// 		console.log(model_name);
	// 		url = await ocpu.rpc(model_name, {
	// 			mu_spec: mu,
	// 			data: JSON.stringify(useData),
	// 		});
	// 	}
	// 	return url.split("\n")[0];
	// }

	// async function calculate_residuals(useData) {
	// 	showLoadingIcon = true;
	// 	ocpu.seturl("//kalealex.ocpu.io/modelcheck/R");
	// 	var url;
	// 	console.log("in calc residual", useData);
	// 	console.log(models);
	// 	url = await ocpu.rpc("calc_residuals", {
	// 		df: JSON.stringify(useData),
	// 		outcome_name: "mpg",
	// 	});
	// 	return url.split("\n")[0];
	// }

	// // merge dataframes containing model results on server
	// async function mergeModels(oldData, newData) {
	// 	ocpu.seturl("//kalealex.ocpu.io/modelcheck/R");
	// 	const url = await ocpu.rpc("merge_modelchecks", {
	// 		df_old: JSON.stringify(oldData),
	// 		df_new: JSON.stringify(newData),
	// 	});
	// 	return url.split("\n")[0];
	// }

	// fetch data from open cpu given a url
	async function fetchData(url) {
		const newData = await fetch(
			"https://cloud.opencpu.org/" + url + "/json"
		)
			.then(function (response) {
				return response.json();
			})
			.then(function (result) {
				return JSON.parse(result.data);
			})
			.catch(function (err) {
				console.log(err);
			});
		return newData;
	}

	// function showResidual() {
	// 	console.log("residual!!!!!!!");
	// 	// if (residualList.length !== 0) {
	// 	// 	console.log("there are residuals");
	// 	// 	console.log(models);
	// 	// } else {
	// 	calculate_residuals(dataChanged)
	// 		.then(function (response) {
	// 			showLoadingIcon = true;
	// 			// console.log("this should be a url for residual");
	// 			// console.log(response);
	// 			return fetchData(response);
	// 		})
	// 		.then(function (residualData) {
	// 			console.log("this should be a the data with residual");
	// 			console.log(residualData);
	// 			// console.log("residual output", uniqueModelcheckGroups(residualData));
	// 			// delete vlSpec.encoding.color;
	// 			residualData = residualData.filter(
	// 				(row) => row.modelcheck_group.startsWith("res") //&& row.draw === 1
	// 			);
	// 			residualData = [...residualData];
	// 			// console.log("residual after filter", uniqueModelcheckGroups(residualData));
	// 			const tempData = deepCopy(dataChanged);
	// 			dataChanged = residualData;
	// 			dataChanged = [...dataChanged];
	// 			// console.log("residual after reassignment to dataChanged", uniqueModelcheckGroups(dataChanged));
	// 			console.log("this should have only residuals");
	// 			console.log(dataChanged);
	// 			// console.log(vlSpec.encoding.color);
	// 			// console.log(specChanged);
	// 			showLoadingIcon = false;
	// 			specChanged++;
	// 			// console.log(specChanged);
	// 			// console.log("data object in vlSpec", vlSpec.data);
	// 			return tempData;
	// 		})
	// 		.then(function (tempData) {
	// 			dataChanged = tempData;
	// 			dataChanged = [...dataChanged];
	// 			// console.log("restored dataChanged from tempData", uniqueModelcheckGroups(dataChanged));
	// 			// console.log(dataChanged);
	// 		});
	// 	// }
	// 	console.log(vlSpec);
	// }

	// function unshowResidual() {
	// 	console.log("unshowResidual");
	// 	console.log(dataChanged);
	// 	dataChanged = [...dataChanged];
	// 	showLoadingIcon = false;
	// 	specChanged++;
	// 	// }
	// }

	function encodingToData(variable: any, shelfId: any, item: any) {
		// console.log("variable", variable, "shelfId", shelfId, "item", item);
		// console.log("before any changes", vlSpec.encoding);
		// console.log(typeof dndState[0]);
		// console.log(item);
		const shelfIdx = dndState.findIndex((d) => d.id === shelfId);
		// console.log("why doesn't it change", dndState[shelfIdx]);
		dndState[shelfIdx].items = [];
		// console.log(
		// 	"?????",
		// 	dndState[shelfIdx],
		// 	"this should be empty",
		// 	dndState[shelfIdx].items
		// );
		// console.log(dndState[0]);
		dndState[0].items.push(item[item.length - 1]);
		// console.log("now?????", dndState[shelfIdx]);
		// console.log(dndState);
		dndState = [...dndState];
		let remainingVarName; // for determining chart type
		delete vlSpec.encoding.size; // clear aggregation 2d histogram (we'll add it back if needed)
		if (shelfId == "x-drop") {
			delete vlSpec.encoding.x;
			if (vlSpec.encoding.y && vlSpec.encoding.y.aggregate) {
				delete vlSpec.encoding.y; // clear aggregation for bar chart
			}
			remainingVarName = vlSpec.encoding.y
				? vlSpec.encoding.y.field
				: undefined;
			// vlSpec.mark = "tick";
		} else if (shelfId == "y-drop") {
			delete vlSpec.encoding.y;
			if (vlSpec.encoding.x && vlSpec.encoding.x.aggregate) {
				delete vlSpec.encoding.x; // clear aggregation for bar chart
			}
			remainingVarName = vlSpec.encoding.x
				? vlSpec.encoding.x.field
				: undefined;
			// vlSpec.mark = "tick";
		}
		if (shelfId == "row-drop") {
			delete vlSpec.encoding.row;
		}
		if (shelfId == "col-drop") {
			delete vlSpec.encoding.column;
		}
		if (!remainingVarName) {
			remainingVarName = vlSpec.encoding.y
				? vlSpec.encoding.y.field
				: vlSpec.encoding.x
				? vlSpec.encoding.x.field
				: undefined;
		}
		if (remainingVarName) {
			determineChartType(vlSpec, remainingVarName);
		} else {
			// reset
			vlSpec.mark = "tick";
			delete vlSpec.encoding.x;
			delete vlSpec.encoding.y;
			delete vlSpec.encoding.size;
			delete vlSpec.encoding.color;
			delete vlSpec.encoding.row;
			delete vlSpec.encoding.column;
		}
		vlSpec = { ...vlSpec };
		specChanged++;
	}

	function deepCopy(inObject) {
		let outObject, value, key;
		if (typeof inObject !== "object" || inObject === null) {
			return inObject; // Return the value if inObject is not an object
		}
		// Create an array or object to hold the values
		outObject = Array.isArray(inObject) ? [] : {};
		for (key in inObject) {
			value = inObject[key];
			// Recursively (deep) copy for nested objects, including arrays
			outObject[key] = deepCopy(value);
		}
		return outObject;
	}
	// function uniqueModelcheckGroups(dataObj) {
	// 	var lookup = {};
	// 	var result = [];
	// 	for (var item, i = 0; item = dataObj[i++];) {
	// 		var name = item.modelcheck_group;
	// 		if (!(name in lookup)) {
	// 			lookup[name] = 1;
	// 			result.push(name);
	// 		}
	// 	}
	// 	return result;
	// }

	// function saveFile(fileName) {
	//     // var a = document.createElement("a");
	//     // a.href = file;
	//     // a.setAttribute("download", fileName);
	//     // a.click();
	//     console.log("what????");
	//     var output = [];
	//     output["data"] = JSON.stringify(dataChanged);
	//     output["spec"] = JSON.stringify(vlSpec);
	//     console.log(output);
	//     // var bb = new Blob(output, { type: 'text/plain' });
	//     // var a = document.createElement('a');
	//     // a.download = fileName + '.json';
	//     // a.href = window.URL.createObjectURL(bb);
	//     // a.textContent = 'Download ready';
	//     // a.click();
	// }
</script>

<svelte:head>
	<!-- OpenCPU client library -->
	<script src="./script/jquery-3.6.0.js"></script>
	<script src="./script/opencpu-0.5.js"></script>
</svelte:head>

<main>
	<Header {name} />
	{#if mounted}
		<Grid fullWidth>
			<Row style="display: flex; flex-wrap: nowrap;">
				<Column style="min-width: 220px; max-width: 220px;">
					<DataPanel
						{dndState}
						{flipDurationMs}
						{handleDndConsider}
						{handleDndFinalize}
						{formatVariable}
					/>
				</Column>
				<Column style="min-width: 250px; max-width: 250px;">
					<EncodingPanel
						{dndState}
						{originalDndState}
						{flipDurationMs}
						{filters}
						{transformations}
						{handleDndConsider}
						{handleDndFinalize}
						{encodingToData}
						{addFilter}
						{removeFilter}
						{addTransform}
						{removeTrans}
						{formatVariable}
					/>
				</Column>
				<Column style="width: 100%;" id="chart-canvas">
					{#if modeling}
						<label>
							<input
								checked={showPredictionOrResidual ===
									"prediction"}
								on:change={onChange}
								on:click={hideResiduals}
								type="radio"
								name="includeExclude"
								value="prediction"
							/> prediction
						</label>
						<label>
							<input
								checked={showPredictionOrResidual ===
									"residual"}
								on:change={onChange}
								on:click={showResiduals}
								type="radio"
								name="includeExclude"
								value="residual"
							/> residual
						</label>
					{/if}

					{#if Object.keys(vlSpec.encoding).length != 0}
						{#if showLoadingIcon}
							<!-- <p style="font-style: italic;">
								updating visualization...
							</p> -->
							<img src="./preloader.gif" alt="loading changes">
						{/if}

						{#key specChanged}
							<ChartPanel
								bind:dataChanged
								bind:vlSpec
								bind:modeling
								bind:models
								{outcomeName}
							/>
						{/key}
					{/if}
				</Column>
				<!-- <div><button>save</button></div> -->
				<!-- <SaveOutput bind:dataChanged bind:vlSpec/> -->
				<!-- <button on:click={saveFile("data_and_spec")}></button> -->
				<Column style="min-width: 250px; max-width: 250px;">
					<ModelPanel
						{models}
						{addModel}
						{removeModel}
						{formatVariable}
						{getVariableTransform}
						bind:showPredictionOrResidual
						bind:outcomeName
					/>					
				</Column>
			</Row>
		</Grid>
	{/if}
</main>

<style>
	/* @import "define"; */
	:global(body) {
		margin: 0;
		padding: 0;
	}

	:global(.variable) {
        font-family: courier, "courier new", monospace;
        color: #3b3b3b;
        font-weight: bold;
    }

	:global(.outcome) {
        font-family: courier, "courier new", monospace;
        color: #FF7171;
        font-weight: bold;
    }

	:global(.transform) {
        font-family: courier, "courier new", monospace;
        color: #888888;
        font-weight: bold;
    }
	main {
		text-align: left;
		/* padding: 1em; */
		/* max-width: 240px; */
		margin: 0 auto;
		/* disable scrolling */
		/* overflow: hidden; */
	}
	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
