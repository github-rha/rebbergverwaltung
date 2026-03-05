<script lang="ts">
	import { resolve } from '$app/paths'
	import { settings, saveSettingsStore } from '$lib/stores/settings.js'
	import {
		vineyards,
		currentVineyardId,
		removeVineyard,
		selectVineyard
	} from '$lib/stores/vineyard.js'

	let form = $derived.by(() => ({ ...$settings }))
	let saved = $state(false)
	let confirmingDeleteId: string | null = $state(null)

	async function handleSubmit(e: Event) {
		e.preventDefault()
		await saveSettingsStore(form)
		saved = true
		setTimeout(() => (saved = false), 2000)
	}

	async function handleDeleteVineyard(id: string) {
		if (confirmingDeleteId !== id) {
			confirmingDeleteId = id
			return
		}
		if ($currentVineyardId === id) {
			await selectVineyard(null)
		}
		await removeVineyard(id)
		confirmingDeleteId = null
	}
</script>

<div class="space-y-6">
	<h2 class="text-xl font-semibold">Settings</h2>

	<form onsubmit={handleSubmit} class="space-y-4">
		<div>
			<label for="github_repo" class="block text-sm font-medium text-gray-700">
				GitHub repository
			</label>
			<input
				id="github_repo"
				type="text"
				bind:value={form.github_repo}
				placeholder="owner/repo"
				class="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
			/>
		</div>

		<div>
			<label for="github_pat" class="block text-sm font-medium text-gray-700">
				GitHub PAT
			</label>
			<input
				id="github_pat"
				type="password"
				bind:value={form.github_pat}
				placeholder="ghp_…"
				class="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
			/>
		</div>

		<div>
			<label
				for="google_api_key"
				class="block text-sm font-medium text-gray-700"
			>
				Google API key
			</label>
			<input
				id="google_api_key"
				type="password"
				bind:value={form.google_api_key}
				placeholder="AIza…"
				class="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
			/>
		</div>

		<div class="flex items-center gap-3">
			<button
				type="submit"
				class="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800"
			>
				Save
			</button>
			{#if saved}
				<span class="text-green-700 text-sm">Saved</span>
			{/if}
		</div>
	</form>

	{#if $vineyards.length > 0}
		<div class="border-t pt-6">
			<h3 class="font-medium text-red-700 mb-3">Delete vineyard</h3>
			<ul class="space-y-2">
				{#each $vineyards as vineyard (vineyard.id)}
					<li class="flex items-center justify-between">
						<span>{vineyard.name}</span>
						{#if confirmingDeleteId === vineyard.id}
							<div class="flex gap-2">
								<button
									onclick={() => handleDeleteVineyard(vineyard.id)}
									class="bg-red-700 text-white px-3 py-1 rounded text-sm hover:bg-red-800"
								>
									Confirm
								</button>
								<button
									onclick={() => (confirmingDeleteId = null)}
									class="border border-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-100"
								>
									Cancel
								</button>
							</div>
						{:else}
							<button
								onclick={() => handleDeleteVineyard(vineyard.id)}
								class="border border-red-300 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-50"
							>
								Delete
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<a href={resolve('/')} class="text-green-700 text-sm hover:underline"
		>← Back</a
	>
</div>
