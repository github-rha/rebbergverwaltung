import type { BbchResult } from '$lib/models/types.js'

export interface DeviationResult {
	row_number: number
	vine_index: number
	bbch_pred: number
	deviation: number
}

export interface RowHeterogeneity {
	row_number: number
	variance: number
}

export function computeDeviation(results: BbchResult[]): DeviationResult[] {
	if (results.length === 0) return []

	const median = computeMedian(results.map((r) => r.bbch_pred))

	return results.map((r) => ({
		row_number: r.row_number,
		vine_index: r.vine_index,
		bbch_pred: r.bbch_pred,
		deviation: r.bbch_pred - median
	}))
}

export function computeRowHeterogeneity(
	results: BbchResult[]
): RowHeterogeneity[] {
	const byRow: Record<number, number[]> = {}
	for (const r of results) {
		if (!byRow[r.row_number]) byRow[r.row_number] = []
		byRow[r.row_number].push(r.bbch_pred)
	}

	return Object.entries(byRow)
		.map(([row, values]) => ({
			row_number: Number(row),
			variance: computeVariance(values)
		}))
		.sort((a, b) => a.row_number - b.row_number)
}

function computeMedian(values: number[]): number {
	if (values.length === 0) return 0
	const sorted = [...values].sort((a, b) => a - b)
	const mid = Math.floor(sorted.length / 2)
	if (sorted.length % 2 === 0) {
		return (sorted[mid - 1] + sorted[mid]) / 2
	}
	return sorted[mid]
}

function computeVariance(values: number[]): number {
	if (values.length <= 1) return 0
	const mean = values.reduce((a, b) => a + b, 0) / values.length
	return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
}
