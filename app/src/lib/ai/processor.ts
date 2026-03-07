import * as idb from '$lib/storage/idb.js'
import { uploadVideo, analyzeRowVideo } from '$lib/ai/gemini.js'
import { extractFrame } from '$lib/ai/frames.js'
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
		const isInventory = scan?.is_inventory ?? false
		let vineContext: string | undefined
		let vineyardId = ''

		if (scan) {
			vineyardId = scan.vineyard_id
			const vineMap = await idb.loadVineMap(scan.vineyard_id)
			const rowVines = vineMap.filter((v) => v.row_number === rv.row_number)
			if (rowVines.length > 0 && !isInventory) {
				const present = rowVines.filter((v) => v.status === 'present').length
				const details = rowVines
					.filter((v) => v.status !== 'present')
					.map((v) => `vine ${v.vine_index} is ${v.status}`)
				vineContext = `This row has ${rowVines.length} vines (${present} present).`
				if (details.length > 0) {
					vineContext += ` ${details.join(', ')}.`
				}
			}
		}

		const result = await analyzeRowVideo(
			apiKey,
			file,
			rv.scan_id,
			rv.row_number,
			isInventory,
			vineContext
		)

		for (const bbch of result.bbchResults) {
			await idb.saveBbchResult(bbch)
		}

		for (const bbch of result.bbchResults) {
			if (bbch.timestamp_sec != null) {
				try {
					const frame = await extractFrame(blob, bbch.timestamp_sec)
					await idb.saveThumbnail(bbch.id, frame)
				} catch {
					// frame extraction is best-effort
				}
			}
		}

		if (isInventory && result.vineMapEntries.length > 0) {
			const entries = result.vineMapEntries.map((e) => ({
				...e,
				vineyard_id: vineyardId
			}))
			await idb.saveVineMapEntries(entries)
		}

		await setStatus(videoId, 'DONE')
	} catch (err) {
		await setStatus(videoId, 'FAILED').catch(() => {})
		throw err
	}
}
