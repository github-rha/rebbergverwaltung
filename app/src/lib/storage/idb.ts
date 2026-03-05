import { get, set, del, keys } from 'idb-keyval'
import type {
	Vineyard,
	Scan,
	RowVideo,
	BbchResult,
	VineMap,
	Settings
} from '$lib/models/types.js'

const SETTINGS_KEY = 'settings'

function vineyardKey(id: string): string {
	return `vineyard:${id}`
}

function scanKey(id: string): string {
	return `scan:${id}`
}

function rowVideoKey(id: string): string {
	return `rowvideo:${id}`
}

function videoBlobKey(id: string): string {
	return `video-blob:${id}`
}

function bbchKey(id: string): string {
	return `bbch:${id}`
}

function vineMapKey(id: string): string {
	return `vinemap:${id}`
}

// --- Vineyards ---

export async function saveVineyard(vineyard: Vineyard): Promise<void> {
	await set(vineyardKey(vineyard.id), vineyard)
}

export async function loadVineyard(id: string): Promise<Vineyard | undefined> {
	return get<Vineyard>(vineyardKey(id))
}

export async function deleteVineyard(id: string): Promise<void> {
	await del(vineyardKey(id))
}

export async function listVineyards(): Promise<Vineyard[]> {
	const allKeys = await keys()
	const vineyardKeys = allKeys.filter(
		(k) => typeof k === 'string' && k.startsWith('vineyard:')
	)
	const vineyards: Vineyard[] = []
	for (const k of vineyardKeys) {
		const v = await get<Vineyard>(k)
		if (v) vineyards.push(v)
	}
	return vineyards.sort((a, b) => a.name.localeCompare(b.name))
}

// --- Scans ---

export async function saveScan(scan: Scan): Promise<void> {
	await set(scanKey(scan.id), scan)
}

export async function loadScan(id: string): Promise<Scan | undefined> {
	return get<Scan>(scanKey(id))
}

export async function deleteScan(id: string): Promise<void> {
	const videos = await listRowVideos(id)
	for (const v of videos) {
		await del(videoBlobKey(v.id))
		await del(rowVideoKey(v.id))
	}
	await deleteBbchResults(id)
	await del(scanKey(id))
}

export async function listScans(vineyardId: string): Promise<Scan[]> {
	const allKeys = await keys()
	const scanKeys = allKeys.filter(
		(k) => typeof k === 'string' && k.startsWith('scan:')
	)
	const scans: Scan[] = []
	for (const k of scanKeys) {
		const s = await get<Scan>(k)
		if (s && s.vineyard_id === vineyardId) scans.push(s)
	}
	return scans.sort(
		(a, b) =>
			new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
	)
}

// --- Row Videos ---

export async function saveRowVideo(rowVideo: RowVideo): Promise<void> {
	await set(rowVideoKey(rowVideo.id), rowVideo)
}

export async function loadRowVideo(id: string): Promise<RowVideo | undefined> {
	return get<RowVideo>(rowVideoKey(id))
}

export async function deleteRowVideo(id: string): Promise<void> {
	await del(videoBlobKey(id))
	await del(rowVideoKey(id))
}

export async function listRowVideos(scanId: string): Promise<RowVideo[]> {
	const allKeys = await keys()
	const rvKeys = allKeys.filter(
		(k) => typeof k === 'string' && k.startsWith('rowvideo:')
	)
	const videos: RowVideo[] = []
	for (const k of rvKeys) {
		const rv = await get<RowVideo>(k)
		if (rv && rv.scan_id === scanId) videos.push(rv)
	}
	return videos.sort((a, b) => a.row_number - b.row_number)
}

// --- Video Blobs ---

export async function saveVideoBlob(id: string, blob: Blob): Promise<void> {
	await set(videoBlobKey(id), blob)
}

export async function loadVideoBlob(id: string): Promise<Blob | undefined> {
	return get<Blob>(videoBlobKey(id))
}

export async function deleteVideoBlob(id: string): Promise<void> {
	await del(videoBlobKey(id))
}

// --- BBCH Results ---

export async function saveBbchResult(result: BbchResult): Promise<void> {
	await set(bbchKey(result.id), result)
}

export async function loadBbchResults(scanId: string): Promise<BbchResult[]> {
	const allKeys = await keys()
	const bKeys = allKeys.filter(
		(k) => typeof k === 'string' && k.startsWith('bbch:')
	)
	const results: BbchResult[] = []
	for (const k of bKeys) {
		const r = await get<BbchResult>(k)
		if (r && r.scan_id === scanId) results.push(r)
	}
	return results.sort(
		(a, b) => a.row_number - b.row_number || a.vine_index - b.vine_index
	)
}

export async function deleteBbchResults(scanId: string): Promise<void> {
	const allKeys = await keys()
	const bKeys = allKeys.filter(
		(k) => typeof k === 'string' && k.startsWith('bbch:')
	)
	for (const k of bKeys) {
		const r = await get<BbchResult>(k)
		if (r && r.scan_id === scanId) await del(k)
	}
}

// --- VineMap ---

export async function saveVineMapEntries(entries: VineMap[]): Promise<void> {
	for (const entry of entries) {
		await set(vineMapKey(entry.id), entry)
	}
}

export async function loadVineMap(vineyardId: string): Promise<VineMap[]> {
	const allKeys = await keys()
	const vmKeys = allKeys.filter(
		(k) => typeof k === 'string' && k.startsWith('vinemap:')
	)
	const entries: VineMap[] = []
	for (const k of vmKeys) {
		const vm = await get<VineMap>(k)
		if (vm && vm.vineyard_id === vineyardId) entries.push(vm)
	}
	return entries.sort(
		(a, b) => a.row_number - b.row_number || a.vine_index - b.vine_index
	)
}

export async function deleteVineMap(vineyardId: string): Promise<void> {
	const allKeys = await keys()
	const vmKeys = allKeys.filter(
		(k) => typeof k === 'string' && k.startsWith('vinemap:')
	)
	for (const k of vmKeys) {
		const vm = await get<VineMap>(k)
		if (vm && vm.vineyard_id === vineyardId) await del(k)
	}
}

// --- Settings ---

export async function saveSettings(settings: Settings): Promise<void> {
	await set(SETTINGS_KEY, settings)
}

export async function loadSettings(): Promise<Settings> {
	const s = await get<Settings>(SETTINGS_KEY)
	return s ?? { github_repo: '', github_pat: '', google_api_key: '' }
}
