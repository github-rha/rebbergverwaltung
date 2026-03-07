<script lang="ts">
	import { resolve } from '$app/paths'
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import { onMount } from 'svelte'
	import {
		rowVideos,
		loadRowVideos,
		removeScan,
		processRowVideo,
		addRowVideo,
		bbchResults,
		loadBbchResults,
		purgeVideos
	} from '$lib/stores/scan.js'
	import { settings } from '$lib/stores/settings.js'
	import * as idb from '$lib/storage/idb.js'
	import { formatBbch } from '$lib/models/types.js'
	import type { Scan, Vineyard } from '$lib/models/types.js'
	import type { SkippedItem } from '$lib/ai/gemini.js'

	const vineyardId = $derived(page.params.id)
	const scanId = $derived(page.params.scanId)

	let vineyard: Vineyard | undefined = $state(undefined)
	let scan: Scan | undefined = $state(undefined)
	let confirmingDelete = $state(false)
	let processingId: string | null = $state(null)
	let processError: string | null = $state(null)
	let processStep: string = $state('')
	let elapsedSec: number = $state(0)
	let timerInterval: ReturnType<typeof setInterval> | null = $state(null)
	let online = $state(true)
	let fileInput: HTMLInputElement | undefined = $state(undefined)
	let uploadingFile = $state(false)
	let skippedByVideo: Record<string, SkippedItem[]> = $state({})

	function startTimer() {
		elapsedSec = 0
		timerInterval = setInterval(() => (elapsedSec += 1), 1000)
	}

	function stopTimer() {
		if (timerInterval) {
			clearInterval(timerInterval)
			timerInterval = null
		}
	}

	function dirIcon(dir: string): string {
		if (!vineyard || vineyard.direction_label === 'top_bottom') {
			return dir === 'top_to_bottom' ? '\u2193' : '\u2191'
		}
		return dir === 'top_to_bottom' ? '\u2192' : '\u2190'
	}

	async function loadAllSkipped() {
		const videos = await idb.listRowVideos(scanId)
		const result: Record<string, SkippedItem[]> = {}
		for (const v of videos) {
			const items = await idb.loadSkippedItems(v.id)
			if (items.length > 0) result[v.id] = items
		}
		skippedByVideo = result
	}

	onMount(async () => {
		vineyard = await idb.loadVineyard(vineyardId)
		scan = await idb.loadScan(scanId)
		await loadRowVideos(scanId)
		await loadBbchResults(scanId)
		await loadAllSkipped()
		online = navigator.onLine
		const onlineHandler = () => (online = true)
		const offlineHandler = () => (online = false)
		window.addEventListener('online', onlineHandler)
		window.addEventListener('offline', offlineHandler)
		return () => {
			window.removeEventListener('online', onlineHandler)
			window.removeEventListener('offline', offlineHandler)
		}
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

	async function handleProcess(videoId: string) {
		const apiKey = $settings.google_api_key
		if (!apiKey) {
			processError = 'Set your Google API key in Settings first.'
			return
		}
		if (!online) {
			processError = 'No internet connection. Process when back online.'
			return
		}
		processingId = videoId
		processError = null
		processStep = ''
		startTimer()
		try {
			await processRowVideo(scanId, videoId, apiKey, (step) => {
				processStep = step
			})
			await loadAllSkipped()
		} catch (err) {
			processError = err instanceof Error ? err.message : 'Processing failed'
		} finally {
			stopTimer()
			processingId = null
			processStep = ''
		}
	}

	async function handleProcessAll() {
		const apiKey = $settings.google_api_key
		if (!apiKey) {
			processError = 'Set your Google API key in Settings first.'
			return
		}
		if (!online) {
			processError = 'No internet connection. Process when back online.'
			return
		}
		processError = null
		processStep = ''
		startTimer()
		for (const video of $rowVideos) {
			if (video.status === 'LOCAL_ONLY' || video.status === 'FAILED') {
				processingId = video.id
				try {
					await processRowVideo(scanId, video.id, apiKey, (step) => {
						processStep = step
					})
				} catch (err) {
					processError =
						err instanceof Error ? err.message : 'Processing failed'
					break
				}
			}
		}
		stopTimer()
		processingId = null
		processStep = ''
		await loadAllSkipped()
	}

	async function handlePurge() {
		await purgeVideos(scanId)
	}

	async function handleFileUpload(e: Event) {
		const input = e.target as HTMLInputElement
		const file = input.files?.[0]
		if (!file) return
		const rowNumber = prompt('Row number?', '1')
		if (!rowNumber) return
		const row = parseInt(rowNumber, 10)
		if (isNaN(row) || row < 1) return
		uploadingFile = true
		try {
			await addRowVideo(scanId, row, 'top_to_bottom', file)
		} finally {
			uploadingFile = false
			input.value = ''
		}
	}

	const hasProcessable = $derived(
		$rowVideos.some((v) => v.status === 'LOCAL_ONLY' || v.status === 'FAILED')
	)

	const canPurge = $derived(
		$rowVideos.some((v) => v.status === 'DONE' && v.local_uri)
	)

	const resultsByRow = $derived.by(() => {
		const grouped: Record<
			number,
			{ vine_index: number; bbch_pred: number; confidence: number }[]
		> = {}
		for (const r of $bbchResults) {
			if (!grouped[r.row_number]) grouped[r.row_number] = []
			grouped[r.row_number].push({
				vine_index: r.vine_index,
				bbch_pred: r.bbch_pred,
				confidence: r.confidence
			})
		}
		return Object.entries(grouped)
			.map(([k, v]) => [Number(k), v] as const)
			.sort((a, b) => a[0] - b[0])
	})

	const skippedByRow = $derived.by(() => {
		const result: { row_number: number; items: SkippedItem[] }[] = []
		for (const video of $rowVideos) {
			const items = skippedByVideo[video.id]
			if (items && items.length > 0) {
				result.push({ row_number: video.row_number, items })
			}
		}
		return result.sort((a, b) => a.row_number - b.row_number)
	})

	function bbchColor(bbch: number): string {
		if (bbch < 10) return 'bg-gray-100 text-gray-800'
		if (bbch < 30) return 'bg-green-100 text-green-800'
		if (bbch < 60) return 'bg-yellow-100 text-yellow-800'
		if (bbch < 80) return 'bg-orange-100 text-orange-800'
		return 'bg-red-100 text-red-800'
	}
</script>

<div class="space-y-6">
	{#if scan}
		<div>
			<h2 class="text-xl font-semibold">
				Scan — {formatDate(scan.created_at)}
			</h2>
			{#if scan.is_inventory}
				<span
					class="inline-block text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800 mt-1"
					>Inventory</span
				>
			{/if}
			{#if scan.note}
				<p class="text-gray-600 text-sm mt-1">{scan.note}</p>
			{/if}
		</div>

		{#if processError}
			<p class="text-red-600 text-sm">{processError}</p>
		{/if}

		{#if !online}
			<p class="text-yellow-700 text-sm">
				Offline — processing requires internet
			</p>
		{/if}

		<div>
			<div class="flex items-center justify-between mb-2">
				<h3 class="font-medium">Row videos</h3>
				<div class="flex gap-2">
					{#if hasProcessable}
						<button
							onclick={handleProcessAll}
							disabled={processingId !== null || !online}
							class="bg-blue-700 text-white px-3 py-1 rounded text-sm hover:bg-blue-800 disabled:opacity-50"
						>
							Process all
						</button>
					{/if}
					<button
						onclick={() => fileInput?.click()}
						disabled={uploadingFile}
						class="border border-green-700 text-green-700 px-3 py-1 rounded text-sm hover:bg-green-50 disabled:opacity-50"
					>
						{uploadingFile ? 'Uploading…' : 'Upload video'}
					</button>
					<a
						href={resolve('/vineyard/[id]/scan/[scanId]/record', {
							id: vineyardId,
							scanId
						})}
						class="bg-green-700 text-white px-3 py-1 rounded text-sm hover:bg-green-800"
					>
						Record row
					</a>
					<input
						bind:this={fileInput}
						type="file"
						accept="video/*"
						onchange={handleFileUpload}
						class="hidden"
					/>
				</div>
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
							<div class="flex items-center gap-2">
								{#if (video.status === 'LOCAL_ONLY' || video.status === 'FAILED') && processingId !== video.id}
									<button
										onclick={() => handleProcess(video.id)}
										disabled={processingId !== null || !online}
										class="text-blue-700 text-xs hover:underline disabled:opacity-50"
									>
										{video.status === 'FAILED' ? 'Retry' : 'Process'}
									</button>
								{/if}
								{#if processingId === video.id}
									<span class="text-xs text-blue-600">
										{processStep || 'Processing…'}
										<span class="text-gray-400 ml-1">{elapsedSec}s</span>
									</span>
								{/if}
								<span
									class="text-xs px-2 py-1 rounded {video.status === 'DONE'
										? 'bg-green-100 text-green-800'
										: video.status === 'FAILED'
											? 'bg-red-100 text-red-800'
											: video.status === 'UPLOADING' ||
												  video.status === 'PROCESSING'
												? 'bg-blue-100 text-blue-800'
												: 'bg-yellow-100 text-yellow-800'}"
								>
									{video.status}
								</span>
							</div>
						</li>
					{/each}
				</ul>

				{#if canPurge}
					<button
						onclick={handlePurge}
						class="mt-2 text-sm text-gray-600 hover:underline"
					>
						Purge processed videos (free storage)
					</button>
				{/if}
			{/if}
		</div>

		{#if resultsByRow.length > 0}
			<div>
				<div class="flex items-center justify-between mb-2">
					<h3 class="font-medium">Results</h3>
					<a
						href={resolve('/vineyard/[id]/scan/[scanId]/heatmap', {
							id: vineyardId,
							scanId
						})}
						class="text-blue-700 text-sm hover:underline"
					>
						Heatmap
					</a>
				</div>
				{#each resultsByRow as [rowNum, vines] (rowNum)}
					<div class="mb-3">
						<p class="text-sm font-medium text-gray-700 mb-1">
							Row {rowNum}
						</p>
						<div class="flex flex-wrap gap-1">
							{#each vines as vine (vine.vine_index)}
								<a
									href={resolve('/vineyard/[id]/vine/[row]/[vine]', {
										id: vineyardId,
										row: String(rowNum),
										vine: String(vine.vine_index)
									})}
									class="text-xs px-2 py-1 rounded {bbchColor(
										vine.bbch_pred
									)} hover:ring-2 ring-blue-400"
									title="Vine {vine.vine_index}: BBCH {formatBbch(vine.bbch_pred)} ({Math.round(
										vine.confidence * 100
									)}%)"
								>
									{formatBbch(vine.bbch_pred)}
								</a>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if skippedByRow.length > 0}
			<div>
				<h3 class="font-medium mb-2">Skipped (not counted as vines)</h3>
				{#each skippedByRow as { row_number, items } (row_number)}
					<div class="mb-2">
						<p class="text-sm font-medium text-gray-700 mb-1">
							Row {row_number}
						</p>
						<ul class="text-xs text-gray-600 space-y-0.5">
							{#each items as item, i (i)}
								<li>
									<span class="text-gray-400"
										>{item.timestamp_sec.toFixed(1)}s</span
									>
									— {item.reason}
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		{/if}

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
