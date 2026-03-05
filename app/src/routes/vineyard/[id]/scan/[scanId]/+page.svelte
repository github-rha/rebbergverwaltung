<script lang="ts">
	import { resolve } from '$app/paths'
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import { onMount } from 'svelte'
	import { rowVideos, loadRowVideos, removeScan } from '$lib/stores/scan.js'
	import * as idb from '$lib/storage/idb.js'
	import type { Scan, Vineyard } from '$lib/models/types.js'

	const vineyardId = $derived(page.params.id)
	const scanId = $derived(page.params.scanId)

	let vineyard: Vineyard | undefined = $state(undefined)
	let scan: Scan | undefined = $state(undefined)
	let confirmingDelete = $state(false)

	function dirIcon(dir: string): string {
		if (!vineyard || vineyard.direction_label === 'top_bottom') {
			return dir === 'top_to_bottom' ? '↓' : '↑'
		}
		return dir === 'top_to_bottom' ? '→' : '←'
	}

	onMount(async () => {
		vineyard = await idb.loadVineyard(vineyardId)
		scan = await idb.loadScan(scanId)
		await loadRowVideos(scanId)
	})

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString()
	}

	async function handleDelete() {
		if (!confirmingDelete) {
			confirmingDelete = true
			return
		}
		await removeScan(vineyardId, scanId)
		await goto(resolve('/'))
	}
</script>

<div class="space-y-6">
	{#if scan}
		<div>
			<h2 class="text-xl font-semibold">
				Scan — {formatDate(scan.created_at)}
			</h2>
			{#if scan.note}
				<p class="text-gray-600 text-sm mt-1">{scan.note}</p>
			{/if}
		</div>

		<div>
			<div class="flex items-center justify-between mb-2">
				<h3 class="font-medium">Row videos</h3>
				<a
					href={resolve('/vineyard/[id]/scan/[scanId]/record', {
						id: vineyardId,
						scanId
					})}
					class="bg-green-700 text-white px-3 py-1 rounded text-sm hover:bg-green-800"
				>
					Record row
				</a>
			</div>

			{#if $rowVideos.length === 0}
				<p class="text-gray-500 text-sm">
					No videos yet. Tap "Record row" to start.
				</p>
			{:else}
				<ul class="space-y-2">
					{#each $rowVideos as video (video.id)}
						<li
							class="border border-gray-200 rounded p-3 flex items-center justify-between"
						>
							<div>
								<span class="font-medium">Row {video.row_number}</span>
								<span class="text-gray-500 text-sm ml-2">
									{dirIcon(video.direction)}
								</span>
							</div>
							<span
								class="text-xs px-2 py-1 rounded {video.status === 'DONE'
									? 'bg-green-100 text-green-800'
									: video.status === 'FAILED'
										? 'bg-red-100 text-red-800'
										: 'bg-yellow-100 text-yellow-800'}"
							>
								{video.status}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="flex gap-2">
			{#if confirmingDelete}
				<button
					onclick={handleDelete}
					class="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800"
				>
					Confirm delete
				</button>
				<button
					onclick={() => (confirmingDelete = false)}
					class="border border-gray-300 px-4 py-2 rounded hover:bg-gray-100"
				>
					Cancel
				</button>
			{:else}
				<button
					onclick={handleDelete}
					class="border border-red-300 text-red-700 px-4 py-2 rounded text-sm hover:bg-red-50"
				>
					Delete scan
				</button>
			{/if}
		</div>
	{:else}
		<p class="text-gray-500">Loading…</p>
	{/if}

	<a href={resolve('/')} class="text-green-700 text-sm hover:underline"
		>← Back</a
	>
</div>
