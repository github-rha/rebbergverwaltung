import * as idb from '$lib/storage/idb.js'
import { uploadVideo, analyzeRowVideo } from '$lib/ai/gemini.js'
import type { VideoStatus } from '$lib/models/types.js'

async function setStatus(videoId: string, status: VideoStatus): Promise<void> {
	const rv = await idb.loadRowVideo(videoId)
	if (!rv) throw new Error(`RowVideo ${videoId} not found`)
	rv.status = status
	await idb.saveRowVideo(rv)
}

export async function processVideo(
	videoId: string,
	apiKey: string
): Promise<void> {
	const rv = await idb.loadRowVideo(videoId)
	if (!rv) throw new Error(`RowVideo ${videoId} not found`)

	try {
		await setStatus(videoId, 'UPLOADING')

		const blob = await idb.loadVideoBlob(videoId)
		if (!blob) throw new Error('Video blob not found')

		const file = await uploadVideo(apiKey, blob)

		await setStatus(videoId, 'PROCESSING')

		const scan = await idb.loadScan(rv.scan_id)
		let vineCount: number | undefined
		if (scan) {
			const allVineMap = await idb.loadVineMap(scan.vineyard_id)
			const rowVines = allVineMap.filter((v) => v.row_number === rv.row_number)
			if (rowVines.length > 0) vineCount = rowVines.length
		}

		const results = await analyzeRowVideo(
			apiKey,
			file,
			rv.scan_id,
			rv.row_number,
			vineCount
		)

		for (const result of results) {
			await idb.saveBbchResult(result)
		}

		await setStatus(videoId, 'DONE')
	} catch (err) {
		await setStatus(videoId, 'FAILED').catch(() => {})
		throw err
	}
}
