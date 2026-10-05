import { PERSONA_IDS, type PersonaId } from './scenarios'
export const DEMO_ORIGIN = 'http://127.0.0.1:5203'
export const DEMO_SELECTION = 'ai-companion-demo-persona'
export const demoUserId = (persona: PersonaId) => `ai-companion-demo-${persona}`
export function assertDemoEnvironment(mode = import.meta.env.MODE, origin = location.origin) {
  if (mode !== 'ai-demo' || origin !== DEMO_ORIGIN)
    throw new Error('Demo requires its isolated origin on port 5203')
}
export function selectedPersona(): PersonaId {
  const saved = sessionStorage.getItem(DEMO_SELECTION)
  return PERSONA_IDS.find(id => id === saved) ?? 'marta'
}
