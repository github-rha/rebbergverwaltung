<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import { addScan } from '$lib/stores/scan.js'

	const vineyardId = $derived(page.params.id)

	let note = $state('')

	async function handleSubmit(e: Event) {
		e.preventDefault()
		const scan = await addScan(vineyardId, note.trim())
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
