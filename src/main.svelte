<script>
    import Header from './Header.svelte';
    import ContGlobalExplain from './global-explanation/ContFeature.svelte';
    import CatGlobalExplain from './global-explanation/CatFeature.svelte';
    import InterContCatGlobalExplain from './global-explanation/InterContCatFeature.svelte';
    import InterContContGlobalExplain from './global-explanation/InterContContFeature.svelte';
    import InterCatCatGlobalExplain from './global-explanation/InterCatCatFeature.svelte';
    // import ToggleSwitch from './components/ToggleSwitch.svelte';
    // import ContextMenu from './components/ContextMenu.svelte';
    import Tooltip from './components/Tooltip.svelte';
  
  
    import { tooltipConfigStore } from './store';
  
    import * as d3 from 'd3';
    import { onMount } from 'svelte';
  // import { handle_promise } from 'svelte/internal';
  
    let data = null;
  
    // Set up tooltip
    let tooltip = null;
    let tooltipConfig = null;
    tooltipConfigStore.subscribe(value => {tooltipConfig = value;});
  
    // Set up feature selection
    let featuresSelected = [19, 61, 86], // 26, 3, 2, 81, 86, 89
      hopsId;
    // const updateFeatureSelection = () => {
    //   // console.log("new selection");
    //   var e = document.getElementById("feature-select");
    //   featuresSelected = e.value;
    // }
    
  
    /**
     * Pre-process the data loaded from a json file or passed from other sources
     * Sort the features based on their importance scores
     * @param {[object]} data An array of feature objects.
     * @return {[object]} processed data
     */
    // const processData = (data) => {
    //   data.features.sort((a, b) => b.importance - a.importance);
    //   return data;
    // };
  
    onMount(async () => {
      console.log('loading data');
      // let loadedData = await d3.json('/data/iow-house-ebm.json');
      data = await d3.json('/data/iow-house-ebm.json');
      // let loadedData = await d3.json('/data/medical-ebm.json');
      // loadedData = processData(loadedData);
      // data = loadedData;
      console.log('loaded data');
      console.log(data);
    });
  
  </script>
  
  <style>
  
    @import 'define';
    
    .main-standalone {
      display: flex;
      flex-direction: column;
    }
  
    .content {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 50px;
      padding: 30px 0 30px 0;
      justify-content: center;
      height: min(800px, calc(100vh - 50px));
      overflow-y: scroll;
      width: 100vw;
      box-sizing: border-box;
    }
    
  
  </style>
  
  <div class='main-standalone'>
    <div class='header'>
      <Header />
    </div>
  
    <Tooltip bind:this={tooltip}/>
  
    <!-- {#if data !== null}
      <label for="feature-select">Choose a feature to view:</label>
      <select name="feature-select" id="feature-select" on:blur={updateFeatureSelection}>
        {#each data.features as feature, index}
          {#if index === featuresSelected}
            <option value={index} selected>
              {index + ": " + feature.name + " (" + feature.type + ")"}
            </option>
          {:else}
            <option value={index}>
              {index + ": " + feature.name + " (" + feature.type + ")"}
            </option>
          {/if}
        {/each}
      </select>
    {/if} -->
  
    <div class='content'>    
      {#if data !== null} 
        {#each data.features as feature, index}
          {#if featuresSelected.some(d => d === index)}
            {#if feature.type === "categorical"}
              <div class='feature-window'>
                <CatGlobalExplain
                  featureData = {feature}
                  svgHeight = 200
                  uncertainty = "ensemble"
                />
              </div>
            {:else if feature.type === "continuous"}
              <div class='feature-window'>
                <ContGlobalExplain
                  featureData = {feature}
                  svgHeight = 200
                  uncertainty = "ensemble"
                  bind:hopsId = {hopsId}
                />
              </div>
            {:else if feature.type === "interaction"}
              {#if feature.type1 === "continuous" && feature.type2 === "continuous"}
                <div class='feature-window'>
                  <InterContContGlobalExplain
                    featureData = {feature}
                    svgHeight = 200
                    uncertainty = "dither"
                    bind:hopsId = {hopsId}
                  />
                </div>
              {:else if feature.type1 === "categorical" && feature.type2 === "categorical"}
                <div class='feature-window'>
                  <InterCatCatGlobalExplain
                    featureData = {feature}
                    svgHeight = 200
                    uncertainty = "dither"
                  />
                </div>          
              {:else}
                <div class='feature-window'>
                  <InterContCatGlobalExplain
                    featureData = {featuresSelected}
                    svgHeight = 200
                    chartType = 'bar'
                    uncertainty = "dither"
                  />
                </div>
              {/if}
            {/if}
          {/if}
        {/each}
      {/if}
    </div>
  
  </div>