import { writable } from 'svelte/store'
import type {
	Scan,
	RowVideo,
	GpsPoint,
	BbchResult,
	VideoStatus
} from '$lib/models/types.js'
import { createId, createTimestamp } from '$lib/models/types.js'
import * as idb from '$lib/storage/idb.js'
import { processVideo, type ProgressCallback } from '$lib/ai/processor.js'

export const scans = writable<Scan[]>([])
export const rowVideos = writable<RowVideo[]>([])
export const bbchResults = writable<BbchResult[]>([])

export async function loadScans(vineyardId: string): Promise<void> {
	const list = await idb.listScans(vineyardId)
	scans.set(list)
}

export async function addScan(
	vineyardId: string,
	note: string,
	isInventory: boolean = false
): Promise<Scan> {
	const scan: Scan = {
		id: createId(),
		vineyard_id: vineyardId,
		created_at: createTimestamp(),
		note,
		is_inventory: isInventory
	}
	await idb.saveScan(scan)
	await loadScans(vineyardId)
	return scan
}

export async function removeScan(
	vineyardId: string,
	scanId: string
): Promise<void> {
	await idb.deleteScan(scanId)
	await loadScans(vineyardId)
}

export async function loadRowVideos(scanId: string): Promise<void> {
	const list = await idb.listRowVideos(scanId)
	rowVideos.set(list)
}

export async function addRowVideo(
	scanId: string,
	rowNumber: number,
	direction: RowVideo['direction'],
	blob: Blob,
	gpsStart?: GpsPoint,
	gpsEnd?: GpsPoint
): Promise<RowVideo> {
	const id = createId()
	const rowVideo: RowVideo = {
		id,
		scan_id: scanId,
		row_number: rowNumber,
		direction,
		local_uri: `video-blob:${id}`,
		cloud_uri: '',
		status: 'LOCAL_ONLY',
		gps_start: gpsStart,
		gps_end: gpsEnd,
		created_at: createTimestamp()
	}
	await idb.saveVideoBlob(id, blob)
	await idb.saveRowVideo(rowVideo)
	await loadRowVideos(scanId)
	return rowVideo
}

export async function removeRowVideo(
	scanId: string,
	videoId: string
): Promise<void> {
	await idb.deleteRowVideo(videoId)
	await loadRowVideos(scanId)
}

export async function updateVideoStatus(
	scanId: string,
	videoId: string,
	status: VideoStatus
): Promise<void> {
	const rv = await idb.loadRowVideo(videoId)
	if (!rv) return
	rv.status = status
	await idb.saveRowVideo(rv)
	await loadRowVideos(scanId)
}

export async function processRowVideo(
	scanId: string,
	videoId: string,
	apiKey: string,
	onProgress?: ProgressCallback
): Promise<void> {
	await processVideo(videoId, apiKey, onProgress)
	await loadRowVideos(scanId)
	await loadBbchResults(scanId)
}

export async function loadBbchResults(scanId: string): Promise<void> {
	const list = await idb.loadBbchResults(scanId)
	bbchResults.set(list)
}

export async function purgeVideos(scanId: string): Promise<void> {
	const videos = await idb.listRowVideos(scanId)
	for (const v of videos) {
		if (v.status === 'DONE' && v.local_uri) {
			await idb.purgeVideoBlob(v.id)
		}
	}
	await loadRowVideos(scanId)
}
