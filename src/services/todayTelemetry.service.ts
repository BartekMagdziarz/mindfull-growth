import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'

const TODAY_TELEMETRY_KEY = 'telemetry.todayEvents'

interface StoredEvent {
  count: number
  lastAt: string
  lastPayload?: Record<string, string | number | boolean>
}

interface StoredTelemetry {
  events: Record<string, StoredEvent>
}

function parseTelemetry(raw: string | undefined): StoredTelemetry {
  if (!raw) return { events: {} }
  try {
    const parsed = JSON.parse(raw) as StoredTelemetry
    if (!parsed || typeof parsed !== 'object' || !parsed.events) {
      return { events: {} }
    }
    return parsed
  } catch {
    return { events: {} }
  }
}

export async function trackTodayEvent(
  eventName: string,
  payload?: Record<string, string | number | boolean>,
): Promise<void> {
  try {
    const raw = await userSettingsDexieRepository.get(TODAY_TELEMETRY_KEY)
    const telemetry = parseTelemetry(raw)
    const now = new Date().toISOString()

    const existing = telemetry.events[eventName]
    telemetry.events[eventName] = {
      count: (existing?.count ?? 0) + 1,
      lastAt: now,
      lastPayload: payload,
    }

    await userSettingsDexieRepository.set(TODAY_TELEMETRY_KEY, JSON.stringify(telemetry))
  } catch (error) {
    // Telemetry must not break user flows.
    console.warn('Failed to persist Today telemetry event', eventName, error)
  }
}
