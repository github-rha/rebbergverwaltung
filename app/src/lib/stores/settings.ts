import { writable } from 'svelte/store'
import type { Settings } from '$lib/models/types.js'
import * as idb from '$lib/storage/idb.js'

const defaultSettings: Settings = {
	github_repo: '',
	github_pat: '',
	google_api_key: ''
}

export const settings = writable<Settings>({ ...defaultSettings })

export async function loadSettingsStore(): Promise<void> {
	const s = await idb.loadSettings()
	settings.set(s)
}

export async function saveSettingsStore(s: Settings): Promise<void> {
	await idb.saveSettings(s)
	settings.set(s)
}
