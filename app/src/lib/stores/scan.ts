import { writable } from 'svelte/store'
import type { Scan, RowVideo, GpsPoint } from '$lib/models/types.js'
import { createId, createTimestamp } from '$lib/models/types.js'
import * as idb from '$lib/storage/idb.js'

export const scans = writable<Scan[]>([])
export const rowVideos = writable<RowVideo[]>([])

export async function loadScans(vineyardId: string): Promise<void> {
	const list = await idb.listScans(vineyardId)
	scans.set(list)
}

export async function addScan(vineyardId: string, note: string): Promise<Scan> {
	const scan: Scan = {
		id: createId(),
		vineyard_id: vineyardId,
		created_at: createTimestamp(),
		note
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
