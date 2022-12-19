<script lang="ts">
	export let name: string;
	export let datasetNameToPath: Record<string, string>;
	export let dndState: { id: string; name: string; items: any[] }[];
	export let changeDataset;
	export let modelChecking;
	export let changeModelChecking;

	let src = "./logo.png";

	let datasetName = dndState[0].name;
	// export let userId = "";
	let userId = "";
	export let confirmUserId;
	export let disableUserIdInput;
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

	.logo-box {
		flex: 4 0 0;
	}

	.column-box {
		display: flex;
		flex-direction: column;
		flex: 1 1 0;
	}

	.row-box {
		display: flex;
		flex-direction: row;
		flex: 1 1 0;
	}

	.box {
		flex: 1 1 0;
	}

	.row-box .label {
		flex-grow: 2;
	}

    h4:first-of-type {
        margin-top: 3px;
    }
    h4 {
        color: #38425d;
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
</style>

<div id="header" style="margin: 0px;">
	<div class="logo-box" style="height: 100%;">
		<img src="./logo.png" alt="header"/>
	</div>

	<!-- AMK: for demo -->
	<!-- <div class="column-box">
		<div class="box">
			<h4 style="margin-bottom: 6px;">
				user id
			</h4>
		</div>
		<div class="row-box">
			<div class="box">
				<input bind:value={userId} style="padding: initial;" size="15" disabled={disableUserIdInput}/>
			</div>
			<div class="box">
				<button
					on:click={confirmUserId(userId)}
				>
					Confirm
				</button>
			</div>
		</div>
	</div>

	<div class="column-box">
		<div class="row-box">
			<div class="box label">
				<h4 style="margin-bottom: 6px;">
				dataset
			</h4></div>
			<div class="box">
				<select bind:value={datasetName}>
				{#each Object.keys(datasetNameToPath) as datasetName}
					<option value={datasetName}>{datasetName}</option>
				{/each}
			</select></div>
			<div class="box">
				{#if datasetName !== dndState[0].name}
				<button
					on:click={changeDataset(datasetName)}
				>
					Apply
				</button>
			{/if}</div>
			
		</div>
		
		<div class="row-box">
			<div class="box label">
				<h4 style="margin-bottom: 6px;">
					model checks
				</h4>
			</div>
			<div class="box">
				<label>
					<input
						checked={modelChecking}
						on:change={changeModelChecking}
						type="radio"
						name="modelCheckingOnOff"
						value={true}
					/> on
				</label>
			</div>
			<div class="box">
				<label>
					<input
						checked={!modelChecking}
						on:change={changeModelChecking}
						type="radio"
						name="modelCheckingOnOff"
						value={false}
					/> off
				</label>
			</div>
		</div>
	</div> -->

</div>
