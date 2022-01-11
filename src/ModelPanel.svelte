<script lang="ts">
    // ui compoenets
    import { Grid, Row, Column, Button } from "carbon-components-svelte";

    // props
    // export let bootstrap: any;
    // export let model: any;

    export let models: any;
    export let addModel;
    export let removeModel;

    let showAddingModel = false;
    let muSpec;
    let sigmaSpec = "~1";
    let modelType;
    let showModels = false;
</script>

<!-- model panel -->
<div class="model-panel card">
    <h3>Model</h3>

    <div class="add-and-clear" style="margin-top: 0px;">
        current models
        <button class="single-char" on:click={() => (showAddingModel = true)}
            >+</button
        >
        <button on:click={removeModel(0, true)}>clear all</button>
    </div>
    {#if showAddingModel}
        <select bind:value={modelType}>
            <option disabled selected value> -- select model -- </option>
            <option value="normal">normal model</option>
            <option value="logistic">logistic model</option>
            <option value="poisson">poisson model</option>
            <option value="ordinal">ordinal model</option>
            <option value="multinomial">multinominal model</option>
            <option value="negbinomial">negbinominal model</option>
        </select>
        <br />
        mu spec: <input bind:value={muSpec} style="padding: initial;" />
        {#if modelType == "negbinomial" || modelType == "normal"}
        <br />
            sigma spec: <input
                bind:value={sigmaSpec}
                style="padding: initial;"
            />
        {:else if modelType == "ordinal"}
        <br />
            disp spec: <input
                bind:value={sigmaSpec}
                style="padding: initial;"
            />
        {/if}
        {#if muSpec}
            <!-- {#if sigmaSpec != "~1"} -->
            <button
                on:click={addModel(muSpec, sigmaSpec, modelType)}
                on:click={() => (showAddingModel = false)}
            >
                &#10003;
            </button>
        {/if}
    {/if}

    {#if models.length != 0}
        {#each models as f, i}
            <div class="current">
                model: {f.exp[2]}
                <br />
                muSpec: {f.exp[0]}
                <br />
                sigmaSpec: {f.exp[1]}
                <button class="single-char" on:click={removeModel(i)}
                    >&times;
                </button>
            </div>
        {/each}
    {:else}
        <div class="current">No model currently applied.</div>
    {/if}

    <!-- Model bar goes here -->
    <br />
    <div class="model-suggestions">
        <div class="button-wrap">
            <Button on:click={() => (showModels = true)}
                >Add model for current visualization.</Button
            >
        </div>
        {#if showModels == true}
            <div class="suggestions" />
            placeholder ...
            <div class="sample">
                normal model 12345
                <button on:click={() => (showModels = false)}>
                    &#10003;
                </button>
            </div>
        {/if}
        <div class="button-wrap">
            <Button>Suggest an adjacent model y ~ x + w</Button>
        </div>
        <div class="button-wrap">
            <Button>Is this just noise?</Button>
        </div>
    </div>
    <div class="discrepancies">
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
    </div>
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

    .title p,
    .title div {
        display: inline-block;
    }
</style>
