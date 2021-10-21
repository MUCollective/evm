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
    export let flipDurationMs: number;
    export let handleDndConsider;
    export let handleDndFinalize;
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
                                {item.name}
                            </div>
                        {/each}
                    </section>
                </div>
            </div>
        {/if}
    {/each}
    <h3>Marks</h3>
    (placeholders for now)
    <div class="group">
        <div class="encoding-label">size</div>
        <div class="drop-field">
            <span class="placeholder"> drop a field here </span>
        </div>
    </div>
    <div class="group">
        <div class="encoding-label">color</div>
        <div class="drop-field">
            <span class="placeholder"> drop a field here </span>
        </div>
    </div>
    <div class="group">
        <div class="encoding-label">shape</div>
        <div class="drop-field">
            <span class="placeholder"> drop a field here </span>
        </div>
    </div>
    <div class="group">
        <div class="encoding-label">detail</div>
        <div class="drop-field">
            <span class="placeholder"> drop a field here </span>
        </div>
    </div>
    <div class="group">
        <div class="encoding-label">text</div>
        <div class="drop-field">
            <span class="placeholder"> drop a field here </span>
        </div>
    </div>

    <h3>Filter</h3>
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
</style>
