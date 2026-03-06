<script lang="ts">
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import { onMount } from 'svelte'
	import * as idb from '$lib/storage/idb.js'
	import { formatBbch } from '$lib/models/types.js'
	import type { VineMap } from '$lib/models/types.js'

	const vineyardId = $derived(page.params.id)
	const rowNumber = $derived(Number(page.params.row))
	const vineIndex = $derived(Number(page.params.vine))

	let timeSeries: {
		date: string
		bbch: number
		confidence: number
		model: string
	}[] = $state([])
	let vineStatus: VineMap | undefined = $state(undefined)

	onMount(async () => {
		const scans = await idb.listScans(vineyardId)
		const series: typeof timeSeries = []

		for (const scan of scans) {
			const results = await idb.loadBbchResults(scan.id)
			const match = results.find(
				(r) => r.row_number === rowNumber && r.vine_index === vineIndex
			)
			if (match) {
				series.push({
					date: scan.created_at,
					bbch: match.bbch_pred,
					confidence: match.confidence,
					model: match.model_version
				})
			}
		}

		timeSeries = series.sort(
			(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
		)

		const vineMap = await idb.loadVineMap(vineyardId)
		vineStatus = vineMap.find(
			(v) => v.row_number === rowNumber && v.vine_index === vineIndex
		)
	})

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString()
	}

	const maxBbch = $derived(Math.max(89, ...timeSeries.map((t) => t.bbch)))

	function barHeight(bbch: number): number {
		return (bbch / maxBbch) * 100
	}
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold">
			Row {rowNumber}, Vine {vineIndex}
		</h2>
		{#if vineStatus}
			<span
				class="inline-block text-xs px-2 py-0.5 rounded mt-1 {vineStatus.status ===
				'present'
					? 'bg-green-100 text-green-800'
					: 'bg-gray-100 text-gray-600'}"
			>
				{vineStatus.status}
			</span>
		{/if}
	</div>

	{#if timeSeries.length === 0}
		<p class="text-gray-500 text-sm">No data for this vine yet.</p>
	{:else}
		<div>
			<h3 class="font-medium mb-2">BBCH over time</h3>
			<div class="flex items-end gap-1 h-32">
				{#each timeSeries as point, i (i)}
					<div class="flex flex-col items-center flex-1">
						<span class="text-xs text-gray-700 mb-1">{formatBbch(point.bbch)}</span>
						<div
							class="w-full bg-green-600 rounded-t"
							style="height: {barHeight(point.bbch)}%"
						></div>
						<span
							class="text-[9px] text-gray-500 mt-1 truncate w-full text-center"
						>
							{formatDate(point.date)}
						</span>
					</div>
				{/each}
			</div>
		</div>

		<div>
			<h3 class="font-medium mb-2">Details</h3>
			<table class="w-full text-sm">
				<thead>
					<tr class="text-left text-gray-500">
						<th class="py-1">Date</th>
						<th class="py-1">BBCH</th>
						<th class="py-1">Conf.</th>
						<th class="py-1">Model</th>
					</tr>
				</thead>
				<tbody>
					{#each timeSeries as point, i (i)}
						<tr class="border-t border-gray-100">
							<td class="py-1">{formatDate(point.date)}</td>
							<td class="py-1 font-medium">{formatBbch(point.bbch)}</td>
							<td class="py-1">{Math.round(point.confidence * 100)}%</td>
							<td class="py-1 text-gray-400 text-xs">{point.model}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<a href={resolve('/')} class="text-green-700 text-sm hover:underline"
		>← Back</a
	>
</div>
