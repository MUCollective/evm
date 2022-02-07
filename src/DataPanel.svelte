<script lang="ts">
    import { flip } from "svelte/animate";
    import { dndzone } from "svelte-dnd-action";

    export let dndState: { id: string; name: string; items: any[] }[];
    export let flipDurationMs: number;
    export let handleDndConsider;
    export let handleDndFinalize;
</script>

<!-- data panel -->
<div class="data-panel card">
    <h3>Data</h3>
    <div class="dataset-name">
        <!-- title: Dataset (drag zone) -->
        {dndState[0].name}
    </div>
    <!-- ignore the below error, it's due to the wrongly defined type in the DnD libaray -->
    <section
        use:dndzone={{
            items: dndState[0].items,
            flipDurationMs,
        }}
        on:consider={(e) => handleDndConsider(dndState[0].id, e)}
        on:finalize={(e) => handleDndFinalize(dndState[0].id, e)}
        id={dndState[0].id}
    >
        {#each dndState[0].items as item (item.id)}
            <div
                animate:flip={{
                    duration: flipDurationMs,
                }}
                style="background-color: rgba(237,237,237,.8); 
                margin-bottom: 0.3rem;
                border-radius: 0.3rem;
                height: 20px;
                font: 14px;
                width: auto;
                padding: 0.2rem 0.5rem;"
            >
                {item.name}
            </div>
        {/each}
        {console.log("exits data panel")}
        {console.log(dndState)}
        {console.log("==============================")}
    </section>
</div>

<style>
    /* @import "define"; */
    h3 {
        margin-top: 0;
        color: white;
    }
    .data-panel {
        background-color: #38425d;
    }
    .dataset-name {
        color: white;
        margin-bottom: 20px;
    }
    .card {
        display: block;
        border-radius: 0.5rem;
        padding: 0.5rem;
        margin-left: 0.5rem;
        margin-right: 0.5rem;
    }
</style>
