import { z } from 'zod'

// Route point validation
export const RoutePointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  elevation: z.number().optional(),
  timestamp: z.number().optional(),
})

// Route data validation
export const RouteDataSchema = z.object({
  points: z.array(RoutePointSchema).min(2).max(1000),
  distance: z.number().min(0).max(1000), // max 1000km
  duration: z.number().min(0).max(86400), // max 24 hours
  elevationGain: z.number().min(0).max(10000), // max 10km elevation
  averagePace: z.number().min(1).max(20), // reasonable pace range
  paceHeartRateSettings: z.object({
    averagePace: z.number(),
    paceInconsistency: z.number(),
    includeHeartRate: z.boolean(),
    averageHeartRate: z.number(),
    heartRateVariability: z.number()
  }).optional(),
  routeGeometry: z.object({
    type: z.string(),
    coordinates: z.array(z.tuple([z.number(), z.number()]))
  }).optional(), // Complete route geometry from Mapbox
  routeCoordinates: z.array(z.tuple([z.number(), z.number()])).optional(), // Complete route coordinates [lng, lat]
  routeElevations: z.array(z.number()).optional(), // Elevation for each route coordinate
})

// File generation request validation
export const FileGenerationSchema = z.object({
  routeData: RouteDataSchema,
  options: z.object({
    name: z.string().min(1).max(100),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
    startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
    description: z.string().max(500),
    includeHeartRate: z.boolean(),
    activityType: z.enum(['run', 'bike']),
  }),
  chartData: z.array(z.object({
    distance: z.number(),
    pace: z.number().optional(),
    elevation: z.number().optional(),
    heartRate: z.number().min(50).max(250).optional(),
  })).optional(),
  format: z.enum(['gpx']),
  anonymousId: z.string().optional(), // For anonymous user token validation
})

// Route creation validation
export const RouteCreationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  routeData: RouteDataSchema,
  isPublic: z.boolean().optional().default(false),
  tags: z.array(z.string().max(50)).max(10).optional(),
  chartData: z.array(z.object({
    distance: z.number(),
    pace: z.number().optional(),
    elevation: z.number().optional(),
    heartRate: z.number().min(50).max(250).optional(),
  })).optional(),
  activityType: z.enum(['run', 'bike']).optional().default('run'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD format
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM format
  paceHeartRateSettings: z.object({
    averagePace: z.number(),
    paceInconsistency: z.number(),
    includeHeartRate: z.boolean(),
    averageHeartRate: z.number(),
    heartRateVariability: z.number()
  }).optional(),
})

// User registration validation
export const UserRegistrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
})

// User login validation
export const UserLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Search/filter validation
export const RouteSearchSchema = z.object({
  query: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  minDistance: z.number().min(0).optional(),
  maxDistance: z.number().max(1000).optional(),
  activityType: z.enum(['run', 'bike']).optional(),
  page: z.number().min(1).max(100).default(1),
  limit: z.number().min(1).max(50).default(20),
  sortBy: z.enum(['createdAt', 'name', 'distance']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Elevation data request validation
export const ElevationRequestSchema = z.object({
  points: z.array(z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })).min(1).max(100), // limit to 100 points per request
})

// Generic API response schemas
export const ApiSuccessSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  message: z.string().optional(),
})

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
})

// Type exports
export type RoutePoint = z.infer<typeof RoutePointSchema>
export type RouteData = z.infer<typeof RouteDataSchema>
export type FileGenerationRequest = z.infer<typeof FileGenerationSchema>
export type RouteCreationRequest = z.infer<typeof RouteCreationSchema>
export type UserRegistration = z.infer<typeof UserRegistrationSchema>
export type UserLogin = z.infer<typeof UserLoginSchema>
export type RouteSearch = z.infer<typeof RouteSearchSchema>
export type ElevationRequest = z.infer<typeof ElevationRequestSchema>
export type ApiSuccess<T = unknown> = {
  success: true
  data: T
  message?: string
}
export type ApiError = {
  success: false
  error: string
  code?: string
  details?: Record<string, unknown>
}