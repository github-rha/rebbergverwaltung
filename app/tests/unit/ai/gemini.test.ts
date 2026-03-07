import { describe, it, expect } from 'vitest'
import { parseGeminiResponse } from '$lib/ai/gemini.js'
import { createId } from '$lib/models/types.js'

describe('parseGeminiResponse', () => {
	const scanId = createId()
	const rowNumber = 3

	it('parses a valid response into BbchResult array', () => {
		const text = JSON.stringify([
			{ vine_index: 1, bbch_pred: 55, confidence: 0.92, timestamp_sec: 1.5 },
			{ vine_index: 2, bbch_pred: 61, confidence: 0.87, timestamp_sec: 4.2 },
			{ vine_index: 3, bbch_pred: 55, confidence: 0.95 }
		])

		const result = parseGeminiResponse(text, scanId, rowNumber)

		expect(result.bbchResults).toHaveLength(3)
		expect(result.bbchResults[0].scan_id).toBe(scanId)
		expect(result.bbchResults[0].row_number).toBe(rowNumber)
		expect(result.bbchResults[0].vine_index).toBe(1)
		expect(result.bbchResults[0].bbch_pred).toBe(55)
		expect(result.bbchResults[0].confidence).toBe(0.92)
		expect(result.bbchResults[0].timestamp_sec).toBe(1.5)
		expect(result.bbchResults[0].model_version).toBe('gemini-2.5-pro')
		expect(result.bbchResults[0].id).toBeTruthy()
		expect(result.bbchResults[0].created_at).toBeTruthy()
		expect(result.bbchResults[2].timestamp_sec).toBeUndefined()
		expect(result.vineMapEntries).toHaveLength(0)
	})

	it('clamps confidence to 0-1 range', () => {
		const text = JSON.stringify([
			{ vine_index: 1, bbch_pred: 55, confidence: 1.5 },
			{ vine_index: 2, bbch_pred: 55, confidence: -0.2 }
		])

		const result = parseGeminiResponse(text, scanId, rowNumber)

		expect(result.bbchResults[0].confidence).toBe(1)
		expect(result.bbchResults[1].confidence).toBe(0)
	})

	it('throws on non-array response', () => {
		expect(() =>
			parseGeminiResponse('{"vine_index": 1}', scanId, rowNumber)
		).toThrow('not an array')
	})

	it('throws on missing required fields', () => {
		const text = JSON.stringify([{ vine_index: 1, bbch_pred: 55 }])

		expect(() => parseGeminiResponse(text, scanId, rowNumber)).toThrow(
			'missing required fields'
		)
	})

	it('handles empty vine list', () => {
		const result = parseGeminiResponse('[]', scanId, rowNumber)
		expect(result.bbchResults).toHaveLength(0)
		expect(result.vineMapEntries).toHaveLength(0)
	})

	it('throws on invalid JSON', () => {
		expect(() => parseGeminiResponse('not json', scanId, rowNumber)).toThrow()
	})

	it('ignores non-numeric timestamp_sec', () => {
		const text = JSON.stringify([
			{ vine_index: 1, bbch_pred: 55, confidence: 0.9, timestamp_sec: 'early' }
		])

		const result = parseGeminiResponse(text, scanId, rowNumber)
		expect(result.bbchResults[0].timestamp_sec).toBeUndefined()
	})

	it('produces VineMap entries for inventory scans', () => {
		const vineyardId = createId()
		const text = JSON.stringify([
			{ vine_index: 1, bbch_pred: 9, confidence: 0.8, status: 'present' },
			{ vine_index: 2, bbch_pred: 0, confidence: 0.9, status: 'missing' }
		])

		const result = parseGeminiResponse(
			text,
			scanId,
			rowNumber,
			true,
			vineyardId
		)

		expect(result.bbchResults).toHaveLength(2)
		expect(result.vineMapEntries).toHaveLength(2)
		expect(result.vineMapEntries[0].vineyard_id).toBe(vineyardId)
		expect(result.vineMapEntries[0].row_number).toBe(rowNumber)
		expect(result.vineMapEntries[0].vine_index).toBe(1)
		expect(result.vineMapEntries[0].status).toBe('present')
		expect(result.vineMapEntries[1].status).toBe('missing')
	})

	it('defaults unknown status to present in inventory mode', () => {
		const text = JSON.stringify([
			{ vine_index: 1, bbch_pred: 9, confidence: 0.8, status: 'unknown' }
		])

		const result = parseGeminiResponse(text, scanId, rowNumber, true, 'v1')

		expect(result.vineMapEntries[0].status).toBe('present')
	})
})
