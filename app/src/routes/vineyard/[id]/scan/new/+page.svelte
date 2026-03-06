<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import { addScan } from '$lib/stores/scan.js'

	const vineyardId = $derived(page.params.id)

	let note = $state('')
	let isInventory = $state(false)

	async function handleSubmit(e: Event) {
		e.preventDefault()
		const scan = await addScan(vineyardId, note.trim(), isInventory)
		await goto(
			resolve('/vineyard/[id]/scan/[scanId]', {
				id: vineyardId,
				scanId: scan.id
			})
		)
	}
</script>

<div class="space-y-6">
	<h2 class="text-xl font-semibold">New scan</h2>

	<form onsubmit={handleSubmit} class="space-y-4">
		<div>
			<label for="note" class="block text-sm font-medium text-gray-700"
				>Note (optional)</label
			>
			<input
				id="note"
				type="text"
				bind:value={note}
				placeholder="e.g. after rain, leaf removal last week"
				class="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
			/>
		</div>

		<div class="flex items-start gap-2">
			<input
				id="inventory"
				type="checkbox"
				bind:checked={isInventory}
				class="mt-1"
			/>
			<label for="inventory" class="text-sm text-gray-700">
				<span class="font-medium">Inventory scan</span>
				<span class="block text-gray-500"
					>First scan of the season. Records which vines are present or missing.</span
				>
			</label>
		</div>

		<button
			type="submit"
			class="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800"
		>
			Create scan
		</button>
	</form>

	<a href={resolve('/')} class="text-green-700 text-sm hover:underline"
		>← Back</a
	>
</div>
