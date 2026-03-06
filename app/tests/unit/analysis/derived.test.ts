import { describe, it, expect } from 'vitest'
import {
	computeDeviation,
	computeRowHeterogeneity
} from '$lib/analysis/derived.js'
import { createId, createTimestamp } from '$lib/models/types.js'
import type { BbchResult } from '$lib/models/types.js'

function makeResult(row: number, vine: number, bbch: number): BbchResult {
	return {
		id: createId(),
		scan_id: createId(),
		row_number: row,
		vine_index: vine,
		bbch_pred: bbch,
		confidence: 0.9,
		model_version: 'gemini-3.0-flash',
		created_at: createTimestamp()
	}
}

describe('computeDeviation', () => {
	it('returns empty array for empty input', () => {
		expect(computeDeviation([])).toEqual([])
	})

	it('computes deviation from median for odd-count results', () => {
		const results = [
			makeResult(1, 1, 50),
			makeResult(1, 2, 60),
			makeResult(1, 3, 70)
		]
		const deviations = computeDeviation(results)

		expect(deviations).toHaveLength(3)
		expect(deviations[0].deviation).toBe(-10) // 50 - 60
		expect(deviations[1].deviation).toBe(0) // 60 - 60
		expect(deviations[2].deviation).toBe(10) // 70 - 60
	})

	it('computes deviation from median for even-count results', () => {
		const results = [
			makeResult(1, 1, 40),
			makeResult(1, 2, 50),
			makeResult(1, 3, 60),
			makeResult(1, 4, 70)
		]
		const deviations = computeDeviation(results)

		// median = (50 + 60) / 2 = 55
		expect(deviations[0].deviation).toBe(-15) // 40 - 55
		expect(deviations[1].deviation).toBe(-5) // 50 - 55
		expect(deviations[2].deviation).toBe(5) // 60 - 55
		expect(deviations[3].deviation).toBe(15) // 70 - 55
	})

	it('preserves row_number and vine_index', () => {
		const results = [makeResult(3, 7, 55)]
		const deviations = computeDeviation(results)

		expect(deviations[0].row_number).toBe(3)
		expect(deviations[0].vine_index).toBe(7)
		expect(deviations[0].bbch_pred).toBe(55)
	})
})

describe('computeRowHeterogeneity', () => {
	it('returns empty array for empty input', () => {
		expect(computeRowHeterogeneity([])).toEqual([])
	})

	it('returns zero variance for a single vine per row', () => {
		const results = [makeResult(1, 1, 55)]
		const het = computeRowHeterogeneity(results)

		expect(het).toHaveLength(1)
		expect(het[0].row_number).toBe(1)
		expect(het[0].variance).toBe(0)
	})

	it('computes variance per row', () => {
		const results = [
			makeResult(1, 1, 50),
			makeResult(1, 2, 60),
			makeResult(2, 1, 70),
			makeResult(2, 2, 70)
		]
		const het = computeRowHeterogeneity(results)

		expect(het).toHaveLength(2)
		// Row 1: mean=55, variance = ((50-55)^2 + (60-55)^2) / 2 = 25
		expect(het[0].row_number).toBe(1)
		expect(het[0].variance).toBe(25)
		// Row 2: all same, variance = 0
		expect(het[1].row_number).toBe(2)
		expect(het[1].variance).toBe(0)
	})

	it('returns rows sorted by row number', () => {
		const results = [
			makeResult(3, 1, 55),
			makeResult(1, 1, 60),
			makeResult(2, 1, 65)
		]
		const het = computeRowHeterogeneity(results)

		expect(het[0].row_number).toBe(1)
		expect(het[1].row_number).toBe(2)
		expect(het[2].row_number).toBe(3)
	})
})
