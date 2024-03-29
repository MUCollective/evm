<script context="module">
    import { writable, get } from "svelte/store";

    export const chartX = writable("origin");
    export const chartY = writable("cyl");
</script>

<script lang="ts">
    import { flip } from "svelte/animate";
    import { dndzone } from "svelte-dnd-action";
    import Chart from "./Chart.svelte";
    import { id } from "vega";

    export let dndState: { id: string; name: string; items: any[] }[];
    export let originalDndState: { id: string; name: string; items: any[] }[];
    export let flipDurationMs: number;
    export let handleDndConsider;
    export let handleDndFinalize;
    export let removeEncoding;
    // export let changeMark;
    // export let changeAggregation;
    export let addFilter;
    export let removeFilter;
    export let addTransform;
    export let removeTrans;
    export let formatVariable;
    // export let getVariableTransform;

    export let filters: any;
    export let transformations: any;

    let mark;
    let aggregateX;
    let aggregateY;
    let filterVar;

    let showAddingFilter = false;
    let showAddingTransform = false;
    let transVar;
    let trans;

    let includeOrExclude = "include";
    function onChange(event) {
        includeOrExclude = event.currentTarget.value;
    }

    let condition;
    let conditionValue1;
    let conditionValue2;
</script>

<div class="encoding-panel card">
    <h3>Encoding</h3>
    {#each dndState as shelf}
        {#if shelf.id !== "variables"}
            <div class="group">
                <div class="encoding-label">
                    {shelf.name}
                </div>
                <!-- ignore the below error, it's due to the wrongly defined type in the DnD libaray -->
                <div class="drop-field">
                    <section
                        use:dndzone={{
                            items: shelf.items,
                            flipDurationMs,
                            dragDisabled: true,
                        }}
                        on:consider={(e) => handleDndConsider(shelf.id, e)}
                        on:finalize={(e) => handleDndFinalize(shelf.id, e)}
                        id={shelf.id}
                        style="height: 100%;"
                    >
                        {#if shelf.items.length == 0}
                            <span class="placeholder"> drop a field here </span>
                        {/if}
                        <!-- after dropped -->
                        {#each shelf.items as item (item.id)}
                            <div
                                animate:flip={{
                                    duration: flipDurationMs,
                                }}
                            >
                                <!-- {item.name} -->
                                {@html formatVariable(item.name, item.trans)}
                                <button
                                    class="single-char"
                                    on:click={removeEncoding(shelf.id, shelf.items)}
                                    >&times;
                                </button>
                            </div>
                        {/each}
                    </section>
                </div>
            </div>
        {/if}
    {/each}

    <!-- <h3>Mark</h3>
    <select bind:value={mark} on:change={changeMark(mark)}>
        <option disabled selected value> -- change marking -- </option>
        <option value="tick">tick</option>
        <option value="bar">bar</option> 
        <option value="point">point</option>
        <option value="circle">circle</option>
        <option value="line">line</option>
    </select> -->

    <!-- <h3>Aggregation</h3>
    <select
        bind:value={aggregateX}
        on:change={changeAggregation(aggregateX, "x-drop")}
    >
        <option disabled selected value> -- x aggregation -- </option>
        <option value="none">none</option>
        <option value="count">count</option>
        <option value="sum">sum</option>
        <option value="mean">mean</option>
    </select>
    <select
        bind:value={aggregateY}
        on:change={changeAggregation(aggregateY, "y-drop")}
    >
        <option disabled selected value> -- y aggregation -- </option>
        <option value="none">none</option>
        <option value="count">count</option>
        <option value="sum">sum</option>
        <option value="mean">mean</option>
    </select> -->

    <h3>Filter</h3>
    <div class="add-and-clear" style="display: inline-block;">
        add
        <button class="single-char" on:click={() => (showAddingFilter = true)}>+</button>
        or remove
        <button on:click={removeFilter(0, true)}>clear all</button>
    </div>


    {#if filters.length != 0}
        {#each filters as f, i}
            <div class="current">
                {f.includeExclude}
                {f.variable}
                {f.condition}
                {f.value1}
                <button class="single-char" on:click={removeFilter(i)}
                    >&times;
                </button>
            </div>
        {/each}
    {:else}
        <div class="current">No filter currently applied.</div>
    {/if}

<!-- {/key} -->
<br />
{#if showAddingFilter}
    variable:
    <select bind:value={filterVar}>
        <option disabled selected value> -- variable -- </option>
        {#each originalDndState[0].items as item}
            <option value={item.name}>{item.name}</option>
        {/each}
    </select>
    {#if filterVar}
        <br />
        <label>
            <input
                checked={includeOrExclude === "include"}
                on:change={onChange}
                type="radio"
                name="includeExclude"
                value="include"
            /> include
        </label>
        <label>
            <input
                checked={includeOrExclude === "exclude"}
                on:change={onChange}
                type="radio"
                name="includeExclude"
                value="exclude"
            /> exclude
        </label>
        <select bind:value={condition}>
            <option disabled selected value> -- condition -- </option>
            <option value="greater">greater than</option>
            <option value="greaterEqual">greater than or equal to</option>
            <option value="less">less than</option>
            <option value="lessEqual">less than or equal to</option>
            <option value="equal">equal to</option>
            <option value="between">between</option>
        </select>
        {#if condition == "greater" || condition == "greaterEqual" || condition == "less" || condition == "lessEqual" || condition == "equal"}
            <input bind:value={conditionValue1} />
        {:else if condition == "between"}
            min: <input bind:value={conditionValue1} />
            max: <input bind:value={conditionValue2} />
        {/if}
        {#if condition && conditionValue1}
            <button
                on:click={addFilter(
                    filterVar,
                    includeOrExclude,
                    condition,
                    conditionValue1,
                    conditionValue2
                )}
                on:click={() => (showAddingFilter = false)}
            >
                <!-- &#10003; -->
                Apply filter
            </button>
        {/if}
    {/if}
{/if}

<h3>Transform</h3>
<div class="add-and-clear" style="display: inline-block;">
    add
    <button class="single-char" on:click={() => (showAddingTransform = true)}>+</button>
    or remove
    <button on:click={removeTrans(0, true)}>clear all</button>
</div>



{#if transformations.length != 0}
    {#each transformations as t, i}
        <div class="current">
            <!-- {console.log(f)} -->
            <br />
            {t.variable}
            {t.transformation}
            transform
            <button class="single-char" on:click={removeTrans(i)}
                >&times;</button
            >
            <br />
        </div>
    {/each}
{:else}
    <div class="current">No transform currently applied.</div>
{/if}
<!-- {/key} -->
<br />
{#if showAddingTransform}
    variable:
    <select bind:value={transVar}>
        <option disabled selected value> -- variable -- </option>
        {#each originalDndState[0].items as item}
            <option value={item.name}>{item.name}</option>
        {/each}
    </select>
    {#if transVar}
        <select bind:value={trans}>
            <option disabled selected value> -- transform -- </option>
            <option value="log">log</option>
            <option value="logit">log odds (a.k.a. logit)</option>
        </select>
        {#if trans}
            <button
                on:click={addTransform(transVar, trans)}
                on:click={() => (showAddingTransform = false)}
            >
                <!-- &#10003; -->
                Apply transform
            </button>
        {/if}
    {/if}
{/if}
</div>

<style>
    /* @import "define"; */
    h3:first-of-type {
        margin-top: 0;
    }
    h3 {
        color: #38425d;
    }
    .encoding-panel {
        background-color: #e2e9f3;
    }

    .card {
        display: block;
        border-radius: 0.5rem;
        padding: 0.5rem;
        margin-left: 0.5rem;
        margin-right: 0.5rem;
    }

    .group {
        display: flex;
        width: 100%;
        height: 22px;
        margin-bottom: 4px;
        border: 0;
        border-radius: 0.3rem;
    }

    .encoding-label {
        box-sizing: border-box;
        display: block;
        flex-shrink: 0;
        width: 50px;
        height: 22px;
        margin: 0;
        padding: 3.5px 2px 6.5px 2px;
        border: 1px solid #ddd;
        border-radius: 0.3rem 0 0 0.3rem;
        font-size: 11px;
        background-color: rgba(55, 65, 92, 0.2);
        line-height: 100%;
    }

    .placeholder {
        box-sizing: border-box;
        display: block;
        flex-shrink: 0;
        width: auto;
        height: 22px;
        margin: 0 0 0 -1px;
        padding: 3.5px 2px 6.5px 2px;
        border: 1px solid #ddd;
        border-radius: 0 0.3rem 0.3rem 0;
        text-overflow: ellipsis;
        font-weight: normal;
        color: #aaa;
        font-size: 11px;
        background-color: white;
        line-height: 100%;
    }

    .drop-field {
        width: 100%;
    }

    select {
        background-color: rgba(237, 237, 237, 0.8);
        margin-bottom: 0.3rem;
        border-radius: 0.3rem;
        width: auto;
        padding: 0.2rem 0.5rem;
        font-size: 11px;
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

    input {
        padding: initial;
    }
</style>
