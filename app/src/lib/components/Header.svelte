<script lang="ts">
	import { resolve } from '$app/paths'
	import { onMount } from 'svelte'

	let online = $state(true)

	onMount(() => {
		online = navigator.onLine
		const setOnline = () => (online = true)
		const setOffline = () => (online = false)
		window.addEventListener('online', setOnline)
		window.addEventListener('offline', setOffline)
		return () => {
			window.removeEventListener('online', setOnline)
			window.removeEventListener('offline', setOffline)
		}
	})
</script>

<header
	class="bg-green-800 text-white px-4 py-3 flex items-center justify-between"
>
	<a href={resolve('/')} class="text-lg font-semibold no-underline text-white"
		>Rebbergverwaltung</a
	>
	<div class="flex items-center gap-3">
		{#if !online}
			<span class="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded"
				>Offline</span
			>
		{/if}
		<a
			href={resolve('/settings')}
			class="text-white no-underline"
			aria-label="Settings"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
					clip-rule="evenodd"
				/>
			</svg>
		</a>
	</div>
</header>
