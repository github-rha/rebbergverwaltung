const SEEK_TIMEOUT_MS = 5_000
const LOAD_TIMEOUT_MS = 10_000

function seekTo(video: HTMLVideoElement, timestampSec: number): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error('Seek timed out'))
		}, SEEK_TIMEOUT_MS)

		video.onseeked = () => {
			clearTimeout(timer)
			resolve()
		}
		video.onerror = () => {
			clearTimeout(timer)
			reject(new Error('Video error during seek'))
		}

		video.currentTime = Math.min(timestampSec, video.duration)
	})
}

function grabFrame(video: HTMLVideoElement): Promise<Blob> {
	const canvas = document.createElement('canvas')
	canvas.width = video.videoWidth
	canvas.height = video.videoHeight
	const ctx = canvas.getContext('2d')
	if (!ctx) return Promise.reject(new Error('Could not get canvas context'))
	ctx.drawImage(video, 0, 0)
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) resolve(blob)
				else reject(new Error('Canvas toBlob failed'))
			},
			'image/jpeg',
			0.8
		)
	})
}

function loadVideo(url: string): Promise<HTMLVideoElement> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			video.src = ''
			reject(new Error('Video load timed out'))
		}, LOAD_TIMEOUT_MS)

		const video = document.createElement('video')
		video.muted = true
		video.preload = 'auto'
		video.playsInline = true

		video.onerror = () => {
			clearTimeout(timer)
			reject(new Error('Failed to load video'))
		}
		video.onloadeddata = () => {
			clearTimeout(timer)
			resolve(video)
		}

		video.src = url
	})
}

export async function extractFrame(
	videoBlob: Blob,
	timestampSec: number
): Promise<Blob> {
	const url = URL.createObjectURL(videoBlob)
	try {
		const video = await loadVideo(url)
		await seekTo(video, timestampSec)
		return await grabFrame(video)
	} finally {
		URL.revokeObjectURL(url)
	}
}

export async function extractFrames(
	videoBlob: Blob,
	timestamps: { id: string; sec: number }[]
): Promise<Map<string, Blob>> {
	const results = new Map<string, Blob>()
	if (timestamps.length === 0) return results

	const url = URL.createObjectURL(videoBlob)
	try {
		const video = await loadVideo(url)
		for (const { id, sec } of timestamps) {
			try {
				await seekTo(video, sec)
				const frame = await grabFrame(video)
				results.set(id, frame)
			} catch {
				// best-effort per frame
			}
		}
	} finally {
		URL.revokeObjectURL(url)
	}
	return results
}
