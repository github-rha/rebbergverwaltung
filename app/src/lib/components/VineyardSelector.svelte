<script lang="ts">
	import {
		vineyards,
		currentVineyardId,
		selectVineyard
	} from '$lib/stores/vineyard.js'

	function handleChange(e: Event) {
		const target = e.target as HTMLSelectElement
		const value = target.value || null
		selectVineyard(value)
	}
</script>

{#if $vineyards.length > 0}
	<select
		class="border border-gray-300 rounded px-3 py-2 w-full"
		value={$currentVineyardId ?? ''}
		onchange={handleChange}
	>
		<option value="">Select vineyard…</option>
		{#each $vineyards as v (v.id)}
			<option value={v.id}>{v.name}</option>
		{/each}
	</select>
{:else}
	<p class="text-gray-500 text-sm">No vineyards yet.</p>
{/if}
