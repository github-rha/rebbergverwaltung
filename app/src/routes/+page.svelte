<script lang="ts">
	import { resolve } from '$app/paths'
	import VineyardSelector from '$lib/components/VineyardSelector.svelte'
	import { currentVineyardId } from '$lib/stores/vineyard.js'
	import { scans, loadScans } from '$lib/stores/scan.js'
	import { settings } from '$lib/stores/settings.js'
	import { pushResults } from '$lib/sync/github.js'
	import {
		exportScanCsv,
		exportVineTimeSeriesCsv,
		downloadCsv
	} from '$lib/export/csv.js'
	import * as idb from '$lib/storage/idb.js'
	import type { VineMap } from '$lib/models/types.js'

	let syncing = $state(false)
	let syncError = $state('')
	let syncSuccess = $state(false)
	let vineMap: VineMap[] = $state([])

	$effect(() => {
		if ($currentVineyardId) {
			loadScans($currentVineyardId)
			idb.loadVineMap($currentVineyardId).then((vm) => (vineMap = vm))
		} else {
			scans.set([])
			vineMap = []
		}
	})

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString()
	}

	const canSync = $derived(
		$currentVineyardId && $settings.github_repo && $settings.github_pat
	)

	async function handleSync() {
		if (!$currentVineyardId || !canSync) return
		syncing = true
		syncError = ''
		syncSuccess = false
		try {
			await pushResults(
				$currentVineyardId,
				$settings.github_repo,
				$settings.github_pat
			)
			syncSuccess = true
			setTimeout(() => (syncSuccess = false), 3000)
		} catch (err) {
			syncError = err instanceof Error ? err.message : 'Sync failed'
		} finally {
			syncing = false
		}
	}

	async function handleExportScan(scanId: string) {
		const csv = await exportScanCsv(scanId)
		if (csv) downloadCsv(csv, `scan-${scanId.slice(0, 8)}.csv`)
	}

	async function handleExportTimeSeries() {
		if (!$currentVineyardId) return
		const csv = await exportVineTimeSeriesCsv($currentVineyardId)
		if (csv) downloadCsv(csv, 'vine-timeseries.csv')
	}

	const vineMapSummary = $derived.by(() => {
		if (vineMap.length === 0) return null
		const rows = new Set(vineMap.map((v) => v.row_number)).size
		const present = vineMap.filter((v) => v.status === 'present').length
		return { rows, total: vineMap.length, present }
	})
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold mb-2">Vineyard</h2>
		<VineyardSelector />
		<div class="mt-2">
			<a
				href={resolve('/vineyard/new')}
				class="text-green-700 text-sm font-medium hover:underline"
			>
				+ New vineyard
			</a>
		</div>
	</div>

	{#if $currentVineyardId}
		{#if vineMapSummary}
			<a
				href={resolve('/vineyard/[id]/vinemap', {
					id: $currentVineyardId
				})}
				class="block border border-gray-200 rounded p-3 hover:bg-gray-50"
			>
				<span class="text-sm font-medium text-gray-700">VineMap</span>
				<span class="text-sm text-gray-500 ml-2"
					>{vineMapSummary.rows} rows, {vineMapSummary.present} present vines</span
				>
			</a>
		{/if}

		<div>
			<div class="flex items-center justify-between mb-2">
				<h2 class="text-xl font-semibold">Scans</h2>
				<div class="flex gap-2">
					{#if canSync}
						<button
							onclick={handleSync}
							disabled={syncing}
							class="border border-green-700 text-green-700 px-3 py-1 rounded text-sm hover:bg-green-50 disabled:opacity-50"
						>
							{syncing ? 'Syncing…' : 'Sync'}
						</button>
					{/if}
					{#if $scans.length > 0}
						<button
							onclick={handleExportTimeSeries}
							class="border border-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-50"
						>
							Export CSV
						</button>
					{/if}
					<a
						href={resolve('/vineyard/[id]/scan/new', {
							id: $currentVineyardId
						})}
						class="bg-green-700 text-white px-3 py-1 rounded text-sm hover:bg-green-800"
					>
						New scan
					</a>
				</div>
			</div>
			{#if syncError}
				<p class="text-red-600 text-sm mb-2">{syncError}</p>
			{/if}
			{#if syncSuccess}
				<p class="text-green-700 text-sm mb-2">Synced to GitHub</p>
			{/if}
			{#if $scans.length === 0}
				<p class="text-gray-500 text-sm">No scans yet.</p>
			{:else}
				<ul class="space-y-2">
					{#each $scans as scan (scan.id)}
						<li>
							<a
								href={resolve('/vineyard/[id]/scan/[scanId]', {
									id: $currentVineyardId,
									scanId: scan.id
								})}
								class="block border border-gray-200 rounded p-3 hover:bg-gray-50"
							>
								<div class="flex items-center justify-between">
									<div>
										<span class="font-medium"
											>{formatDate(scan.created_at)}</span
										>
										{#if scan.is_inventory}
											<span
												class="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 ml-2"
												>Inventory</span
											>
										{/if}
										{#if scan.note}
											<span class="text-gray-500 text-sm ml-2">{scan.note}</span
											>
										{/if}
									</div>
									<button
										onclick={(e) => {
											e.preventDefault()
											handleExportScan(scan.id)
										}}
										class="text-gray-400 text-xs hover:text-gray-700"
										title="Export CSV"
									>
										CSV
									</button>
								</div>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>
