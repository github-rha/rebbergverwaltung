<script lang="ts">
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { addVineyard, selectVineyard } from '$lib/stores/vineyard.js'
	import type { DirectionLabel } from '$lib/models/types.js'

	let name = $state('')
	let rowCount = $state(10)
	let directionLabel: DirectionLabel = $state('top_bottom')

	async function handleSubmit(e: Event) {
		e.preventDefault()
		const trimmed = name.trim()
		if (!trimmed) return
		const vineyard = await addVineyard(trimmed, rowCount, directionLabel)
		await selectVineyard(vineyard.id)
		goto(resolve('/'))
	}
</script>

<div class="space-y-6">
	<h2 class="text-xl font-semibold">New vineyard</h2>

	<form onsubmit={handleSubmit} class="space-y-4">
		<div>
			<label for="name" class="block text-sm font-medium text-gray-700"
				>Name</label
			>
			<input
				id="name"
				type="text"
				bind:value={name}
				placeholder="e.g. Halde"
				class="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
				required
			/>
		</div>

		<div>
			<label for="row_count" class="block text-sm font-medium text-gray-700"
				>Number of rows</label
			>
			<input
				id="row_count"
				type="number"
				bind:value={rowCount}
				min="1"
				max="100"
				class="mt-1 block w-24 border border-gray-300 rounded px-3 py-2"
				required
			/>
		</div>

		<div>
			<label
				for="direction_label"
				class="block text-sm font-medium text-gray-700">Walking direction</label
			>
			<select
				id="direction_label"
				bind:value={directionLabel}
				class="mt-1 border border-gray-300 rounded px-3 py-2"
			>
				<option value="top_bottom">Top / Bottom</option>
				<option value="left_right">Left / Right</option>
			</select>
		</div>

		<button
			type="submit"
			class="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800"
		>
			Create
		</button>
	</form>

	<a href={resolve('/')} class="text-green-700 text-sm hover:underline"
		>← Back</a
	>
</div>
