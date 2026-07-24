import type { LabFixtureScenario } from './richVerificationScenario'

export interface VerificationScenarioIdRegistry {
  registerPriority: (key: string, id: string) => void
  registerObject: (key: string, id: string) => void
  priorityId: (key: string) => string
  objectId: (key: string) => string
  priorityIdsForObject: (key: string) => string[]
}

export function createVerificationScenarioIdRegistry(
  scenario: LabFixtureScenario,
): VerificationScenarioIdRegistry {
  const knownPriorityKeys = new Set(scenario.priorities.map(priority => priority.key))
  const objectByKey = new Map(scenario.objects.map(object => [object.key, object]))
  const priorityIds = new Map<string, string>()
  const objectIds = new Map<string, string>()

  const requireKnown = (kind: 'priority' | 'object', key: string) => {
    const known = kind === 'priority' ? knownPriorityKeys.has(key) : objectByKey.has(key)
    if (!known) throw new Error(`Unknown rich-v1 ${kind} key: ${key}`)
  }
  const requireId = (kind: 'priority' | 'object', key: string, ids: Map<string, string>) => {
    requireKnown(kind, key)
    const id = ids.get(key)
    if (!id) throw new Error(`Missing generated id for rich-v1 ${kind}: ${key}`)
    return id
  }

  return {
    registerPriority(key, id) {
      requireKnown('priority', key)
      priorityIds.set(key, id)
    },
    registerObject(key, id) {
      requireKnown('object', key)
      objectIds.set(key, id)
    },
    priorityId(key) {
      return requireId('priority', key, priorityIds)
    },
    objectId(key) {
      return requireId('object', key, objectIds)
    },
    priorityIdsForObject(key) {
      requireKnown('object', key)
      return objectByKey.get(key)!.priorityKeys.map(priorityKey => requireId('priority', priorityKey, priorityIds))
    },
  }
}
