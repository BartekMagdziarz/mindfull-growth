export interface Emotion {
  id: string // UUID
  name: string // e.g., "Happy", "Anxious", "Serene"
  pleasantness: number // 1-12 scale (1 = very low, 12 = very high)
  energy: number // 1-12 scale (1 = very low, 12 = very high)
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
 * Threshold: 6 is used as the split point for both pleasantness and energy.
 * - Values > 6 are considered "high"
 * - Values <= 6 are considered "low"
 *
 * Quadrant logic:
 * - energy > 6 && pleasantness > 6 → high-energy-high-pleasantness
 * - energy > 6 && pleasantness <= 6 → high-energy-low-pleasantness
 * - energy <= 6 && pleasantness > 6 → low-energy-high-pleasantness
 * - energy <= 6 && pleasantness <= 6 → low-energy-low-pleasantness
 */
export function getQuadrant(emotion: Emotion): Quadrant {
  const isHighEnergy = emotion.energy > 6
  const isHighPleasantness = emotion.pleasantness > 6

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

