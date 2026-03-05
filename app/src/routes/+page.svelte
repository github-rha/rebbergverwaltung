<script lang="ts">
	import { resolve } from '$app/paths'
	import VineyardSelector from '$lib/components/VineyardSelector.svelte'
	import { currentVineyardId } from '$lib/stores/vineyard.js'
	import { scans, loadScans } from '$lib/stores/scan.js'
	import { settings } from '$lib/stores/settings.js'
	import { pushResults } from '$lib/sync/github.js'

	let syncing = $state(false)
	let syncError = $state('')
	let syncSuccess = $state(false)

	$effect(() => {
		if ($currentVineyardId) {
			loadScans($currentVineyardId)
		} else {
			scans.set([])
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
								<span class="font-medium">{formatDate(scan.created_at)}</span>
								{#if scan.note}
									<span class="text-gray-500 text-sm ml-2">{scan.note}</span>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>
