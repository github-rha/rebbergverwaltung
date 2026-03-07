import { describe, it, expect } from 'vitest'
import { createId, createTimestamp, formatBbch } from '$lib/models/types.js'
import type {
	Vineyard,
	Scan,
	RowVideo,
	VineMap,
	BbchResult,
	Settings,
	VideoStatus,
	VineStatus,
	GpsPoint
} from '$lib/models/types.js'

describe('createId', () => {
	it('returns a valid UUID string', () => {
		const id = createId()
		expect(id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
		)
	})

	it('returns unique values on each call', () => {
		const ids = new Set(Array.from({ length: 10 }, () => createId()))
		expect(ids.size).toBe(10)
	})
})

describe('createTimestamp', () => {
	it('returns a valid ISO 8601 string', () => {
		const ts = createTimestamp()
		expect(new Date(ts).toISOString()).toBe(ts)
	})
})

describe('formatBbch', () => {
	it('pads single digit to two digits', () => {
		expect(formatBbch(0)).toBe('00')
		expect(formatBbch(9)).toBe('09')
	})

	it('keeps two-digit values as-is', () => {
		expect(formatBbch(11)).toBe('11')
		expect(formatBbch(55)).toBe('55')
		expect(formatBbch(89)).toBe('89')
	})
})

describe('type contracts', () => {
	it('Vineyard has required fields', () => {
		const v: Vineyard = {
			id: createId(),
			name: 'Halde',
			row_count: 10,
			direction_label: 'top_bottom',
			created_at: createTimestamp()
		}
		expect(v.id).toBeTruthy()
		expect(v.name).toBe('Halde')
		expect(v.row_count).toBe(10)
		expect(v.direction_label).toBe('top_bottom')
		expect(v.created_at).toBeTruthy()
	})

	it('Scan has required fields', () => {
		const s: Scan = {
			id: createId(),
			vineyard_id: createId(),
			created_at: createTimestamp(),
			note: 'Early season',
			is_inventory: false
		}
		expect(s.vineyard_id).toBeTruthy()
		expect(s.note).toBe('Early season')
		expect(s.is_inventory).toBe(false)
	})

	it('RowVideo has valid status', () => {
		const statuses: VideoStatus[] = [
			'LOCAL_ONLY',
			'UPLOADING',
			'PROCESSING',
			'DONE',
			'FAILED'
		]
		const rv: RowVideo = {
			id: createId(),
			scan_id: createId(),
			row_number: 1,
			direction: 'top_to_bottom',
			local_uri: '',
			cloud_uri: '',
			status: 'LOCAL_ONLY',
			created_at: createTimestamp()
		}
		expect(statuses).toContain(rv.status)
		expect(rv.direction).toBe('top_to_bottom')
	})

	it('RowVideo supports optional GPS coordinates', () => {
		const start: GpsPoint = { lat: 47.55, lng: 7.59 }
		const end: GpsPoint = { lat: 47.551, lng: 7.591 }
		const rv: RowVideo = {
			id: createId(),
			scan_id: createId(),
			row_number: 1,
			direction: 'top_to_bottom',
			local_uri: '',
			cloud_uri: '',
			status: 'LOCAL_ONLY',
			gps_start: start,
			gps_end: end,
			created_at: createTimestamp()
		}
		expect(rv.gps_start).toEqual(start)
		expect(rv.gps_end).toEqual(end)
	})

	it('VineMap has valid status', () => {
		const statuses: VineStatus[] = ['present', 'missing']
		const vm: VineMap = {
			id: createId(),
			vineyard_id: createId(),
			row_number: 3,
			vine_index: 7,
			status: 'present',
			created_at: createTimestamp()
		}
		expect(statuses).toContain(vm.status)
		expect(vm.vine_index).toBe(7)
	})

	it('BbchResult has required fields', () => {
		const br: BbchResult = {
			id: createId(),
			scan_id: createId(),
			row_number: 1,
			vine_index: 3,
			bbch_pred: 65,
			confidence: 0.92,
			model_version: 'gemini-2.5-flash',
			created_at: createTimestamp()
		}
		expect(br.bbch_pred).toBe(65)
		expect(br.confidence).toBeGreaterThan(0)
		expect(br.confidence).toBeLessThanOrEqual(1)
	})

	it('Settings has credential fields', () => {
		const s: Settings = {
			github_repo: 'owner/repo',
			github_pat: 'ghp_abc123',
			google_api_key: 'AIza...'
		}
		expect(s.github_repo).toBe('owner/repo')
		expect(s.github_pat).toBeTruthy()
		expect(s.google_api_key).toBeTruthy()
	})
})
