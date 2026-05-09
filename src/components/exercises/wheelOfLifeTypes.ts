export interface WheelChartArea {
  id?: string
  name: string
  rating: number
}

export interface WheelDraftArea extends WheelChartArea {
  note: string
  positiveInfluences: string
  negativeInfluences: string
  visionSnapshot: string
}
