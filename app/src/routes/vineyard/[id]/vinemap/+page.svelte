<script lang="ts">
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import { onMount } from 'svelte'
	import * as idb from '$lib/storage/idb.js'
	import type { VineMap, Vineyard } from '$lib/models/types.js'

	const vineyardId = $derived(page.params.id)

	let vineyard: Vineyard | undefined = $state(undefined)
	let entries: VineMap[] = $state([])

	onMount(async () => {
		vineyard = await idb.loadVineyard(vineyardId)
		entries = await idb.loadVineMap(vineyardId)
	})

	const rows = $derived.by(() => {
		const grouped: Record<number, VineMap[]> = {}
		for (const e of entries) {
			if (!grouped[e.row_number]) grouped[e.row_number] = []
			grouped[e.row_number].push(e)
		}
		return Object.entries(grouped)
			.map(([k, v]) => [Number(k), v] as const)
			.sort((a, b) => a[0] - b[0])
	})

	const totalVines = $derived(entries.length)
	const presentCount = $derived(
		entries.filter((e) => e.status === 'present').length
	)
	const missingCount = $derived(
		entries.filter((e) => e.status === 'missing').length
	)
	const deadCount = $derived(entries.filter((e) => e.status === 'dead').length)

	function statusColor(status: string): string {
		if (status === 'present') return 'bg-green-200 text-green-800'
		if (status === 'dead') return 'bg-red-200 text-red-800'
		return 'bg-gray-200 text-gray-600'
	}
</script>

<div class="space-y-6">
	<h2 class="text-xl font-semibold">
		VineMap{vineyard ? ` — ${vineyard.name}` : ''}
	</h2>

	{#if entries.length === 0}
		<p class="text-gray-500 text-sm">
			No VineMap yet. Run an inventory scan to build one.
		</p>
	{:else}
		<div class="text-sm text-gray-600 flex gap-4">
			<span>{totalVines} vines</span>
			<span class="text-green-700">{presentCount} present</span>
			{#if missingCount > 0}
				<span class="text-gray-500">{missingCount} missing</span>
			{/if}
			{#if deadCount > 0}
				<span class="text-red-700">{deadCount} dead</span>
			{/if}
		</div>

		{#each rows as [rowNum, vines] (rowNum)}
			<div>
				<p class="text-sm font-medium text-gray-700 mb-1">
					Row {rowNum}
					<span class="text-gray-400 font-normal">({vines.length} vines)</span>
				</p>
				<div class="flex flex-wrap gap-1">
					{#each vines as vine (vine.vine_index)}
						<div
							class="text-xs px-1.5 py-0.5 rounded {statusColor(vine.status)}"
							title="Vine {vine.vine_index}: {vine.status}"
						>
							{vine.vine_index}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	{/if}

	<a href={resolve('/')} class="text-green-700 text-sm hover:underline"
		>← Back</a
	>
</div>
