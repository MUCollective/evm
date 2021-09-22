<script>
    import * as d3 from "d3";
	// import {default as vegaEmbed} from 'vega-embed';
	import * as vegaEmbed from 'vega-embed';
    import { onMount } from 'svelte';
	import { VegaLite } from "svelte-vega";

	var data = [30, 86, 168, 281, 303, 365];
	// var spec = "https://raw.githubusercontent.com/vega/vega/master/docs/examples/bar-chart.vg.json";
	
	let el;

	onMount(() => {
		d3.select(el)
			.selectAll("div")
			.data(data)
			.enter()
			.append("div")
			.style("width", function(d) {
				return d + "px";
			})
			.text(function(d) {
				return d;
			});

		vegaEmbed("#vis", spec, { actions: false }).catch(error => console.log(error) );
	});
</script>

<style>
	.chart :global(div) {
		font: 10px sans-serif;
		background-color: steelblue;
		text-align: right;
		padding: 3px;
		margin: 1px;
		color: white;
	}
</style>

<div bind:this={el} class="chart"></div>
<!-- <div id="vis"></div> -->