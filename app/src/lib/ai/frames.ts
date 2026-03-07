const TIMEOUT_MS = 10_000

export async function extractFrame(
	videoBlob: Blob,
	timestampSec: number
): Promise<Blob> {
	const url = URL.createObjectURL(videoBlob)
	try {
		return await new Promise<Blob>((resolve, reject) => {
			const timer = setTimeout(() => {
				video.src = ''
				reject(new Error('Frame extraction timed out'))
			}, TIMEOUT_MS)

			const video = document.createElement('video')
			video.muted = true
			video.preload = 'auto'
			video.playsInline = true

			video.onerror = () => {
				clearTimeout(timer)
				reject(new Error('Failed to load video for frame extraction'))
			}

			video.onloadedmetadata = () => {
				video.currentTime = Math.min(timestampSec, video.duration)
			}

			video.onseeked = () => {
				clearTimeout(timer)
				const canvas = document.createElement('canvas')
				canvas.width = video.videoWidth
				canvas.height = video.videoHeight
				const ctx = canvas.getContext('2d')
				if (!ctx) {
					reject(new Error('Could not get canvas context'))
					return
				}
				ctx.drawImage(video, 0, 0)
				canvas.toBlob(
					(blob) => {
						if (blob) resolve(blob)
						else reject(new Error('Canvas toBlob failed'))
					},
					'image/jpeg',
					0.8
				)
			}

			video.src = url
		})
	} finally {
		URL.revokeObjectURL(url)
	}
}
