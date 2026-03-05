<script lang="ts">
	import '../app.css'
	import Header from '$lib/components/Header.svelte'
	import { loadVineyards } from '$lib/stores/vineyard.js'
	import { loadSettingsStore } from '$lib/stores/settings.js'
	import { onMount } from 'svelte'

	let { children } = $props()

	onMount(() => {
		loadVineyards()
		loadSettingsStore()
	})
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
	<Header />
	<main class="flex-1 p-4 max-w-lg mx-auto w-full">
		{@render children()}
	</main>
</div>
