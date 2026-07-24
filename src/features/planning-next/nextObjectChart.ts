export interface NextObjectChartPoint {
  key: string
  label: string
  value?: number
  target?: number
  status: 'met' | 'missed' | 'no-data' | 'no-target'
  future?: boolean
  current?: boolean
  assigned?: boolean
}
