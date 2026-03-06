<script lang="ts">
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import { onMount } from 'svelte'
	import * as idb from '$lib/storage/idb.js'
	import {
		computeDeviation,
		computeRowHeterogeneity
	} from '$lib/analysis/derived.js'
	import type { BbchResult, Scan } from '$lib/models/types.js'

	const vineyardId = $derived(page.params.id)
	const scanId = $derived(page.params.scanId)

	let scan: Scan | undefined = $state(undefined)
	let results: BbchResult[] = $state([])
	let mode: 'bbch' | 'deviation' | 'heterogeneity' = $state('bbch')

	onMount(async () => {
		scan = await idb.loadScan(scanId)
		results = await idb.loadBbchResults(scanId)
	})

	const rows = $derived.by(() => {
		const rowSet = new Set(results.map((r) => r.row_number))
		return [...rowSet].sort((a, b) => a - b)
	})

	const maxVine = $derived(
		results.reduce((max, r) => Math.max(max, r.vine_index), 0)
	)

	const deviations = $derived(computeDeviation(results))
	const heterogeneity = $derived(computeRowHeterogeneity(results))

	function getResult(row: number, vine: number): BbchResult | undefined {
		return results.find((r) => r.row_number === row && r.vine_index === vine)
	}

	function getDeviation(row: number, vine: number): number | undefined {
		return deviations.find((d) => d.row_number === row && d.vine_index === vine)
			?.deviation
	}

	function getRowVariance(row: number): number {
		return heterogeneity.find((h) => h.row_number === row)?.variance ?? 0
	}

	function bbchColor(bbch: number): string {
		const ratio = Math.min(bbch / 89, 1)
		const h = (1 - ratio) * 200
		return `hsl(${h}, 70%, 75%)`
	}

	function deviationColor(dev: number): string {
		if (dev < -5) return 'hsl(220, 70%, 70%)'
		if (dev < -2) return 'hsl(220, 50%, 85%)'
		if (dev > 5) return 'hsl(0, 70%, 70%)'
		if (dev > 2) return 'hsl(0, 50%, 85%)'
		return 'hsl(0, 0%, 93%)'
	}

	function hetColor(variance: number): string {
		if (variance > 100) return 'hsl(0, 70%, 70%)'
		if (variance > 50) return 'hsl(30, 70%, 75%)'
		if (variance > 20) return 'hsl(50, 70%, 80%)'
		return 'hsl(120, 40%, 85%)'
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString()
	}
</script>

<div class="space-y-4">
	{#if scan}
		<h2 class="text-xl font-semibold">
			Heatmap — {formatDate(scan.created_at)}
		</h2>
	{/if}

	<div class="flex gap-1">
		<button
			onclick={() => (mode = 'bbch')}
			class="px-3 py-1 rounded text-sm {mode === 'bbch'
				? 'bg-blue-700 text-white'
				: 'bg-gray-200 text-gray-700'}"
		>
			BBCH
		</button>
		<button
			onclick={() => (mode = 'deviation')}
			class="px-3 py-1 rounded text-sm {mode === 'deviation'
				? 'bg-blue-700 text-white'
				: 'bg-gray-200 text-gray-700'}"
		>
			Deviation
		</button>
		<button
			onclick={() => (mode = 'heterogeneity')}
			class="px-3 py-1 rounded text-sm {mode === 'heterogeneity'
				? 'bg-blue-700 text-white'
				: 'bg-gray-200 text-gray-700'}"
		>
			Heterogeneity
		</button>
	</div>

	{#if results.length === 0}
		<p class="text-gray-500 text-sm">No results yet.</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="text-xs border-collapse">
				<thead>
					<tr>
						<th class="px-1 py-1 text-left text-gray-500">Row</th>
						{#each Array.from({ length: maxVine }, (_, i) => i + 1) as vine (vine)}
							<th class="px-1 py-1 text-center text-gray-400">{vine}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row)}
						<tr>
							<td class="px-1 py-1 font-medium text-gray-600">{row}</td>
							{#each Array.from({ length: maxVine }, (_, i) => i + 1) as vine (vine)}
								{@const r = getResult(row, vine)}
								{#if r}
									{@const dev = getDeviation(row, vine)}
									{@const bgColor =
										mode === 'bbch'
											? bbchColor(r.bbch_pred)
											: mode === 'deviation'
												? deviationColor(dev ?? 0)
												: hetColor(getRowVariance(row))}
									<td class="px-0 py-0">
										<a
											href={resolve('/vineyard/[id]/vine/[row]/[vine]', {
												id: vineyardId,
												row: String(row),
												vine: String(vine)
											})}
											class="block w-6 h-6 text-center leading-6 text-[10px]"
											style="background-color: {bgColor}"
											title="Row {row}, Vine {vine}: BBCH {r.bbch_pred}"
										>
											{mode === 'bbch'
												? r.bbch_pred
												: mode === 'deviation'
													? (dev ?? 0) > 0
														? `+${Math.round(dev ?? 0)}`
														: Math.round(dev ?? 0)
													: ''}
										</a>
									</td>
								{:else}
									<td class="px-0 py-0">
										<div class="w-6 h-6 bg-gray-50"></div>
									</td>
								{/if}
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<a
		href={resolve('/vineyard/[id]/scan/[scanId]', {
			id: vineyardId,
			scanId
		})}
		class="text-green-700 text-sm hover:underline"
	>
		← Back to scan
	</a>
</div>
