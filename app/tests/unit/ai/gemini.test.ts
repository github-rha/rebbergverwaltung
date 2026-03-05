import { describe, it, expect } from 'vitest'
import { parseGeminiResponse } from '$lib/ai/gemini.js'
import { createId } from '$lib/models/types.js'

describe('parseGeminiResponse', () => {
	const scanId = createId()
	const rowNumber = 3

	it('parses a valid response into BbchResult array', () => {
		const text = JSON.stringify([
			{ vine_index: 1, bbch_pred: 55, confidence: 0.92 },
			{ vine_index: 2, bbch_pred: 61, confidence: 0.87 },
			{ vine_index: 3, bbch_pred: 55, confidence: 0.95 }
		])

		const results = parseGeminiResponse(text, scanId, rowNumber)

		expect(results).toHaveLength(3)
		expect(results[0].scan_id).toBe(scanId)
		expect(results[0].row_number).toBe(rowNumber)
		expect(results[0].vine_index).toBe(1)
		expect(results[0].bbch_pred).toBe(55)
		expect(results[0].confidence).toBe(0.92)
		expect(results[0].model_version).toBe('gemini-2.0-flash')
		expect(results[0].id).toBeTruthy()
		expect(results[0].created_at).toBeTruthy()
	})

	it('clamps confidence to 0-1 range', () => {
		const text = JSON.stringify([
			{ vine_index: 1, bbch_pred: 55, confidence: 1.5 },
			{ vine_index: 2, bbch_pred: 55, confidence: -0.2 }
		])

		const results = parseGeminiResponse(text, scanId, rowNumber)

		expect(results[0].confidence).toBe(1)
		expect(results[1].confidence).toBe(0)
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
		const results = parseGeminiResponse('[]', scanId, rowNumber)
		expect(results).toHaveLength(0)
	})

	it('throws on invalid JSON', () => {
		expect(() => parseGeminiResponse('not json', scanId, rowNumber)).toThrow()
	})
})
