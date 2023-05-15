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
    import { mode } from "d3";
	// import type { forEach } from "vega-lite/build/src/encoding";

    import {notifications} from './notifications.js'
	import Toast from './Toast.svelte'

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
	// controls the rendering of drag and drop elements
	export let dndState: { id: string; name: string; items: any[] }[];
	export let flipDurationMs: number;
	export let originalDndState: { id: string; name: string; items: any[] }[];
	export let filters: any;
	export let transformations: any;
	export let models: any;
	export let showPredictionOrResidual = "prediction";
	export let showModelDescriptions = {};
	export let outcomeName: string;

	let prevSpec: VisualizationSpec = vlSpec;
	let displayHeight;
	let needDomainUpdate = false;

	let modelChecking = true; // AMK: for demo

    let userId = '';

    let ordinalSortIndex = {};

    let disableUserIdInput = false;

    const logSave = false; // AMK: for demo
    // const logSave = true;

    const logSaveUrl = uri => `https://evm-userstudy.ziyangguo.men${uri}` //`https://158.247.215.182:5000${uri}` //`http://127.0.0.1:8000${uri}`;

    const updateLogs = async (info) => {
        if (!logSave) {
            return;
        }
        console.log('update logs!')
        const current = new Date();
        return fetch(
            logSaveUrl('/add'),
            {
                method: 'POST',
                body: JSON.stringify({
                    userId,
                    'time': {
                        year: current.getFullYear(), 
                        month: current.getMonth() + 1, 
                        date: current.getDate(),
                        hour: current.getHours(),
                        minute: current.getMinutes(),
                        second: current.getSeconds()
                    },
                    'datasetName': dndState[0].name,
                    'modelChecking': modelChecking,
                    'modeling': modeling,
                    'vlSpec': vlSpec,
                    dndState,
                    filters,
                    transformations,
                    models,
                    showPredictionOrResidual,
                    info
                })
            }
        ).then(res => {
            console.log(res);
            return res.json()})
    }

	const datasetNameToPath = {
		'Cars': 'cars.json',
		'Forest fires': 'eval_forestfires.csv',
		'Students': 'all_students.csv', //'eval_students.csv'
		// TODO: Add housing dataset
	}

    const ordinalSortIndexPath = "./ordinal_sort_index.json";

	$: specChanged = 0;
	$: showLoadingIcon = false;
	$: transformations, updateStateTransforms();
	$: outcomeName, updateStateOutcome();

    // $: dndState, updateLogs();
    // $: modelChecking, updateLogs();
    // $: modeling, updateLogs();
    // $: vlSpec, updateLogs();
    // $: filters, updateLogs();
    // $: transformations, updateLogs();
    // $: models, updateLogs();
    // $: showPredictionOrResidual, updateLogs();

	function onChange(event) {
		showPredictionOrResidual = event.currentTarget.value;
		// console.log(showPredictionOrResidual);
	}

	const loadData = async (datasetName) => {
		const datasetPath = datasetNameToPath[datasetName];
		if (datasetPath.endsWith('.csv')) {
			const data = await d3.csv("./data/" + datasetPath, (d) => 
								 Object.assign({}, ...Object.keys(d).map(key => {
									if (!isNaN(d[key]) && !isNaN(parseFloat(d[key]))) {
										return {[key]: +d[key]};
									} else {
										return {[key]: d[key]};
									}
								})));
			return data;
		} else if (datasetPath.endsWith('.json')) {
			const data = await d3.json("./data/" + datasetPath);
			return data;
		}
	}

	const mountData = async () => {
		// load data
		// data = await d3.json("./data/cars.json");
		data = await loadData(dndState[0].name)
		// data = await d3.csv("./data/forestfires.csv");
		// data = await d3.json("./data/modelcheck.json"); // season hack
		// data = await d3.json("./data/misspec.json");
        console.log('test build and deploy')
		console.log("loaded data", data);
		dataChanged = data;
		dataChanged = [...dataChanged];
		for (let i = 0; i < dndState.length; ++i) {
			dndState[i].items = [];
		}
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
		displayHeight = window.innerHeight * 2 / 3;
		mounted = true;
		originalDndState = deepCopy(dndState);
		console.log("dndState", dndState);

		modeling = false;

		// modelChecking = false; // AMK: for demo

		specChanged = 0;
		showLoadingIcon = false;
		filters = []
		transformations = []
		models = []

		vlSpec = {
			$schema: "https://vega.github.io/schema/vega-lite/v5.json",
			description: "A simple bar chart with embedded data.",
			data: {
				name: "table",
			},
			mark: "tick",
			encoding: {
				// x: { field: "", type: "nominal" },
				// y: { field: "", type: "quantitative", aggregate: "mean" },
			},
			transform :[]
		}
        ordinalSortIndex = await d3.json(ordinalSortIndexPath);
        updateLogs('load dataset, ' + dndState[0].name)
	}

	onMount(async () => {
		await mountData();
	});

    function confirmUserId(newUserId) {
        userId = newUserId;
        disableUserIdInput = true;
        updateLogs(`start, userId: ${userId}`);
    }

	function changeDataset(datasetName) {
		dndState[0].name = datasetName;
		mountData();
	}

	function changeModelChecking() {
		modelChecking = !modelChecking;
		models = [];
		modeling = false;
        updateLogs(modelChecking ? 'turn on model checking' : 'turn off model checking')
	}

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

	/**
	* Shelf construction
	* start
	*/

	function handleDndConsider(shelfId: any, e: any) {
		const shelfIdx = dndState.findIndex((d) => d.id === shelfId);
		dndState[shelfIdx].items = e.detail.items;
		// console.log("in consider");
		// console.log(dndState);
		// console.log(dndState[shelfIdx]);
	}

	function handleDndFinalize(shelfId: any, e: any) {
		console.log("finalize");
		console.log("dnd state", dndState);
		console.log("shelfId", shelfId);
		console.log("e", e);
		const shelfIdx = dndState.findIndex((d) => d.id === shelfId);
		// when dropping variable on dataset shelf...
		if (e.srcElement.id == "variables") {
			// prevent "pills" from being treated as placeholder "shaddow items"
			dndState[shelfIdx].items.forEach((d) => {
				if (typeof d.isDndShadowItem != "undefined") {
					delete d.isDndShadowItem;
				}
			});
		} else { // when handling a variable on an encoding shelf...
			var varName = e.detail.items[0].name;
			// are we overwriting an encoding?
			if (dndState[shelfIdx].items[dndState[shelfIdx].items.length - 1].name != varName) {
				console.log("DO WE EVER GET HERE?", shelfId);
				// Delay the logic of replacing an encoding until after other drag events have finished
				// to avoid conflicting changes to dndState and vlSpec.
				setTimeout(() => {
					removeEncoding(shelfId, dndState[shelfIdx].items);
				}, 100);
			}
			// are we adding a new variable encoding?
			prevSpec = deepCopy(vlSpec);
			if (e.detail.items.length != 0) {
				var varType,
					varValues = data.map((row) => row[varName]),
					varUnique = [...new Set(varValues)],
					isVarNum = (typeof varUnique[0] == "number");
				if (isVarNum && varUnique.length > 9) {
					varType = "quantitative";
				} else if (isVarNum) {
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
					needDomainUpdate = true;
				}
				if (shelfId == "col-drop") {
					vlSpec.encoding.column = { field: e.detail.items[0].name };
					needDomainUpdate = true;
				}
			}
			determineChartType(vlSpec, varName);
			vlSpec = { ...vlSpec };
			specChanged++;
            updateLogs(`dnd finalize, shelf: [${e.srcElement.id}], variable: [${varName}]`)
		}
		// regardless of what else we do, we need to update dndState items
		dndState[shelfIdx].items = e.detail.items;
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
				// case heatmap
				vlSpec.mark = { type: "rect" };
				vlSpec.encoding.color = { 
					field: varName, 
					aggregate: "count", 
					scale: { 
						scheme: "greys"
						// range: ["#ffffff", "#1F77B4"] 
					}
				};
				vlSpec.config = { axis: { grid: true, tickBand: "extent" }};
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
				vlSpec.config = { axis: { grid: true, tickBand: "extent" }};
				if (!modeling) {
					// assume x-axis variable is outcome
					outcomeName = vlSpec.encoding.x.field
				}
			} else if (vlSpec.encoding.y && (vlSpec.encoding.y.type == "nominal" || vlSpec.encoding.y.type == "ordinal")) {
				// case bars along y-axis
				vlSpec.mark = { type: "bar", orient: "horizontal" };
				vlSpec.encoding.x = { field: varName, aggregate: "count" };
				vlSpec.config = { axis: { grid: true, tickBand: "extent" }};
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
			delete vlSpec.encoding.color;
			// delete vlSpec.encoding.row;    // need to leave row and col encodings
			// delete vlSpec.encoding.column;
			delete vlSpec.config;
		}
	}

	function removeEncoding(shelfId: any, items: any) {
		const shelfIdx = dndState.findIndex((d) => d.id === shelfId);
		let removedItem = dndState[shelfIdx].items.pop();
		dndState[0].items.push(removedItem);
		dndState = [...dndState];
		// console.log("after remove encoding", dndState);
		let remainingVarName; // argument for determiningChartType
		delete vlSpec.encoding.color; // clear colorscale (we'll add it back if needed)
		if (items.length > 0) {
			// replacing encoding on shelf
			if (shelfId == "x-drop") {
				if (vlSpec.encoding.y && vlSpec.encoding.y.aggregate) {
					vlSpec.encoding.y.field = items[0].name; // update aggregation for bar chart
				} 
			} else if (shelfId == "y-drop") {
				if (vlSpec.encoding.x && vlSpec.encoding.x.aggregate) {
					vlSpec.encoding.x.field = items[0].name; // update aggregation for bar chart
				}
			} else if (shelfId == "row-drop") {
				needDomainUpdate = true;
			} else if (shelfId == "col-drop") {
				needDomainUpdate = true;
			}
		} else {
			// removing encoding
			if (shelfId == "x-drop") {
				delete vlSpec.encoding.x;
				if (vlSpec.encoding.y && vlSpec.encoding.y.aggregate) {
					delete vlSpec.encoding.y; // clear aggregation for bar chart
				} 
				// remainingVarName = vlSpec.encoding.y
				// 	? vlSpec.encoding.y.field
				// 	: undefined;
			} else if (shelfId == "y-drop") {
				delete vlSpec.encoding.y;
				if (vlSpec.encoding.x && vlSpec.encoding.x.aggregate) {
					delete vlSpec.encoding.x; // clear aggregation for bar chart
				}
				// remainingVarName = vlSpec.encoding.x
				// 	? vlSpec.encoding.x.field
				// 	: undefined;
			} else if (shelfId == "row-drop") {
				delete vlSpec.encoding.row;
				needDomainUpdate = true;
			} else if (shelfId == "col-drop") {
				delete vlSpec.encoding.column;
				needDomainUpdate = true;
			}
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
			// delete vlSpec.encoding.color;
			// delete vlSpec.encoding.row;
			// delete vlSpec.encoding.column;
		}
		vlSpec = { ...vlSpec };
		specChanged++;
        updateLogs(`remove variable, shelf: [${shelfId}]`)
	}

	/**
	* Shelf construction
	* end
	*/

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
					// return entry[varToFilter] == conditionValue1;
					return conditionValue1.replace(/\s+/g, "").split(",").some((d) => d == entry[varToFilter]);
				} else {
					// return entry[varToFilter] != conditionValue1;
					return !conditionValue1.replace(/\s+/g, "").split(",").some((d) => d == entry[varToFilter]);
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
                updateLogs(`add filter, variable: [${varToFilter}] condition: [${includeOrExclude}] [${condition}] value: [${conditionValue1}] [${conditionValue2}]`)
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
                updateLogs(`remove filter, index: [${clearAll ? 'all' : index}]`)
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
                updateLogs(`add transformation, variable: [${transVar}] transform: [${transform}]`)
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
                updateLogs(`remove transformation, index: [${clearAll ? 'all' : index}]`)
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
	async function callModelcheck(data, outcomeName, calcResiduals) {
		console.log("calling server");
		console.log("models", models);
		console.log("data", data);
		console.log("outcome", outcomeName);
		console.log("resid", calcResiduals);

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
		showModelDescriptions[newModel.name] = true;
		
		// add the model to our queue
		models.push(newModel);
		models = [...models];
		modeling = true;

        const cachedOutcomeName = deepCopy(outcomeName);
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
				// modelData = modelData.filter((row) => row.draw === 1);
				dataModelOutput = [...modelData];
				// update dataChanged
				dataChanged = deepCopy(dataModelOutput).filter(
					(row) => !row.modelcheck_group.startsWith("res") //&& row.draw === 1
				);
				dataChanged = [...dataChanged];
				console.log(dataChanged);
				// update vlSpec
				showLoadingIcon = false;
				specChanged++;
                updateLogs(`add model, family: [${newModel.family}] mu_spec: [${newModel.mu_spec}] sigma_spec: [${newModel.sigma_spec}]`)
			})
			.catch(function (err) {
                modeling = models.length > 1;
                models = models.slice(0, -1);
                outcomeName = cachedOutcomeName;
                showLoadingIcon = false;
                notifications.danger('Adding a model failed, please check the parameters!', 2000)
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

	function removeOneModel(data, removedModel) {
		let  newData = data.filter(
			(row) => !(row.modelcheck_group == removedModel.name || row.modelcheck_group == ("res| " + removedModel.name))
		);
		return newData;
	}

	function removeModel(index, removeAll = false) {
		var modelTemp, 
			removedModel;
		// determine whether the model we are dropping is the only model to drop
		removeAll = models.length == 1
		if (removeAll) {
			// drop all models
			models = [];
			showModelDescriptions = {};
			modeling = false;
			// revert to data only
			dataChanged = removeModelOutputs();
			dataChanged = [...dataChanged];
			// console.log(dataChanged);
			// update spec
			let isHeatmap = (vlSpec.encoding.x && vlSpec.encoding.y) && (vlSpec.encoding.x.type == "nominal" || vlSpec.encoding.x.type == "ordinal") && (vlSpec.encoding.y.type == "nominal" || vlSpec.encoding.y.type == "ordinal");
			if (!isHeatmap) {
				delete vlSpec.encoding.color;
			}
			// delete vlSpec.encoding.xOffset;
			// delete vlSpec.encoding.yOffset;
			vlSpec = { ...vlSpec };
			specChanged++;
			return;
		} else {
			// remove selected model
			// console.log("models object", models);
			removedModel = models[index];
			if (index != 0) {
				modelTemp = models
					.slice(0, index)
					.concat(models.slice(index + 1, models.length));
			} else {
				modelTemp = models.slice(1);
			}
			delete showModelDescriptions[removedModel.name]
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
				dataChanged = removeOneModel(dataChanged, removedModel);
				dataChanged = [...dataChanged];

				dataModelOutput = removeOneModel(dataModelOutput, removedModel);
				dataModelOutput = [...dataModelOutput];				
				// console.log("after remove model data", dataChanged);

				specChanged++;
                updateLogs(`remove model, index: [${removeAll ? 'all' : index}]`)
			})
			.catch(function (err) {
				console.log(err);
			});
	}

	function showResiduals() {
		showLoadingIcon = true;
		needDomainUpdate = true;

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
                updateLogs('show residuals')
			})
			.catch(function (err) {
				console.log(err);
			});
		// specChanged++;
	}

	function hideResiduals() {
		showLoadingIcon = true;
		needDomainUpdate = true;

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
                updateLogs('hide residuals')
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
	<title>EVM</title>
	<!-- OpenCPU client library -->
	<script src="./script/jquery-3.6.0.js"></script>
	<script src="./script/opencpu-0.5.js"></script>
</svelte:head>

<main>
	<Header {name} {datasetNameToPath} {dndState} {changeDataset} {modelChecking} {changeModelChecking} {confirmUserId} {disableUserIdInput}/>
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
						{removeEncoding}
						{addFilter}
						{removeFilter}
						{addTransform}
						{removeTrans}
						{formatVariable}
					/>
				</Column>
				<Column style="width: 100%; height: {displayHeight}px" id="chart-canvas">
					{#if modeling}
						<label>
							<input
								checked={showPredictionOrResidual ===
									"prediction"}
								on:change={onChange}
								on:click={hideResiduals}
								type="radio"
								name="showPredictionOrResidual"
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
								name="showPredictionOrResidual"
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
								bind:needDomainUpdate
								bind:modeling
								bind:models
								{outcomeName}
                                {ordinalSortIndex}
							/>
						{/key}
					{/if}
				</Column>
				<!-- <div><button>save</button></div> -->
				<!-- <SaveOutput bind:dataChanged bind:vlSpec/> -->
				<!-- <button on:click={saveFile("data_and_spec")}></button> -->
				{#if modelChecking}
				<Column style="min-width: 250px; max-width: 250px;">
					<ModelPanel
						{models}
						{addModel}
						{removeModel}
						{formatVariable}
						{getVariableTransform}
						bind:showPredictionOrResidual
						bind:showModelDescriptions
						bind:outcomeName
					/>					
				</Column>
				{/if}
			</Row>
		</Grid>
	{/if}
    <Toast />
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
