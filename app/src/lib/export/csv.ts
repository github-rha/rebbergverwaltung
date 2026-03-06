import * as idb from '$lib/storage/idb.js'

export async function exportScanCsv(scanId: string): Promise<string> {
	const scan = await idb.loadScan(scanId)
	if (!scan) return ''
	const results = await idb.loadBbchResults(scanId)
	const date = scan.created_at.split('T')[0]

	const lines = [
		'scan_id,date,row_number,vine_index,bbch_pred,confidence',
		...results.map(
			(r) =>
				`${scan.id},${date},${r.row_number},${r.vine_index},${r.bbch_pred},${r.confidence}`
		)
	]
	return lines.join('\n')
}

export async function exportVineTimeSeriesCsv(
	vineyardId: string
): Promise<string> {
	const scans = await idb.listScans(vineyardId)
	const lines = ['row_number,vine_index,scan_date,bbch_pred']

	for (const scan of scans) {
		const results = await idb.loadBbchResults(scan.id)
		const date = scan.created_at.split('T')[0]
		for (const r of results) {
			lines.push(`${r.row_number},${r.vine_index},${date},${r.bbch_pred}`)
		}
	}

	return lines.join('\n')
}

export function downloadCsv(content: string, filename: string): void {
	const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	a.click()
	URL.revokeObjectURL(url)
}
