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
    let modelExpression;
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
        <input bind:value={modelExpression} style="padding: initial;"/>
        {#if modelExpression}
            <button
                on:click={addModel(modelExpression)}
                on:click={() => (showAddingModel = false)}
            >
                &#10003;
            </button>
        {/if}
    {/if}

    {#if models.length != 0}
        {#each models as f, i}
            <div class="current">
                {f.exp}
                <button class="single-char" on:click={removeModel(i)}
                    >&times;
                </button>
            </div>
        {/each}
    {:else}
        <div class="current">No filter currently applied.</div>
    {/if}

    <!-- Model bar goes here -->
    <br>
    <div class="model-suggestions">
        <div class="button-wrap">
            <Button>Add model for current visualization.</Button>
        </div>
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
