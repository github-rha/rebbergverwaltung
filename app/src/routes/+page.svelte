<script lang="ts">
	import { resolve } from '$app/paths'
	import VineyardSelector from '$lib/components/VineyardSelector.svelte'
	import { currentVineyardId } from '$lib/stores/vineyard.js'
	import { scans, loadScans } from '$lib/stores/scan.js'

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
				<a
					href={resolve('/vineyard/[id]/scan/new', { id: $currentVineyardId })}
					class="bg-green-700 text-white px-3 py-1 rounded text-sm hover:bg-green-800"
				>
					New scan
				</a>
			</div>
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
