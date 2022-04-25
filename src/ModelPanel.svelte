<script lang="ts">
    // ui compoenets
    import { Grid, Row, Column, Button } from "carbon-components-svelte";
import App from "./App.svelte";
import Chart from "./Chart.svelte";

    // props
    // export let bootstrap: any;
    // export let model: any;

    export let models: any;
    export let addModel;
    export let removeModel;
    export let showPredictionOrResidual;

    let showAddingModel = false;
    let muSpec = "outcome ~ 1";
    let sigmaSpec = "~1";
    let modelFamily = "normal";
    let showModels = false;
    let outcomeName = "outcome";

    $: muSpec, getOutcomeName();

    function getOutcomeName() {
        outcomeName = muSpec.substring(muSpec.indexOf("|") + 1, muSpec.indexOf("~"));
        outcomeName = outcomeName.trim();
    }

    function formatPredictorsAsNaturalLanguage(spec) {
        let description;
        spec = spec.slice(spec.indexOf("~") + 1).trim();
        if (spec == "1")  {// intercept model
            description = "is constant and not impacted by any predictors";
        } else {
            description = "depends on "
            let terms = spec.split("+");
            for (let i = 0; i < terms.length; i++) {
                if (terms[i].includes("*")) {
                    // interaction term
                    description = description + "the interaction of "
                    let interactionTerms = terms[i].split("*");
                    console.log(interactionTerms);
                    for (let j = 0; j < interactionTerms.length; j++) {
                        description = description + `<span class="variable">${interactionTerms[j]}</span>`;
                        if (j == interactionTerms.length - 2) {
                            description = description + " and ";
                        } else if (j < interactionTerms.length - 2) {
                            description = description + ", ";
                        }
                    }
                } else {
                    // main effect term
                    description = description + `<span class="variable">${terms[i]}</span>`;
                }
                if (i == terms.length - 2) {
                    description = description + " and ";
                } else if (i < terms.length - 2) {
                    description = description + ", ";
                }
            }
        }
        return description;
    }

    // format model object from inputs, e.g.,
    // {
	//	  name: "normal| mpg ~ 1| ~1",
	//    family: "normal",
	//    mu_spec: "mpg ~ 1",
    //    sigma_spec: "~1",
	// }
    function formatModel(muSpec, sigmaSpec, modelFamily) {
        // families that have no scale submodel should be NULL for sigma_spec
        let sigmaStr = sigmaSpec;
        // if (!(modelFamily == "negbinomial" || modelFamily == "normal" || modelFamily == "ordinal")) {
        if (!(modelFamily == "negbinomial" || modelFamily == "normal")) {
            sigmaStr = ""
            sigmaSpec = null
        }

        return {
            name: modelFamily + "| " + muSpec + "| " + sigmaStr,
            family: modelFamily,
            mu_spec: muSpec,
            sigma_spec: sigmaSpec
        };
    }
</script>

<!-- model panel -->
<div class="model-panel card">
    <h3>Model</h3>

    <div class="add-and-clear" style="margin-top: 0px;">
        add
        <button class="single-char" on:click={() => (showAddingModel = true)}
            >+</button
        > 
        or remove
        <button on:click={removeModel(0, true)}>clear all</button>
    </div>
    {#if showAddingModel}
        pick a distribution family
        <select bind:value={modelFamily}>
            <option disabled selected value> -- select family -- </option>
            <option value="normal">normal</option>
            <option value="logistic">logistic</option>
            <!-- <option value="beta">beta</option> -->
            <option value="poisson">poisson</option>
            <option value="negbinomial">negative binominal</option>
            <!-- <option value="ordinal">ordinal model</option>
            <option value="multinomial">multinominal model</option> -->
        </select>
        <br />
        <!-- mu spec: <input bind:value={muSpec} style="padding: initial;" />
        {#if modelFamily == "negbinomial" || modelFamily == "normal"}
            <br />
                sigma spec: <input
                    bind:value={sigmaSpec}
                    style="padding: initial;"
                />
        {:else if modelFamily == "ordinal"}
            <br />
                disp spec: <input
                    bind:value={sigmaSpec}
                    style="padding: initial;"
                />
        {/if} -->
        {#if modelFamily == "normal"}
            mean of <span class="variable">{outcomeName}</span>: <input bind:value={muSpec} style="padding: initial;" />
            <br />
            std deviation of <span class="variable">{outcomeName}</span>: <input bind:value={sigmaSpec} style="padding: initial;" />
        {:else if modelFamily == "logistic"}
            log odds of <span class="variable">{outcomeName}</span>: <input bind:value={muSpec} style="padding: initial;" />
        <!-- {:else if modelFamily == "beta"} TODO: add beta regression
            expected proportion: <input bind:value={muSpec} style="padding: initial;" />
            <br />
            expected proportion: <input bind:value={sigmaSpec} style="padding: initial;" /> -->
        {:else if modelFamily == "poisson"}
            rate of <span class="variable">{outcomeName}</span>:<input bind:value={muSpec} style="padding: initial;" />
        {:else if modelFamily == "negbinomial"}
            rate of <span class="variable">{outcomeName}</span>: <input bind:value={muSpec} style="padding: initial;" />
            <br />
            dispursion in rate of <span class="variable">{outcomeName}</span>: <input bind:value={sigmaSpec} style="padding: initial;" />
        {/if}
        {#if muSpec}
            <button
                on:click={addModel(formatModel(muSpec, sigmaSpec, modelFamily))}
                on:click={() => (showAddingModel = false)}
                on:click={showPredictionOrResidual = "prediction"}
            >
                <!-- &#10003; -->
                Fit model
            </button>
        {/if}
    {/if}

    {#if models.length != 0}
        current model(s)
        {#each models as f, i}
            <div class="description">
                <div class="current">
                    {f.name}
                    <!-- distribution: {f.family}
                    <br />
                    {#if f.family == "normal"}
                        mean of {outcomeName}: {f.mu_spec}
                        <br />
                        std deviation of {outcomeName}: {f.sigma_spec}
                    {:else if f.family == "logistic"}
                        log odds of {outcomeName}: {f.mu_spec}
                    {:else if f.family == "poisson"}
                        rate of {outcomeName}: {f.mu_spec}
                    {:else if f.family == "negbinomial"}
                        rate of {outcomeName}: {f.mu_spec}
                        <br />
                        dispursion in rate of {outcomeName}: {f.sigma_spec}
                    {/if} -->
                    <button style="text-align: right;" class="single-char" on:click={removeModel(i)}
                        >&times;
                    </button>
                </div>
                <div>
                    This model assumes that:
                    {#if f.family == "normal"}
                        <ul style="margin: 1px;">
                            <li><span class="variable">{outcomeName}</span> is a continuous variable that can be modeled using a normal distribution</li>
                            <li>the mean of <span class="variable">{outcomeName}</span> {@html formatPredictorsAsNaturalLanguage(f.mu_spec)}</li>
                            <li>the standard deviation of <span class="variable">{outcomeName}</span> {@html formatPredictorsAsNaturalLanguage(f.sigma_spec)}</li>
                        </ul>
                    {:else if f.family == "logistic"}
                        <ul style="margin: 1px;">
                            <li><span class="variable">{outcomeName}</span> is a binary variable that can be modeled using a binomial distribution</li>
                            <li>the log odds of <span class="variable">{outcomeName}</span> {formatPredictorsAsNaturalLanguage(f.mu_spec)}</li>
                            <li>the standard deviation of residual log odds {formatPredictorsAsNaturalLanguage("~1")}</li>
                        </ul>
                    <!-- {:else if f.family == "beta"} TODO: add beta regression
                        expected proportion: {f.mu_spec}
                        <br />
                        expected proportion: {f.mu_spec} -->
                    {:else if f.family == "poisson"}
                        <ul style="margin: 1px;">
                            <li><span class="variable">{outcomeName}</span> is a count variable that can be modeled using a poisson distribution</li>
                            <li>the rate of <span class="variable">{outcomeName}</span> {formatPredictorsAsNaturalLanguage(f.mu_spec)}</li>
                            <li>the standard deviation of residual rates {formatPredictorsAsNaturalLanguage("~1")}</li>
                        </ul>
                    {:else if f.family == "negbinomial"}
                        <ul style="margin: 1px;">
                            <li><span class="variable">{outcomeName}</span> is a count variable that is overdispursed and can be modeled using a negative binomial (i.e., a mixture of poissons with different rates)</li>
                            <li>the average rate of <span class="variable">{outcomeName}</span> {formatPredictorsAsNaturalLanguage(f.mu_spec)}</li>
                            <li>the dispursion in rates of <span class="variable">{outcomeName}</span> {formatPredictorsAsNaturalLanguage(f.sigma_spec)}</li>
                        </ul>
                    {/if}
                </div>
            </div>
        {/each}
    {:else}
        <div class="current">No model currently applied.</div>
    {/if}

    <!-- Model bar goes here -->
    <br />
    <div class="model-suggestions">
        <!-- <div class="button-wrap">
            <Button on:click={() => (showModels = true)}
                >Add model for current visualization.</Button
            >
        </div> -->
        {#if showModels == true}
            <div class="suggestions" />
            placeholder ...
            <div class="sample">
                normal distribution 12345
                <button on:click={() => (showModels = false)}>
                    &#10003;
                </button>
            </div>
        {/if}
        <!-- <div class="button-wrap">
            <Button>Suggest a visualization-adjacent model to check</Button>
        </div>
        <div class="button-wrap">
            <Button>Is this just noise?</Button>
        </div> -->
    </div>
    <!-- <div class="discrepancies">
        <h4>Show me discrepancies</h4>
        <div class="button-wrap">
            <Button>Mismatched distributions</Button>
        </div>
        <div class="button-wrap">
            <Button>Gaps & Hotspots</Button>
        </div>
        <div class="button-wrap">
            <Button>Outliers</Button>
        </div>
        <div class="button-wrap">
            <Button>Out of range predicitons</Button>
        </div>
    </div> -->
</div>

<style>
    /* @import "define"; */
    h3:first-of-type {
        margin-top: 0;
    }
    h3 {
        color: #38425d;
    }
    .model-panel {
        background-color: #e2e9f3;
    }

    .card {
        display: block;
        border-radius: 0.5rem;
        padding: 0.5rem;
        margin-left: 0.5rem;
        margin-right: 0.5rem;
    }

    .button-wrap {
        padding: 0px;
        margin-bottom: 20px;
        height: 40px;
    }

    button {
        border-radius: 0.3rem;
        font-size: small;
        padding: revert;
    }

    .current {
        background: rgba(55, 65, 92, 0.2);
        font-style: italic;
        border-radius: 0.3rem;
    }    
    
    .description {
        background: rgba(116, 125, 151, 0.2);      
        border-radius: 0.3rem;
    }

    :global(.variable) {
        font-family: courier, "courier new", monospace;
        color: #FF7171;
        font-weight: bold;
    }

    .title p,
    .title div {
        display: inline-block;
    }
</style>
