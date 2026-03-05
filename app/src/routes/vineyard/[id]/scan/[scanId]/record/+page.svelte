<script lang="ts">
	import { resolve } from '$app/paths'
	import { goto } from '$app/navigation'
	import { page } from '$app/state'
	import { onMount, onDestroy } from 'svelte'
	import { addRowVideo } from '$lib/stores/scan.js'
	import * as idb from '$lib/storage/idb.js'
	import type { GpsPoint, RowVideo, Vineyard } from '$lib/models/types.js'

	const vineyardId = $derived(page.params.id)
	const scanId = $derived(page.params.scanId)

	let vineyard: Vineyard | undefined = $state(undefined)
	let rowNumber = $state(1)
	let direction: RowVideo['direction'] = $state('top_to_bottom')

	let videoEl: HTMLVideoElement | undefined = $state(undefined)
	let stream: MediaStream | undefined = $state(undefined)
	let recorder: MediaRecorder | undefined = $state(undefined)
	let chunks: Blob[] = $state([])

	let recording = $state(false)
	let recorded = $state(false)
	let saving = $state(false)
	let error = $state('')

	let recordedBlob: Blob | undefined = $state(undefined)
	let previewUrl: string | undefined = $state(undefined)

	let gpsStart: GpsPoint | undefined = $state(undefined)
	let gpsEnd: GpsPoint | undefined = $state(undefined)
	let watchId: number | undefined = $state(undefined)
	let lastPosition: GpsPoint | undefined = $state(undefined)

	const directionOptions = $derived.by(() => {
		if (!vineyard || vineyard.direction_label === 'top_bottom') {
			return {
				a: 'top_to_bottom',
				aLabel: 'Top → Bottom',
				b: 'bottom_to_top',
				bLabel: 'Bottom → Top'
			} as const
		}
		return {
			a: 'top_to_bottom',
			aLabel: 'Left → Right',
			b: 'bottom_to_top',
			bLabel: 'Right → Left'
		} as const
	})

	const directionDisplay = $derived(
		direction === 'top_to_bottom'
			? directionOptions.aLabel
			: directionOptions.bLabel
	)

	onMount(async () => {
		vineyard = await idb.loadVineyard(vineyardId)
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' },
				audio: false
			})
			if (videoEl) {
				videoEl.srcObject = stream
			}
		} catch {
			error = 'Could not access camera. Check permissions.'
		}
	})

	onDestroy(() => {
		stopGps()
		if (stream) {
			for (const track of stream.getTracks()) {
				track.stop()
			}
		}
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl)
		}
	})

	function startGps() {
		if (!navigator.geolocation) return
		watchId = navigator.geolocation.watchPosition(
			(pos) => {
				const point: GpsPoint = {
					lat: pos.coords.latitude,
					lng: pos.coords.longitude
				}
				if (!gpsStart) gpsStart = point
				lastPosition = point
			},
			() => {},
			{ enableHighAccuracy: true }
		)
	}

	function stopGps() {
		if (watchId !== undefined) {
			navigator.geolocation.clearWatch(watchId)
			watchId = undefined
		}
		if (lastPosition) gpsEnd = lastPosition
	}

	function getMimeType(): string {
		if (MediaRecorder.isTypeSupported('video/mp4')) return 'video/mp4'
		if (MediaRecorder.isTypeSupported('video/webm')) return 'video/webm'
		return ''
	}

	function startRecording() {
		if (!stream) return
		error = ''
		chunks = []

		const mimeType = getMimeType()
		const options: MediaRecorderOptions = {}
		if (mimeType) options.mimeType = mimeType

		recorder = new MediaRecorder(stream, options)
		recorder.ondataavailable = (e) => {
			if (e.data.size > 0) chunks.push(e.data)
		}
		recorder.onstop = () => {
			const mType = recorder?.mimeType || 'video/webm'
			recordedBlob = new Blob(chunks, { type: mType })
			previewUrl = URL.createObjectURL(recordedBlob)
			recorded = true
		}

		recorder.start()
		recording = true
		startGps()
	}

	function stopRecording() {
		if (recorder && recorder.state === 'recording') {
			recorder.stop()
		}
		recording = false
		stopGps()

		if (stream) {
			for (const track of stream.getTracks()) {
				track.stop()
			}
			stream = undefined
		}
	}

	async function save() {
		if (!recordedBlob) return
		saving = true
		await addRowVideo(
			scanId,
			rowNumber,
			direction,
			recordedBlob,
			gpsStart,
			gpsEnd
		)
		await goto(
			resolve('/vineyard/[id]/scan/[scanId]', {
				id: vineyardId,
				scanId
			})
		)
	}

	function discard() {
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl)
			previewUrl = undefined
		}
		recordedBlob = undefined
		recorded = false
		chunks = []
		gpsStart = undefined
		gpsEnd = undefined
		lastPosition = undefined

		navigator.mediaDevices
			.getUserMedia({
				video: { facingMode: 'environment' },
				audio: false
			})
			.then((s) => {
				stream = s
				if (videoEl) videoEl.srcObject = s
			})
			.catch(() => {
				error = 'Could not re-access camera.'
			})
	}
</script>

<div class="space-y-4">
	<h2 class="text-xl font-semibold">Record row</h2>

	{#if error}
		<p class="text-red-600 text-sm">{error}</p>
	{/if}

	{#if !recorded}
		<div class="space-y-3">
			<div class="flex gap-4">
				<div>
					<label for="row" class="block text-sm font-medium text-gray-700"
						>Row</label
					>
					<select
						id="row"
						bind:value={rowNumber}
						class="mt-1 border border-gray-300 rounded px-3 py-2"
						disabled={recording}
					>
						{#each Array.from({ length: vineyard?.row_count ?? 10 }, (_, i) => i + 1) as n (n)}
							<option value={n}>{n}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="direction" class="block text-sm font-medium text-gray-700"
						>Direction</label
					>
					<select
						id="direction"
						bind:value={direction}
						class="mt-1 border border-gray-300 rounded px-3 py-2"
						disabled={recording}
					>
						<option value="top_to_bottom">{directionOptions.aLabel}</option>
						<option value="bottom_to_top">{directionOptions.bLabel}</option>
					</select>
				</div>
			</div>

			<video
				bind:this={videoEl}
				autoplay
				playsinline
				muted
				class="w-full rounded bg-black aspect-video"
			></video>

			{#if !recording}
				<button
					onclick={startRecording}
					disabled={!stream}
					class="w-full bg-red-600 text-white px-4 py-3 rounded text-lg font-medium hover:bg-red-700 disabled:opacity-50"
				>
					Start recording
				</button>
			{:else}
				<button
					onclick={stopRecording}
					class="w-full bg-gray-800 text-white px-4 py-3 rounded text-lg font-medium hover:bg-gray-900"
				>
					Stop recording
				</button>
			{/if}
		</div>
	{:else}
		<div class="space-y-3">
			<p class="text-sm text-gray-600">
				Row {rowNumber} · {directionDisplay}
			</p>

			{#if previewUrl}
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					src={previewUrl}
					controls
					playsinline
					class="w-full rounded bg-black aspect-video"
				></video>
			{/if}

			<div class="flex gap-2">
				<button
					onclick={save}
					disabled={saving}
					class="flex-1 bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 disabled:opacity-50"
				>
					{saving ? 'Saving…' : 'Save'}
				</button>
				<button
					onclick={discard}
					disabled={saving}
					class="flex-1 border border-gray-300 px-4 py-2 rounded hover:bg-gray-100 disabled:opacity-50"
				>
					Discard
				</button>
			</div>
		</div>
	{/if}

	<a
		href={resolve('/vineyard/[id]/scan/[scanId]', {
			id: vineyardId,
			scanId
		})}
		class="text-green-700 text-sm hover:underline">← Back to scan</a
	>
</div>
