import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { clear } from 'idb-keyval'
import { exportScanCsv, exportVineTimeSeriesCsv } from '$lib/export/csv.js'
import * as idb from '$lib/storage/idb.js'
import { createId, createTimestamp } from '$lib/models/types.js'
import type { Scan, BbchResult } from '$lib/models/types.js'

beforeEach(async () => {
	await clear()
})

function makeScan(vineyardId: string, date: string): Scan {
	return {
		id: createId(),
		vineyard_id: vineyardId,
		created_at: date,
		note: '',
		is_inventory: false
	}
}

function makeResult(
	scanId: string,
	row: number,
	vine: number,
	bbch: number
): BbchResult {
	return {
		id: createId(),
		scan_id: scanId,
		row_number: row,
		vine_index: vine,
		bbch_pred: bbch,
		confidence: 0.9,
		model_version: 'gemini-3.0-flash',
		created_at: createTimestamp()
	}
}

describe('exportScanCsv', () => {
	it('returns empty string for missing scan', async () => {
		const csv = await exportScanCsv('nonexistent')
		expect(csv).toBe('')
	})

	it('produces CSV with header and result rows', async () => {
		const scan = makeScan(createId(), '2026-06-15T10:00:00.000Z')
		await idb.saveScan(scan)
		await idb.saveBbchResult(makeResult(scan.id, 1, 1, 55))
		await idb.saveBbchResult(makeResult(scan.id, 1, 2, 61))

		const csv = await exportScanCsv(scan.id)
		const lines = csv.split('\n')

		expect(lines[0]).toBe(
			'scan_id,date,row_number,vine_index,bbch_pred,confidence'
		)
		expect(lines).toHaveLength(3)
		expect(lines[1]).toContain('2026-06-15')
		expect(lines[1]).toContain(',55,')
	})
})

describe('exportVineTimeSeriesCsv', () => {
	it('produces CSV across multiple scans', async () => {
		const vineyardId = createId()
		const s1 = makeScan(vineyardId, '2026-06-01T10:00:00.000Z')
		const s2 = makeScan(vineyardId, '2026-06-15T10:00:00.000Z')
		await idb.saveScan(s1)
		await idb.saveScan(s2)
		await idb.saveBbchResult(makeResult(s1.id, 1, 1, 55))
		await idb.saveBbchResult(makeResult(s2.id, 1, 1, 65))

		const csv = await exportVineTimeSeriesCsv(vineyardId)
		const lines = csv.split('\n')

		expect(lines[0]).toBe('row_number,vine_index,scan_date,bbch_pred')
		expect(lines).toHaveLength(3) // header + 2 data rows
	})

	it('returns header only when no scans exist', async () => {
		const csv = await exportVineTimeSeriesCsv(createId())
		expect(csv).toBe('row_number,vine_index,scan_date,bbch_pred')
	})
})
