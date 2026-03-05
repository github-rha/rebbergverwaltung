import { writable } from 'svelte/store'
import type { Vineyard } from '$lib/models/types.js'
import { createId, createTimestamp } from '$lib/models/types.js'
import * as idb from '$lib/storage/idb.js'

export const vineyards = writable<Vineyard[]>([])
export const currentVineyardId = writable<string | null>(null)

export async function loadVineyards(): Promise<void> {
	const list = await idb.listVineyards()
	vineyards.set(list)
}

export async function addVineyard(
	name: string,
	rowCount: number,
	directionLabel: Vineyard['direction_label']
): Promise<Vineyard> {
	const vineyard: Vineyard = {
		id: createId(),
		name,
		row_count: rowCount,
		direction_label: directionLabel,
		created_at: createTimestamp()
	}
	await idb.saveVineyard(vineyard)
	await loadVineyards()
	return vineyard
}

export async function removeVineyard(id: string): Promise<void> {
	await idb.deleteVineyard(id)
	await loadVineyards()
}

export async function selectVineyard(id: string | null): Promise<void> {
	currentVineyardId.set(id)
}
