<script lang="ts">
    // ui compoenets
    import { Grid, Row, Column, Button } from "carbon-components-svelte";

    // props
    export let bootstrap: any;
    export let model: any;
</script>

<!-- model panel -->
<div class="model-panel card">
    <h3>Model</h3>
    <p>Show me a model</p>
    <!-- Model bar goes here -->
    <div class="button-wrap">
        <Button on:click={bootstrap}>What if this pattern was noise?</Button>
    </div>
    <div class="button-wrap">
        <Button on:click={model}>Create a model for the current chart.</Button>
    </div>
    <!-- Other automated what ifs suggested below -->
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
</style>
