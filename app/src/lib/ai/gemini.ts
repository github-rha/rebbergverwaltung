import type { BbchResult, VineMap, VineStatus } from '$lib/models/types.js'
import { createId, createTimestamp } from '$lib/models/types.js'

const API_BASE = 'https://generativelanguage.googleapis.com'
export const MODEL = 'gemini-2.5-pro'

interface GeminiVineResult {
	vine_index: number
	bbch_pred: number
	confidence: number
	timestamp_sec?: number
	status?: string
}

export interface UploadedFile {
	uri: string
	mimeType: string
}

export interface AnalysisResult {
	bbchResults: BbchResult[]
	vineMapEntries: VineMap[]
}

export async function uploadVideo(
	apiKey: string,
	blob: Blob
): Promise<UploadedFile> {
	const mimeType = blob.type || 'video/mp4'

	const initRes = await fetch(
		`${API_BASE}/upload/v1beta/files?key=${encodeURIComponent(apiKey)}`,
		{
			method: 'POST',
			headers: {
				'X-Goog-Upload-Protocol': 'resumable',
				'X-Goog-Upload-Command': 'start',
				'X-Goog-Upload-Header-Content-Length': String(blob.size),
				'X-Goog-Upload-Header-Content-Type': mimeType,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				file: { display_name: 'row-video' }
			})
		}
	)

	if (!initRes.ok) {
		throw new Error(`Upload init failed: ${initRes.status}`)
	}

	const uploadUrl = initRes.headers.get('X-Goog-Upload-URL')
	if (!uploadUrl) {
		throw new Error('No upload URL returned')
	}

	const uploadRes = await fetch(uploadUrl, {
		method: 'PUT',
		headers: {
			'X-Goog-Upload-Command': 'upload, finalize',
			'X-Goog-Upload-Offset': '0',
			'Content-Type': mimeType
		},
		body: blob
	})

	if (!uploadRes.ok) {
		throw new Error(`Upload failed: ${uploadRes.status}`)
	}

	const uploadData = await uploadRes.json()
	const fileUri: string = uploadData.file?.uri
	if (!fileUri) {
		throw new Error('No file URI in upload response')
	}

	await waitForFileActive(apiKey, fileUri)

	return { uri: fileUri, mimeType }
}

async function waitForFileActive(
	apiKey: string,
	fileUri: string
): Promise<void> {
	const fileName = fileUri.split('/').pop()
	const maxAttempts = 30
	for (let i = 0; i < maxAttempts; i++) {
		const res = await fetch(
			`${API_BASE}/v1beta/files/${fileName}?key=${encodeURIComponent(apiKey)}`
		)
		if (!res.ok) break
		const data = await res.json()
		if (data.state === 'ACTIVE') return
		if (data.state === 'FAILED') throw new Error('File processing failed')
		await new Promise((r) => setTimeout(r, 2000))
	}
}

export async function analyzeRowVideo(
	apiKey: string,
	file: UploadedFile,
	scanId: string,
	rowNumber: number,
	isInventory: boolean,
	vineContext?: string
): Promise<AnalysisResult> {
	const contextHint = vineContext
		? vineContext
		: 'Count and identify each individual vine in the row.'

	const statusInstruction = isInventory
		? '\n- status: "present" or "missing" (missing = empty space where a vine should be)'
		: ''

	const statusExample = isInventory ? ', "status": "present"' : ''

	const prompt = [
		'You are analyzing a video of a vineyard row. The camera walks along the row filming the vines.',
		`This is row ${rowNumber}. ${contextHint}`,
		'',
		'IMPORTANT counting rules:',
		'- Only count vines in the NEAREST row — the one directly next to the camera (~70cm away). Ignore all vines in background rows.',
		'- Do NOT count tall (~2m) wooden posts that hold guide wires — these are infrastructure.',
		'- Do NOT count small wooden support poles next to individual vines — each vine may have one, but the pole is not a vine.',
		'- DO count young vines protected by a green plastic cylinder (grow tube) — these are vines.',
		'- Each row starts with a diagonal tension wire running from the ground up to the first pole. The first vine comes AFTER this wire. Do not count anything before it.',
		'',
		'For each vine visible in the video, determine:',
		'- vine_index: sequential number starting from 1 (first vine seen in the video)',
		'- bbch_pred: the BBCH phenological growth stage (integer, e.g. 9, 11, 55, 65, 71, 77, 81, 85)',
		'- confidence: your confidence in the BBCH prediction (0.0 to 1.0)',
		'- timestamp_sec: the time in seconds (decimal) when this vine is best visible in the video',
		statusInstruction,
		'',
		'Respond ONLY with a JSON array, no other text:',
		`[{"vine_index": 1, "bbch_pred": 55, "confidence": 0.85, "timestamp_sec": 3.2${statusExample}}, ...]`
	]
		.filter((l) => l !== '')
		.join('\n')

	const res = await fetch(
		`${API_BASE}/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [
					{
						parts: [
							{
								file_data: {
									mime_type: file.mimeType,
									file_uri: file.uri
								}
							},
							{ text: prompt }
						]
					}
				],
				generationConfig: {
					temperature: 0.2,
					responseMimeType: 'application/json'
				}
			})
		}
	)

	if (!res.ok) {
		const text = await res.text()
		throw new Error(`Gemini API error: ${res.status} ${text}`)
	}

	const data = await res.json()
	const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

	return parseGeminiResponse(text, scanId, rowNumber, isInventory)
}

export function parseGeminiResponse(
	text: string,
	scanId: string,
	rowNumber: number,
	isInventory: boolean = false,
	vineyardId: string = ''
): AnalysisResult {
	const parsed: GeminiVineResult[] = JSON.parse(text)

	if (!Array.isArray(parsed)) {
		throw new Error('Gemini response is not an array')
	}

	const bbchResults: BbchResult[] = parsed.map((item) => {
		if (
			typeof item.vine_index !== 'number' ||
			typeof item.bbch_pred !== 'number' ||
			typeof item.confidence !== 'number'
		) {
			throw new Error('Invalid vine result: missing required fields')
		}

		return {
			id: createId(),
			scan_id: scanId,
			row_number: rowNumber,
			vine_index: item.vine_index,
			bbch_pred: item.bbch_pred,
			confidence: Math.max(0, Math.min(1, item.confidence)),
			timestamp_sec: typeof item.timestamp_sec === 'number' ? item.timestamp_sec : undefined,
			model_version: MODEL,
			created_at: createTimestamp()
		}
	})

	const vineMapEntries: VineMap[] = isInventory
		? parsed.map((item) => {
				const status: VineStatus =
					item.status === 'missing' ? 'missing' : 'present'
				return {
					id: createId(),
					vineyard_id: vineyardId,
					row_number: rowNumber,
					vine_index: item.vine_index,
					status,
					created_at: createTimestamp()
				}
			})
		: []

	return { bbchResults, vineMapEntries }
}
