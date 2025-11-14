export interface Emotion {
  id: string // UUID
  name: string // e.g., "Happy", "Anxious", "Serene"
  pleasantness: number // 1-10 scale (1 = very low, 10 = very high)
  energy: number // 1-10 scale (1 = very low, 10 = very high)
  description?: string // Optional description of the emotion
}

export type Quadrant =
  | 'high-energy-high-pleasantness'
  | 'high-energy-low-pleasantness'
  | 'low-energy-high-pleasantness'
  | 'low-energy-low-pleasantness'

/**
 * Determines the quadrant for an emotion based on its pleasantness and energy values.
 *
 * Threshold: 5 is used as the split point for both pleasantness and energy.
 * - Values > 5 are considered "high"
 * - Values <= 5 are considered "low"
 *
 * Quadrant logic:
 * - energy > 5 && pleasantness > 5 → high-energy-high-pleasantness
 * - energy > 5 && pleasantness <= 5 → high-energy-low-pleasantness
 * - energy <= 5 && pleasantness > 5 → low-energy-high-pleasantness
 * - energy <= 5 && pleasantness <= 5 → low-energy-low-pleasantness
 */
export function getQuadrant(emotion: Emotion): Quadrant {
  const isHighEnergy = emotion.energy > 5
  const isHighPleasantness = emotion.pleasantness > 5

  if (isHighEnergy && isHighPleasantness) {
    return 'high-energy-high-pleasantness'
  }
  if (isHighEnergy && !isHighPleasantness) {
    return 'high-energy-low-pleasantness'
  }
  if (!isHighEnergy && isHighPleasantness) {
    return 'low-energy-high-pleasantness'
  }
  // !isHighEnergy && !isHighPleasantness
  return 'low-energy-low-pleasantness'
}

