export type DirectionLabel = 'top_bottom' | 'left_right'

export interface Vineyard {
	id: string
	name: string
	row_count: number
	direction_label: DirectionLabel
	created_at: string
}

export interface Scan {
	id: string
	vineyard_id: string
	created_at: string
	note: string
	is_inventory: boolean
}

export type VideoStatus =
	| 'LOCAL_ONLY'
	| 'UPLOADING'
	| 'PROCESSING'
	| 'DONE'
	| 'FAILED'

export interface GpsPoint {
	lat: number
	lng: number
}

export interface RowVideo {
	id: string
	scan_id: string
	row_number: number
	direction: 'top_to_bottom' | 'bottom_to_top'
	local_uri: string
	cloud_uri: string
	status: VideoStatus
	gps_start?: GpsPoint
	gps_end?: GpsPoint
	created_at: string
}

export type VineStatus = 'present' | 'missing'

export interface VineMap {
	id: string
	vineyard_id: string
	row_number: number
	vine_index: number
	status: VineStatus
	created_at: string
}

export interface BbchResult {
	id: string
	scan_id: string
	row_number: number
	vine_index: number
	bbch_pred: number
	confidence: number
	model_version: string
	created_at: string
}

export interface Settings {
	github_repo: string
	github_pat: string
	google_api_key: string
}

export function createId(): string {
	return crypto.randomUUID()
}

export function createTimestamp(): string {
	return new Date().toISOString()
}
