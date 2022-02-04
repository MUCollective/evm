<script lang="ts">


	export let dataChanged: any;
	export let vlSpec: VisualizationSpec;

    function downloadFile(fileName) {
        // var a = document.createElement("a");
        // a.href = file;
        // a.setAttribute("download", fileName);
        // a.click();
        console.log("what????");
        var output = [];
        output["data"] = JSON.stringify(dataChanged);
        output["spec"] = JSON.stringify(vlSpec);
        console.log(output);
        // var bb = new Blob(output, { type: 'text/plain' });
        // var a = document.createElement('a');
        // a.download = fileName + '.json';
        // a.href = window.URL.createObjectURL(bb);
        // a.textContent = 'Download ready';
        // a.click(); 
    }

    console.log(typeof downloadFile);
</script>

<!-- data panel -->
<div class="save">
    <button on:click={downloadFile("data_and_spec")}>Save</button>

</div>

<style>
</style>
