import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { clear } from 'idb-keyval'
import {
	saveVineyard,
	loadVineyard,
	deleteVineyard,
	listVineyards,
	saveScan,
	loadScan,
	deleteScan,
	listScans,
	saveRowVideo,
	loadRowVideo,
	deleteRowVideo,
	listRowVideos,
	saveVideoBlob,
	loadVideoBlob,
	saveBbchResult,
	loadBbchResults,
	deleteBbchResults,
	saveVineMapEntries,
	loadVineMap,
	deleteVineMap,
	saveSettings,
	loadSettings
} from '$lib/storage/idb.js'
import { createId, createTimestamp } from '$lib/models/types.js'
import type {
	Vineyard,
	Scan,
	RowVideo,
	BbchResult,
	VineMap,
	Settings
} from '$lib/models/types.js'

beforeEach(async () => {
	await clear()
})

describe('vineyard CRUD', () => {
	it('saves and loads a vineyard', async () => {
		const v: Vineyard = {
			id: createId(),
			name: 'Halde',
			row_count: 10,
			direction_label: 'top_bottom',
			created_at: createTimestamp()
		}
		await saveVineyard(v)
		const loaded = await loadVineyard(v.id)
		expect(loaded).toEqual(v)
	})

	it('returns undefined for missing vineyard', async () => {
		const loaded = await loadVineyard('nonexistent')
		expect(loaded).toBeUndefined()
	})

	it('lists vineyards sorted by name', async () => {
		const v1: Vineyard = {
			id: createId(),
			name: 'Zwickel',
			row_count: 10,
			direction_label: 'top_bottom',
			created_at: createTimestamp()
		}
		const v2: Vineyard = {
			id: createId(),
			name: 'Acker',
			row_count: 8,
			direction_label: 'left_right',
			created_at: createTimestamp()
		}
		await saveVineyard(v1)
		await saveVineyard(v2)
		const list = await listVineyards()
		expect(list).toHaveLength(2)
		expect(list[0].name).toBe('Acker')
		expect(list[1].name).toBe('Zwickel')
	})

	it('deletes a vineyard', async () => {
		const v: Vineyard = {
			id: createId(),
			name: 'Halde',
			row_count: 10,
			direction_label: 'top_bottom',
			created_at: createTimestamp()
		}
		await saveVineyard(v)
		await deleteVineyard(v.id)
		expect(await loadVineyard(v.id)).toBeUndefined()
	})
})

describe('scan CRUD', () => {
	it('saves and loads a scan', async () => {
		const s: Scan = {
			id: createId(),
			vineyard_id: createId(),
			created_at: createTimestamp(),
			note: 'Early season'
		}
		await saveScan(s)
		const loaded = await loadScan(s.id)
		expect(loaded).toEqual(s)
	})

	it('returns undefined for missing scan', async () => {
		expect(await loadScan('nonexistent')).toBeUndefined()
	})

	it('lists scans filtered by vineyard, newest first', async () => {
		const vid = createId()
		const s1: Scan = {
			id: createId(),
			vineyard_id: vid,
			created_at: '2026-03-01T10:00:00.000Z',
			note: 'first'
		}
		const s2: Scan = {
			id: createId(),
			vineyard_id: vid,
			created_at: '2026-03-05T10:00:00.000Z',
			note: 'second'
		}
		const s3: Scan = {
			id: createId(),
			vineyard_id: createId(),
			created_at: '2026-03-03T10:00:00.000Z',
			note: 'other vineyard'
		}
		await saveScan(s1)
		await saveScan(s2)
		await saveScan(s3)
		const list = await listScans(vid)
		expect(list).toHaveLength(2)
		expect(list[0].note).toBe('second')
		expect(list[1].note).toBe('first')
	})

	it('deleting a scan cascades to its row videos and blobs', async () => {
		const scanId = createId()
		const s: Scan = {
			id: scanId,
			vineyard_id: createId(),
			created_at: createTimestamp(),
			note: ''
		}
		const rv: RowVideo = {
			id: createId(),
			scan_id: scanId,
			row_number: 1,
			direction: 'top_to_bottom',
			local_uri: `video-blob:${createId()}`,
			cloud_uri: '',
			status: 'LOCAL_ONLY',
			created_at: createTimestamp()
		}
		const blob = new Blob(['video data'], { type: 'video/mp4' })
		await saveScan(s)
		await saveRowVideo(rv)
		await saveVideoBlob(rv.id, blob)

		await deleteScan(scanId)

		expect(await loadScan(scanId)).toBeUndefined()
		expect(await loadRowVideo(rv.id)).toBeUndefined()
		expect(await loadVideoBlob(rv.id)).toBeUndefined()
	})
})

describe('row video CRUD', () => {
	it('saves and loads a row video', async () => {
		const rv: RowVideo = {
			id: createId(),
			scan_id: createId(),
			row_number: 3,
			direction: 'bottom_to_top',
			local_uri: '',
			cloud_uri: '',
			status: 'LOCAL_ONLY',
			created_at: createTimestamp()
		}
		await saveRowVideo(rv)
		const loaded = await loadRowVideo(rv.id)
		expect(loaded).toEqual(rv)
	})

	it('lists row videos filtered by scan, sorted by row number', async () => {
		const scanId = createId()
		const rv1: RowVideo = {
			id: createId(),
			scan_id: scanId,
			row_number: 5,
			direction: 'top_to_bottom',
			local_uri: '',
			cloud_uri: '',
			status: 'LOCAL_ONLY',
			created_at: createTimestamp()
		}
		const rv2: RowVideo = {
			id: createId(),
			scan_id: scanId,
			row_number: 2,
			direction: 'top_to_bottom',
			local_uri: '',
			cloud_uri: '',
			status: 'LOCAL_ONLY',
			created_at: createTimestamp()
		}
		const rv3: RowVideo = {
			id: createId(),
			scan_id: createId(),
			row_number: 1,
			direction: 'top_to_bottom',
			local_uri: '',
			cloud_uri: '',
			status: 'LOCAL_ONLY',
			created_at: createTimestamp()
		}
		await saveRowVideo(rv1)
		await saveRowVideo(rv2)
		await saveRowVideo(rv3)
		const list = await listRowVideos(scanId)
		expect(list).toHaveLength(2)
		expect(list[0].row_number).toBe(2)
		expect(list[1].row_number).toBe(5)
	})

	it('deleting a row video also deletes its blob', async () => {
		const id = createId()
		const rv: RowVideo = {
			id,
			scan_id: createId(),
			row_number: 1,
			direction: 'top_to_bottom',
			local_uri: `video-blob:${id}`,
			cloud_uri: '',
			status: 'LOCAL_ONLY',
			created_at: createTimestamp()
		}
		const blob = new Blob(['data'], { type: 'video/webm' })
		await saveRowVideo(rv)
		await saveVideoBlob(id, blob)

		await deleteRowVideo(id)

		expect(await loadRowVideo(id)).toBeUndefined()
		expect(await loadVideoBlob(id)).toBeUndefined()
	})
})

describe('video blob storage', () => {
	it('saves and loads a blob', async () => {
		const id = createId()
		const blob = new Blob(['test video content'], { type: 'video/mp4' })
		await saveVideoBlob(id, blob)
		const loaded = await loadVideoBlob(id)
		expect(loaded).toBeInstanceOf(Blob)
		expect(loaded!.size).toBe(blob.size)
	})

	it('returns undefined for missing blob', async () => {
		expect(await loadVideoBlob('nonexistent')).toBeUndefined()
	})
})

describe('bbch result CRUD', () => {
	it('saves and loads results by scan', async () => {
		const scanId = createId()
		const r1: BbchResult = {
			id: createId(),
			scan_id: scanId,
			row_number: 1,
			vine_index: 1,
			bbch_pred: 55,
			confidence: 0.9,
			model_version: 'gemini-2.0-flash',
			created_at: createTimestamp()
		}
		const r2: BbchResult = {
			id: createId(),
			scan_id: scanId,
			row_number: 1,
			vine_index: 2,
			bbch_pred: 61,
			confidence: 0.85,
			model_version: 'gemini-2.0-flash',
			created_at: createTimestamp()
		}
		const r3: BbchResult = {
			id: createId(),
			scan_id: createId(),
			row_number: 1,
			vine_index: 1,
			bbch_pred: 65,
			confidence: 0.88,
			model_version: 'gemini-2.0-flash',
			created_at: createTimestamp()
		}
		await saveBbchResult(r1)
		await saveBbchResult(r2)
		await saveBbchResult(r3)

		const results = await loadBbchResults(scanId)
		expect(results).toHaveLength(2)
		expect(results[0].vine_index).toBe(1)
		expect(results[1].vine_index).toBe(2)
	})

	it('deletes results by scan', async () => {
		const scanId = createId()
		const r: BbchResult = {
			id: createId(),
			scan_id: scanId,
			row_number: 1,
			vine_index: 1,
			bbch_pred: 55,
			confidence: 0.9,
			model_version: 'gemini-2.0-flash',
			created_at: createTimestamp()
		}
		await saveBbchResult(r)
		await deleteBbchResults(scanId)
		const results = await loadBbchResults(scanId)
		expect(results).toHaveLength(0)
	})

	it('deleting a scan cascades to bbch results', async () => {
		const scanId = createId()
		const s: Scan = {
			id: scanId,
			vineyard_id: createId(),
			created_at: createTimestamp(),
			note: ''
		}
		const r: BbchResult = {
			id: createId(),
			scan_id: scanId,
			row_number: 1,
			vine_index: 1,
			bbch_pred: 55,
			confidence: 0.9,
			model_version: 'gemini-2.0-flash',
			created_at: createTimestamp()
		}
		await saveScan(s)
		await saveBbchResult(r)
		await deleteScan(scanId)
		expect(await loadBbchResults(scanId)).toHaveLength(0)
	})
})

describe('vine map CRUD', () => {
	it('saves and loads vine map entries by vineyard', async () => {
		const vineyardId = createId()
		const entries: VineMap[] = [
			{
				id: createId(),
				vineyard_id: vineyardId,
				row_number: 1,
				vine_index: 1,
				position_m_along_row: 0.8,
				status: 'present',
				created_at: createTimestamp()
			},
			{
				id: createId(),
				vineyard_id: vineyardId,
				row_number: 1,
				vine_index: 2,
				position_m_along_row: 1.6,
				status: 'present',
				created_at: createTimestamp()
			}
		]
		await saveVineMapEntries(entries)
		const loaded = await loadVineMap(vineyardId)
		expect(loaded).toHaveLength(2)
		expect(loaded[0].vine_index).toBe(1)
		expect(loaded[1].vine_index).toBe(2)
	})

	it('filters vine map by vineyard', async () => {
		const v1 = createId()
		const v2 = createId()
		await saveVineMapEntries([
			{
				id: createId(),
				vineyard_id: v1,
				row_number: 1,
				vine_index: 1,
				position_m_along_row: 0.8,
				status: 'present',
				created_at: createTimestamp()
			},
			{
				id: createId(),
				vineyard_id: v2,
				row_number: 1,
				vine_index: 1,
				position_m_along_row: 0.8,
				status: 'present',
				created_at: createTimestamp()
			}
		])
		expect(await loadVineMap(v1)).toHaveLength(1)
		expect(await loadVineMap(v2)).toHaveLength(1)
	})

	it('deletes vine map by vineyard', async () => {
		const vineyardId = createId()
		await saveVineMapEntries([
			{
				id: createId(),
				vineyard_id: vineyardId,
				row_number: 1,
				vine_index: 1,
				position_m_along_row: 0.8,
				status: 'present',
				created_at: createTimestamp()
			}
		])
		await deleteVineMap(vineyardId)
		expect(await loadVineMap(vineyardId)).toHaveLength(0)
	})
})

describe('settings persistence', () => {
	it('returns defaults when no settings saved', async () => {
		const s = await loadSettings()
		expect(s).toEqual({
			github_repo: '',
			github_pat: '',
			google_api_key: ''
		})
	})

	it('saves and loads settings', async () => {
		const s: Settings = {
			github_repo: 'owner/repo',
			github_pat: 'ghp_test123',
			google_api_key: 'AIzaTest'
		}
		await saveSettings(s)
		const loaded = await loadSettings()
		expect(loaded).toEqual(s)
	})

	it('overwrites previous settings', async () => {
		await saveSettings({
			github_repo: 'old/repo',
			github_pat: 'ghp_old',
			google_api_key: 'old_key'
		})
		const updated: Settings = {
			github_repo: 'new/repo',
			github_pat: 'ghp_new',
			google_api_key: 'new_key'
		}
		await saveSettings(updated)
		const loaded = await loadSettings()
		expect(loaded).toEqual(updated)
	})
})
