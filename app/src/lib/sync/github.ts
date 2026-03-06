import * as idb from '$lib/storage/idb.js'

const API_BASE = 'https://api.github.com'

interface GitHubFileResponse {
	sha?: string
	content?: string
}

export async function pushResults(
	vineyardId: string,
	repo: string,
	pat: string
): Promise<void> {
	const vineyard = await idb.loadVineyard(vineyardId)
	if (!vineyard) throw new Error('Vineyard not found')

	const scans = await idb.listScans(vineyardId)
	const vineMap = await idb.loadVineMap(vineyardId)

	const scanData = []
	for (const scan of scans) {
		const results = await idb.loadBbchResults(scan.id)
		scanData.push({
			id: scan.id,
			created_at: scan.created_at,
			note: scan.note,
			results: results.map((r) => ({
				row_number: r.row_number,
				vine_index: r.vine_index,
				bbch_pred: r.bbch_pred,
				confidence: r.confidence,
				model_version: r.model_version
			}))
		})
	}

	const payload = {
		vineyard: {
			id: vineyard.id,
			name: vineyard.name,
			row_count: vineyard.row_count,
			direction_label: vineyard.direction_label
		},
		vine_map: vineMap.map((v) => ({
			row_number: v.row_number,
			vine_index: v.vine_index,
			status: v.status
		})),
		scans: scanData
	}

	const content = JSON.stringify(payload, null, 2)
	const encoded = btoa(unescape(encodeURIComponent(content)))
	const path = `data/${encodeURIComponent(vineyard.name)}/scans.json`

	const existing = await getFile(repo, path, pat)

	await fetch(`${API_BASE}/repos/${repo}/contents/${path}`, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${pat}`,
			'Content-Type': 'application/json',
			Accept: 'application/vnd.github.v3+json'
		},
		body: JSON.stringify({
			message: `Update ${vineyard.name} scan data`,
			content: encoded,
			...(existing?.sha ? { sha: existing.sha } : {})
		})
	}).then((res) => {
		if (!res.ok)
			return res.text().then((t) => {
				throw new Error(`GitHub API error: ${res.status} ${t}`)
			})
	})
}

async function getFile(
	repo: string,
	path: string,
	pat: string
): Promise<GitHubFileResponse | null> {
	const res = await fetch(`${API_BASE}/repos/${repo}/contents/${path}`, {
		headers: {
			Authorization: `Bearer ${pat}`,
			Accept: 'application/vnd.github.v3+json'
		}
	})
	if (res.status === 404) return null
	if (!res.ok) {
		const text = await res.text()
		throw new Error(`GitHub API error: ${res.status} ${text}`)
	}
	return res.json()
}
