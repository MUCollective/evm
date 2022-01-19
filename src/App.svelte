<script lang="ts">
	// from libraries
	import { Grid, Row, Column, RadioTile } from "carbon-components-svelte";
	import { onMount } from "svelte";
	import * as d3 from "d3";
	import type { VisualizationSpec } from "vega-embed";
	export let counter: number = 0;
	// app components
	import Header from "./Header.svelte";
	import DataPanel from "./DataPanel.svelte";
	import ChartPanel from "./ChartPanel.svelte";
	import EncodingPanel from "./EncodingPanel.svelte";
	import ModelPanel from "./ModelPanel.svelte";
	import { writable, get } from "svelte/store";
	import type { forEach } from "vega-lite/build/src/encoding";
	// props
	export let name: string;
	export let mounted: boolean;
	export let charting: boolean; // not used?
	export let modeling: boolean;
	// export const chartX = writable("origin");
	// props for Vega-Lite
	// data should be a {}[] format (pure dataset), this will be wrapped by {"table": data} in the ChartPanel component.
	export let data: any;
	export let dataChanged: any;
	export let dataTrans: any;
	export let vlSpec: VisualizationSpec;
	export let vlSpecModel: VisualizationSpec;
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
	export let filter: any;
	export let transformation: any;
	$: specChanged = 0;
	export let dataTransformed: any;
	export let models: any;
	// export let showModel: boolean;
	// showModel = false;
	let prevSpec: VisualizationSpec = vlSpec;

	export let residualList: any;
	console.log("PREV prevSpec", prevSpec);

	export let showPredictionOrResidual = "prediction";

	function onChange(event) {
		showPredictionOrResidual = event.currentTarget.value;
		console.log(showPredictionOrResidual);
	}

	onMount(async () => {
		// load data
		data = await d3.json("./data/cars.json");
		console.log("loaded data", data);
		dataChanged = data;
		dataChanged = [...dataChanged];
		dataTrans = data;
		dataTrans = [...dataTrans];
		// populate dropzone items with variable names from data
		Object.keys(data[0]).forEach((d, i) => {
			dndState[0].items.push({
				id: i, // gets overwritten by drag consider
				idx: i,
				name: d,
			});
		});
		mounted = true;
		originalDndState = deepCopy(dndState);
		console.log("originalDndState", originalDndState);
		console.log(dataChanged);
		console.log(
			"calculateEstimatesPerStudy calculateEstimatesPerStudy calculateEstimatesPerStudy"
		);
	});
	function handleDndConsider(shelfId: any, e: any) {
		const shelfIdx = dndState.findIndex((d) => d.id === shelfId);
		dndState[shelfIdx].items = e.detail.items;
	}
	function handleDndFinalize(shelfId: any, e: any) {
		if (e.srcElement.id != "variables") {
			const shelfIdx = dndState.findIndex((d) => d.id === shelfId);
			// 1 if x-row
			console.log(
				"current",
				dndState[shelfIdx].items[dndState[shelfIdx].items.length - 1]
					.name
			);
			var varName = e.detail.items[0].name;
			console.log("compare", varName);
			if (
				dndState[shelfIdx].items[dndState[shelfIdx].items.length - 1]
					.name != varName
			) {
				console.log("HERE !!!!!!!!!!!");
				console.log(dndState);
				encodingToData(
					dndState[shelfIdx].name,
					shelfId,
					dndState[shelfIdx].items
				);
				console.log("what about now !!!!!!!!!!!");
				console.log(dndState);
			}
			console.log(
				"before change dndState[shelfIdx].items",
				dndState[shelfIdx],
				dndState[shelfIdx].items
			);
			console.log("e.detail.items", e.detail.items);
			dndState[shelfIdx].items = e.detail.items;
			dndState = [...dndState];
			prevSpec = deepCopy(vlSpec);
			if (e.detail.items.length != 0) {
				var varSample = data[0][varName];
				console.log("varSample", varSample);
				console.log(data[0]);
				console.log(varName, data[0][varName]);
				var varType;
				if (typeof varSample == "number") {
					varType = "quantitative";
				} else if (typeof varSample == "string") {
					varType = "nominal";
				}
				const tempEncoding = {
					field: e.detail.items[0].name,
					type: varType,
				};
				if (varType == "nominal") {
					tempEncoding.aggregate = "count";
					vlSpec.mark = "bar";
				}
				console.log(tempEncoding);
				if (shelfId == "x-drop") {
					vlSpec.encoding.x = tempEncoding;
				}
				if (shelfId == "y-drop" && e.detail.items.length != 0) {
					vlSpec.encoding.y = tempEncoding;
				}
				if (shelfId == "row-drop") {
					vlSpec.encoding.row = { field: e.detail.items[0].name };
					console.log("facet", vlSpec);
				}
				if (shelfId == "col-drop") {
					vlSpec.encoding.column = { field: e.detail.items[0].name };
					console.log("facet", vlSpec);
				}
			}
			// continuous x continuous scatter plot
			if (vlSpec.encoding.x && vlSpec.encoding.y) {
				if (
					vlSpec.encoding.x.type == vlSpec.encoding.y.type &&
					vlSpec.encoding.x.type == "quantitative"
				) {
					vlSpec.mark = "point";
				}
			}
			vlSpec = { ...vlSpec };
			specChanged++;
			console.log("vlspec:", vlSpec);
		}
	}
	function changeMark(selected: any) {
		vlSpec.mark = selected;
		vlSpec = { ...vlSpec };
		specChanged++;
		console.log("CHANGING MARK,", selected, vlSpec);
	}
	function changeAggregation(aggr: any, shelfId: any) {
		if (shelfId == "x-drop" && typeof vlSpec.encoding.x != "undefined") {
			if (aggr == "none") {
				if (typeof vlSpec.encoding.x.aggregate != "undefined") {
					delete vlSpec.encoding.x.aggregate;
				}
			} else {
				vlSpec.encoding.x.aggregate = aggr;
			}
		} else if (
			shelfId == "y-drop" &&
			typeof vlSpec.encoding.y != "undefined"
		) {
			if (aggr == "none") {
				if (typeof vlSpec.encoding.y.aggregate != "undefined") {
					delete vlSpec.encoding.y.aggregate;
				}
			} else {
				vlSpec.encoding.y.aggregate = aggr;
			}
		} else if (
			shelfId == "col-drop" &&
			typeof vlSpec.encoding.column != "undefined"
		) {
			if (aggr == "none") {
				if (typeof vlSpec.encoding.column.aggregate != "undefined") {
					delete vlSpec.encoding.column.aggregate;
				}
			} else {
				vlSpec.encoding.column.aggregate = aggr;
			}
		} else if (
			shelfId == "row-drop" &&
			typeof vlSpec.encoding.row != "undefined"
		) {
			if (aggr == "none") {
				if (typeof vlSpec.encoding.row.aggregate != "undefined") {
					delete vlSpec.encoding.row.aggregate;
				}
			} else {
				vlSpec.encoding.row.aggregate = aggr;
			}
		}
		if (aggr == "sum") {
			vlSpec.mark = "bar";
		}
		if (
			typeof vlSpec.encoding.x != "undefined" &&
			typeof vlSpec.encoding.x.aggregate == "undefined" &&
			typeof vlSpec.encoding.y != "undefined" &&
			typeof vlSpec.encoding.y.aggregate == "undefined"
		) {
			if (vlSpec.encoding.x && vlSpec.encoding.y) {
				if (
					vlSpec.encoding.x.type == vlSpec.encoding.y.type &&
					vlSpec.encoding.x.type == "quantitative"
				) {
					vlSpec.mark = "point";
				}
			} else {
				vlSpec.mark = "tick";
			}
		}
		vlSpec = { ...vlSpec };
		specChanged++;
	}
	// var filterCount = 0;
	function filterData(
		varToFilter,
		includeOrExclude,
		condition,
		conditionValue1,
		conditionValue2
	) {
		// filterCount++;
		// filter.push(tempFilter);
		filter.push({
			variable: varToFilter,
			includeExclude: includeOrExclude,
			condition: condition,
			value1: conditionValue1,
			value2: conditionValue2,
		});
		filter = [...filter];
		console.log(filter);
		console.log(varToFilter);
		filter.forEach((f) => {
			console.log(f);
			filterHelper(
				f.variable,
				f.includeExclude,
				f.condition,
				f.value1,
				f.value2
			);
		});
		console.log(dataChanged);
		console.log(dndState);
		specChanged++;
	}
	function filterHelper(
		varToFilter,
		includeOrExclude,
		condition,
		conditionValue1,
		conditionValue2
	) {
		console.log("in filterhepler, dataChanged:", dataChanged);
		console.log(
			varToFilter,
			includeOrExclude,
			condition,
			conditionValue1,
			conditionValue2
		);
		dataChanged = dataChanged.filter(function (entry) {
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
		// dataChanged = newData;
		dataChanged = [...dataChanged];
		console.log(dataChanged);
	}
	function removeFilter(index, clearAll = false) {
		dataChanged = data;
		dataChanged = [...dataChanged];
		var filterTemp;
		if (clearAll) {
			filter = [];
		} else {
			console.log(filter);
			// var removedFilter = filter.splice(index, 1);
			var removedFilter = filter[index];
			if (index != 0) {
				console.log("filter.slice(0, index)", filter.slice(0, index));
				console.log(
					"filter.slice(index, filter.length)",
					filter.slice(index, filter.length)
				);
				filterTemp = filter
					.slice(0, index)
					.concat(filter.slice(index + 1, filter.length));
			} else {
				filterTemp = filter.slice(1);
			}
			console.log("filterTemp", filterTemp);
			console.log("filter", filter);
			Promise.all([filterTemp]).then((values) => {
				filterTemp = values[0];
				console.log("filterTemp", filterTemp);
				filter = [...filterTemp];
				console.log(filter);
				// filter = [...filter];
				console.log("removing", removedFilter);
				console.log("after removed, new filter", filter);
			});
			// filter = filterTemp;
			filter = [...filterTemp];
			console.log(filter);
			// filter = [...filter];
			console.log("removing", removedFilter);
			console.log("after removed, new filter", filter);
			console.log(dataChanged.length);
			dataChanged = data;
			dataChanged = [...dataChanged];
			console.log(data.length);
			console.log(dataChanged.length);
			if (filter.length != 0) {
				filter.forEach((f) => {
					filterData(
						f.variable,
						f.includeExclude,
						f.condition,
						f.value1,
						f.value2
					);
				});
			}
		}
		specChanged++;
	}
	function transformData(transVar, transform) {
		dataTrans = dataChanged;
		dataTrans = [...dataTrans];
		console.log("transVar", transVar, "transform", transform);
		transformation.push({
			variable: transVar,
			transformation: transform,
		});
		transformation = [...transformation];
		console.log(transformation);
		transformation.forEach((t) => {
			transformHelper(transVar, transform);
		});
		specChanged++;
	}
	function transformHelper(variable, t) {
		console.log("transformHelper");
		console.log(dataTrans[0]);
		var before = [];
		var after = [];
		dataTrans.forEach((e) => {
			// console.log('in for each loop', "e", e[variable]);
			if (t == "log") {
				if (typeof e[variable] == "number") {
					// dataTransformed.push({
					// 	variable: variable
					// });
					before.push(e[variable]);
					after.push(Math.log(e[variable]));
					e[variable] = Math.log(e[variable]);
				}
			}
		});
		dataTransformed[variable] = { before: before, after: after };
		console.log(dataTransformed);
		dataTrans = [...dataTrans];
		dataChanged = [...dataTrans];
	}
	function removeTrans(index, clearAll = false) {
		if (clearAll) {
		}
	}
	function removeModel(index, removeAll = false) {
		var modelTemp;
		if (removeAll) {
			models = [];
			modeling = false;
		} else {
			console.log(models);
			// var removedFilter = filter.splice(index, 1);
			var removedModel = models[index];
			if (index != 0) {
				console.log("filter.slice(0, index)", models.slice(0, index));
				console.log(
					"filter.slice(0, index-1)",
					models.slice(0, index - 1)
				);
				console.log(
					"filter.slice(index, filter.length)",
					models.slice(index, models.length)
				);
				modelTemp = models
					.slice(0, index)
					.concat(models.slice(index + 1, models.length));
				console.log("modelTemp", modelTemp);
			} else {
				modelTemp = models.slice(1);
				console.log("removing first one", modelTemp);
			}
		}
		Promise.all([modelTemp]).then((values) => {
			console.log("values", values);
			modelTemp = values[0];
			console.log("filterTemp", modelTemp);
			models = [...modelTemp];
			console.log(models);
			// filter = [...filter];
			console.log("removing", removedModel);
			console.log("after removed, new filter", models);
		});
		models = [...modelTemp];
		// showModel = false;
	}
	// call model on server
	async function callModel(mu, sigma = "~ 1", useData, model = "normal") {
		ocpu.seturl("//kalealex.ocpu.io/modelcheck/R");
		var url;
		if (model == "normal") {
			url = await ocpu.rpc("normal_model_check", {
				mu_spec: mu,
				sigma_spec: sigma,
				data: JSON.stringify(useData),
			});
		} else if (model == "ordinal") {
			url = await ocpu.rpc("ordinal_model_check", {
				mu_spec: mu,
				disp_spec: sigma,
				data: JSON.stringify(useData),
			});
		} else if (model == "multinomial") {
			url = await ocpu.rpc("multinomial_model_check", {
				spec: mu,
				data: JSON.stringify(useData),
			});
		} else {
			const model_name = model + "_model_check";
			console.log(model_name);
			url = await ocpu.rpc(model_name, {
				mu_spec: mu,
				data: JSON.stringify(useData),
			});
		}

		return url.split("\n")[0];
	}

	async function calculate_residuals(useData) {
		ocpu.seturl("//kalealex.ocpu.io/modelcheck/R");
		var url;
		console.log("in cal residual", useData);
		console.log(models);
		url = await ocpu.rpc("calc_residuals", {
			df: JSON.stringify(useData),
			outcome_name: "mpg",
		});
		return url.split("\n")[0];
	}

	// merge dataframes containing model results on server
	async function mergeModels(oldData, newData) {
		ocpu.seturl("//kalealex.ocpu.io/modelcheck/R");
		const url = await ocpu.rpc("merge_modelchecks", {
			df_old: JSON.stringify(oldData),
			df_new: JSON.stringify(newData),
		});
		return url.split("\n")[0];
	}

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

	// add model to the vis canvas
	async function addModel(mu, sigma, model = "normal") {
		showPredictionOrResidual = "prediction";
		if (residualList.length !== 0) {
			console.log("show not show residuals!!!");
		}
		// add the model to our queue
		models.push({
			exp: [mu, sigma, model],
		});
		models = [...models];
		modeling = true;
		// figure out what to do next based on current state
		// TODO: we probably also need an if to deal with the edge case where we need to rerun everything
		if (
			dataChanged[0].hasOwnProperty("modelcheck_group") &&
			dataChanged.some((row) => row.modelcheck_group !== "data")
		) {
			// data already contains model predictions...
			// filter other model predictions out of the dataset
			let dataOnly = deepCopy(dataChanged);
			dataOnly = dataOnly.filter(
				(row) => row.modelcheck_group === "data" && row.draw === 1
			);
			dataOnly = dataOnly.map((row) => {
				let obj = Object.assign({}, row);
				delete obj["mu.expectation"];
				delete obj["logitmu.expectation"];
				delete obj["logmu.expectation"];
				delete obj["se.expectation"];
				delete obj["logitmu.se"];
				delete obj["logse.expectation"];
				delete obj["logmu.se"];
				delete obj["logsigma.expectation"];
				delete obj["logsigma.se"];
				delete obj["df"];
				delete obj["se.residual"];
				delete obj["draw"];
				delete obj["t"];
				delete obj["x"];
				delete obj["t1"];
				delete obj["t2"];
				delete obj["mu"];
				delete obj["logitmu"];
				delete obj["logmu"];
				delete obj["sigma"];
				delete obj["logsigma"];
				delete obj["modelcheck_group"];
				return obj;
			});
			// console.log("does our filtering strategy work?");
			// console.log(dataOnly);

			// call the new model, and merge its results with dataChanged
			callModel(mu, sigma, dataOnly, model)
				.then(function (response) {
					console.log("this should be a url");
					console.log(response);
					return fetchData(response);
				})
				.then(function (modelData) {
					console.log(
						"this should be a the data with model predictions"
					);
					console.log(modelData);
					// merge old model data from dataChanged with new model data from modelData
					mergeModels(dataChanged, modelData)
						.then(function (response) {
							console.log("this should be a url");
							console.log(response);
							return fetchData(response);
						})
						.then(function (mergedData) {
							console.log(
								"this should be a the data with predictions from both old and new models"
							);
							console.log(mergedData);
							// update dataChanged
							mergedData = mergedData.filter(
								(row) => row.draw === 1
							);
							mergedData = [...mergedData];
							dataChanged = deepCopy(mergedData);
							dataChanged = [...dataChanged];
							// update vlSpec
							// TODO: eventually we need contingencies to deal with xOffset and yOffset
							// TODO: may need additional logic in case the previous spec still works, and we don't need to update vlSpec
							console.log("change vlSpec for model");
							console.log(vlSpec);
							vlSpec.encoding.color = vlSpec.encoding.color
								? vlSpec.encoding.color
								: { field: null };
							vlSpec.encoding.color.field = "modelcheck_group";

							// quant + nominal
							if (vlSpec.mark == "bar") {
								if (vlSpec.encoding.x.type == "nominal") {
									vlSpec.encoding.xOffset = vlSpec.encoding
										.xOffset
										? vlSpec.encoding.xOffset
										: { field: null };
									vlSpec.encoding.xOffset.field =
										"modelcheck_group";
								} else {
									vlSpec.encoding.yOffset = vlSpec.encoding
										.yOffset
										? vlSpec.encoding.yOffset
										: { field: null };
									vlSpec.encoding.yOffset.field =
										"modelcheck_group";
								}
							}
							vlSpec = { ...vlSpec };
							console.log("after change");
							console.log(vlSpec);
							specChanged++;
						})
						.catch(function (err) {
							console.log(err);
						});
				})
				.catch(function (err) {
					console.log(err);
				});
		} else {
			// data contains NO model predictions...
			// call the new model
			callModel(mu, sigma, dataChanged, model)
				.then(function (response) {
					console.log("this should be a url");
					console.log(response);
					return fetchData(response);
				})
				.then(function (modelData) {
					console.log(
						"this should be a the data with model predictions"
					);
					console.log(modelData);
					modelData = modelData.filter((row) => row.draw === 1);
					modelData = [...modelData];
					// update dataChanged
					dataChanged = deepCopy(modelData);
					dataChanged = [...dataChanged];
					// update vlSpec
					// TODO: eventually we need contingencies to deal with xOffset and yOffset
					console.log("change vlSpec for model");
					console.log(vlSpec);
					vlSpec.encoding.color = vlSpec.encoding.color
						? vlSpec.encoding.color
						: { field: null };
					vlSpec.encoding.color.field = "modelcheck_group";

					vlSpec = { ...vlSpec };
					console.log("after change");
					console.log(vlSpec);
					specChanged++;
				})
				.catch(function (err) {
					console.log(err);
				});
		}

		if (typeof vlSpec.encoding.x == "undefined") {
			vlSpec.encoding.x = vlSpec.encoding.x
				? vlSpec.encoding.x
				: { field: null };
			vlSpec.encoding.x.field = "modelcheck_group";
		} else if (typeof vlSpec.encoding.y == "undefined") {
			vlSpec.encoding.y = vlSpec.encoding.y
				? vlSpec.encoding.y
				: { field: null };
			vlSpec.encoding.y.field = "modelcheck_group";
		}
		vlSpec = { ...vlSpec };
		specChanged++;
		console.log(dataChanged);
	}

	function showResidual() {
		console.log("residual!!!!!!!");
		// if (residualList.length !== 0) {
		// 	console.log("there are residuals");
		// 	console.log(models);
		// } else {
		calculate_residuals(dataChanged)
			.then(function (response) {
				console.log("this should be a url for residual");
				console.log(response);
				return fetchData(response);
			})
			.then(function (residualData) {
				console.log("this should be a the data with residual");
				console.log(residualData);
				// delete vlSpec.encoding.color;
				residualData = residualData.filter(
					(row) =>
						row.draw === 1 && row.modelcheck_group.startsWith("res")
				);
				residualData = [...residualData];
				const tempData = deepCopy(dataChanged);
				dataChanged = residualData;
				dataChanged = [...dataChanged];
				console.log("this should have only residuals");
				console.log(dataChanged);
				console.log(vlSpec.encoding.color);
				console.log(specChanged);
				specChanged++;
				console.log(specChanged);
				return tempData;
			})
			.then(function (tempData) {
				dataChanged = tempData;
				dataChanged = [...dataChanged];
				console.log(dataChanged);
			});
		// }

		console.log(vlSpec);
	}

	function unshowResidual() {
			console.log("unshowResidual");
			console.log(dataChanged);
			dataChanged = [...dataChanged];
			specChanged++;
		// }
	}

	function encodingToData(variable: any, shelfId: any, item: any) {
		console.log("variable", variable, "shelfId", shelfId, "item", item);
		console.log("before any changes", vlSpec.encoding);
		console.log(typeof dndState[0]);
		console.log(item);
		const shelfIdx = dndState.findIndex((d) => d.id === shelfId);
		console.log("why doesn't it change", dndState[shelfIdx]);
		dndState[shelfIdx].items = [];
		console.log(
			"?????",
			dndState[shelfIdx],
			"this should be empty",
			dndState[shelfIdx].items
		);
		console.log(dndState[0]);
		dndState[0].items.push(item[item.length - 1]);
		console.log("now?????", dndState[shelfIdx]);
		console.log(dndState);
		dndState = [...dndState];
		if (shelfId == "x-drop" || shelfId == "y-drop") {
			if (shelfId == "x-drop") {
				delete vlSpec.encoding.x;
			} else {
				delete vlSpec.encoding.y;
			}
			vlSpec.mark = "tick";
		}
		if (shelfId == "row-drop") {
			delete vlSpec.encoding.row;
		}
		if (shelfId == "col-drop") {
			delete vlSpec.encoding.column;
		}
		vlSpec = { ...vlSpec };
		specChanged++;
	}

	// filter, transform, model
	function orderOfOperation() {}

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
				<!-- TODO:
					+ add Vertical position (drop zone) with it's own shelf id ('y-drop')
					+ create a json state that controls what renders on all of the shelves, keeping track of items across shelves
					+ programmatically generate drop zones from a json spec
					+ figure out why drop zones don't work, why trigger is always "droppedOutsideOfAny" 
						(problem was that drop zones had no height; added css below to fix)
					- link Chart to variables in drop zone
					- format drop zones and draggable blocks similar to Polestar
					- use css to modify layout to roughly match Polestar, leaving room for the modeling sidebar on the right
				-->
				<Column style="min-width: 220px; max-width: 220px;">
					<DataPanel
						{dndState}
						{flipDurationMs}
						{handleDndConsider}
						{handleDndFinalize}
					/>
				</Column>
				<Column style="min-width: 250px; max-width: 250px;">
					<EncodingPanel
						{dndState}
						{originalDndState}
						{flipDurationMs}
						{filter}
						{transformation}
						{handleDndConsider}
						{handleDndFinalize}
						{encodingToData}
						{changeMark}
						{changeAggregation}
						{filterData}
						{removeFilter}
						{transformData}
						{removeTrans}
					/>
				</Column>
				<Column style="width: 100%;">
					{#if modeling}
						<label>
							<input
								checked={showPredictionOrResidual ===
									"prediction"}
								on:change={onChange}
								on:click={unshowResidual}
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
								on:click={showResidual}
								type="radio"
								name="includeExclude"
								value="residual"
							/> residual
						</label>
					{/if}

					{#if Object.keys(vlSpec.encoding).length != 0}
						{#key specChanged}
							<ChartPanel
								bind:dataChanged
								bind:vlSpec
								bind:modeling
								bind:showPredictionOrResidual
							/>
						{/key}
					{/if}
				</Column>
				<Column style="min-width: 250px; max-width: 250px;">
					<ModelPanel
						{models}
						{addModel}
						{removeModel}
						bind:showPredictionOrResidual
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
