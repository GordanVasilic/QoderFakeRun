export interface RoutePoint {
  lat: number
  lng: number
  elevation?: number | null
  timestamp?: number
  pace?: number | null
  heartRate?: number | null
  distanceFromStart?: number
}

export interface PaceHeartRateSettings {
  averagePace: number // in min/km
  paceInconsistency: number // percentage (0-100) - variation from average
  includeHeartRate: boolean
  averageHeartRate: number // in bpm
  heartRateVariability: number // percentage (0-100) - variation from average
}

export interface RouteData {
  points: RoutePoint[] // waypoints (clicked points)
  distance: number // in kilometers
  duration: number // in seconds
  elevationGain: number // in meters
  averagePace: number // in min/km
  paceHeartRateSettings?: PaceHeartRateSettings
  routeGeometry?: any // Complete route geometry from Mapbox
  routeCoordinates?: Array<[number, number]> // Complete route coordinates [lng, lat]
  routeElevations?: number[] // Elevation for each route coordinate
}

export interface PaceProfilePoint {
  distance: number // cumulative distance in km
  pace: number // pace in min/km
  elevation: number // elevation in meters
}

export interface ChartDataPoint {
  distance: number
  pace?: number
  elevation?: number
  heartRate?: number
}

export interface RunDetails {
  name: string
  date: string
  startTime: string
  description: string
  includeHeartRate: boolean
  activityType: 'run' | 'bike'
  paceUnit: 'metric' | 'imperial'
}

export interface MapSettings {
  center: [number, number]
  zoom: number
  style: string
}

export type ShapeType = 'draw' | 'heart' | 'circle'

export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
}