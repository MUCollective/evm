<script lang="ts">
	export let name: string;

	let src = "./logo.png"
</script>


<style>
	@import "define";

	#header {
		height: 2%;
		display: flex;
		padding: 0 20px;
		text-align: left;
		background: #fcfdfe;
		justify-content: space-between;
	}

	.full-width {
		width: 100%
	}
</style>

<div id="header" style="margin: 0px 0px 20px 0px;">
	<img src="./logo.png" alt="header"/>
</div>
