/**
 * Map and geospatial utility functions
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in kilometers
 */
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calculate standard deviation of a numeric array
 * @param values - Array of numeric values
 * @returns Standard deviation
 */
export const calculateStandardDeviation = (values: number[]): number => {
  if (values.length === 0) return 0
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Apply moving average smoothing to a data series
 * @param data - Array of numeric values
 * @param windowSize - Size of the moving average window
 * @returns Smoothed array
 */
export const applyMovingAverage = (data: number[], windowSize: number): number[] => {
  if (data.length === 0 || windowSize <= 1) return data
  
  const smoothed: number[] = []
  const halfWindow = Math.floor(windowSize / 2)
  
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - halfWindow)
    const end = Math.min(data.length - 1, i + halfWindow)
    
    let sum = 0
    let count = 0
    
    for (let j = start; j <= end; j++) {
      sum += data[j]
      count++
    }
    
    smoothed.push(sum / count)
  }
  
  return smoothed
}

/**
 * Apply backward-looking only moving average for realistic physiological response
 * This prevents premature responses to future elevation changes
 * @param data - Array of numeric values
 * @param windowSize - Size of the moving average window (looks back only)
 * @returns Smoothed array using only historical data
 */
export const applyBackwardMovingAverage = (data: number[], windowSize: number): number[] => {
  if (data.length === 0 || windowSize <= 1) return data
  
  const smoothed: number[] = []
  
  for (let i = 0; i < data.length; i++) {
    // Only look backward from current point for realistic physiological response
    const start = Math.max(0, i - windowSize + 1)
    const end = i
    
    let sum = 0
    let count = 0
    
    for (let j = start; j <= end; j++) {
      sum += data[j]
      count++
    }
    
    smoothed.push(sum / count)
  }
  
  return smoothed
}

/**
 * Convert degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180)
}

/**
 * Convert radians to degrees
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
export const toDegrees = (radians: number): number => {
  return radians * (180 / Math.PI)
}

/**
 * Calculate total distance of a route
 * @param points - Array of route points
 * @returns Total distance in kilometers
 */
export const calculateRouteDistance = (points: Array<{ lat: number; lng: number }>): number => {
  if (points.length < 2) return 0
  
  let totalDistance = 0
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    totalDistance += calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng)
  }
  return totalDistance
}

/**
 * Calculate elevation gain from a route
 * @param points - Array of route points with elevation data
 * @returns Total elevation gain in meters
 */
export const calculateElevationGain = (points: Array<{ elevation?: number }>): number => {
  if (points.length < 2) return 0
  
  let totalElevationGain = 0
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const elevationDiff = (curr.elevation || 0) - (prev.elevation || 0)
    
    if (elevationDiff > 0) {
      totalElevationGain += elevationDiff
    }
  }
  
  return totalElevationGain
}

/**
 * Format pace from decimal minutes to MM:SS format
 * @param pace - Pace in minutes per kilometer (decimal)
 * @returns Formatted pace string (e.g., "5:30")
 */
export const formatPace = (pace: number): string => {
  const minutes = Math.floor(pace)
  const seconds = Math.floor((pace - minutes) * 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Parse pace from MM:SS format to decimal minutes
 * @param paceString - Pace string in MM:SS format
 * @returns Pace in decimal minutes
 */
export const parsePace = (paceString: string): number => {
  const [minutes, seconds] = paceString.split(':').map(Number)
  return minutes + (seconds || 0) / 60
}

/**
 * Convert pace (min/km) to speed (km/h)
 * @param pace - Pace in minutes per kilometer
 * @returns Speed in kilometers per hour
 */
export const paceToSpeed = (pace: number): number => {
  if (pace <= 0) return 0
  return 60 / pace
}

/**
 * Convert speed (km/h) to pace (min/km)
 * @param speed - Speed in kilometers per hour
 * @returns Pace in minutes per kilometer
 */
export const speedToPace = (speed: number): number => {
  if (speed <= 0) return 0
  return 60 / speed
}

/**
 * Format speed for display
 * @param speed - Speed in km/h
 * @returns Formatted speed string (e.g., "12.5")
 */
export const formatSpeed = (speed: number): string => {
  return speed.toFixed(1)
}

/**
 * Convert pace for unit system and activity type
 * @param pace - Pace in min/km
 * @param activityType - 'run' or 'bike'
 * @param unitSystem - 'metric' or 'imperial'
 * @returns Object with value and unit
 */
export const convertPaceForDisplay = (
  pace: number, 
  activityType: 'run' | 'bike', 
  unitSystem: 'metric' | 'imperial'
): { value: string; unit: string } => {
  if (activityType === 'bike') {
    // For bikes, show speed instead of pace
    const speed = paceToSpeed(pace)
    const speedInUnits = unitSystem === 'imperial' ? speed * 0.621371 : speed // Convert to mph if imperial
    const unit = unitSystem === 'imperial' ? 'mph' : 'km/h'
    return {
      value: formatSpeed(speedInUnits),
      unit
    }
  } else {
    // For running, show pace
    const unit = unitSystem === 'imperial' ? 'min/mi' : 'min/km'
    let displayPace = pace
    
    if (unitSystem === 'imperial') {
      // Convert from min/km to min/mile
      displayPace = pace * 1.609344
    }
    
    return {
      value: formatPace(displayPace),
      unit
    }
  }
}

/**
 * Calculate elevation change rate over a past segment for realistic physiological response
 * @param points - Array of route points with elevation data
 * @param currentIndex - Current point index
 * @param lookBackDistance - Number of points to look back for trend
 * @returns Elevation change rate in meters per point
 */
export const calculateElevationTrend = (
  points: Array<{ elevation?: number }>,
  currentIndex: number,
  lookBackDistance: number = 5
): number => {
  // Only look backwards for realistic physiological response
  const startIndex = Math.max(0, currentIndex - lookBackDistance)
  const endIndex = currentIndex
  
  if (startIndex >= endIndex || !points[startIndex]?.elevation || !points[endIndex]?.elevation) {
    return 0
  }
  
  const elevationChange = points[endIndex].elevation! - points[startIndex].elevation!
  const distance = endIndex - startIndex
  
  return distance > 0 ? elevationChange / distance : 0 // meters per point
}

/**
 * Calculate current elevation gradient (slope) between consecutive points
 * @param points - Array of route points with elevation data
 * @param currentIndex - Current point index
 * @returns Current gradient in meters per point
 */
export const calculateCurrentGradient = (
  points: Array<{ elevation?: number }>,
  currentIndex: number
): number => {
  if (currentIndex === 0 || !points[currentIndex]?.elevation || !points[currentIndex - 1]?.elevation) {
    return 0
  }
  
  return points[currentIndex].elevation! - points[currentIndex - 1].elevation!
}

/**
 * Get pace adjustment based on elevation trend (smoother than point-to-point)
 * @param elevationTrend - Elevation change rate in meters per point
 * @returns Pace multiplier (1.0 = no change)
 */
export const getElevationPaceMultiplier = (elevationTrend: number): number => {
  // Much more gradual pace changes based on elevation trend
  if (elevationTrend > 3) return 1.4    // Steep uphill: +40% slower
  if (elevationTrend > 1.5) return 1.25  // Moderate uphill: +25% slower
  if (elevationTrend > 0.5) return 1.1   // Gentle uphill: +10% slower
  if (elevationTrend > -0.5) return 1.0  // Flat: no change
  if (elevationTrend > -1.5) return 0.9  // Gentle downhill: 10% faster
  if (elevationTrend > -3) return 0.8    // Moderate downhill: 20% faster
  return 0.75 // Steep downhill: 25% faster
}

/**
 * Generate realistic pace data for a route considering elevation changes
 * @param points - Array of route points with elevation data
 * @param averagePace - Target average pace in min/km
 * @param inconsistency - Pace inconsistency percentage (0-50) - total spread as % of average
 * @returns Array of pace values for each point
 */
export const generateRealisticPace = (
  points: Array<{ elevation?: number }>,
  averagePace: number,
  inconsistency: number
): number[] => {
  console.log('🏃‍♂️ Starting pace generation:')
  console.log('  Points:', points.length)
  console.log('  Average pace:', averagePace)
  console.log('  Inconsistency:', inconsistency, '%')
  console.log('  First 5 elevations:', points.slice(0, 5).map(p => p.elevation || 0))
  
  if (points.length === 0) return []
  if (points.length === 1) return [averagePace]

  // If 0% inconsistency, return flat line at average pace
  if (inconsistency === 0) {
    console.log('  ➡️ 0% inconsistency: returning flat pace')
    return new Array(points.length).fill(averagePace)
  }

  const paces: number[] = []
  
  // Calculate the pace range based on inconsistency percentage
  const paceSpread = (inconsistency / 100) * averagePace
  const minPace = averagePace - (paceSpread / 2)
  const maxPace = averagePace + (paceSpread / 2)
  
  console.log('  📊 Pace range: [', minPace.toFixed(2), '-', maxPace.toFixed(2), '] min/km')
  
  // Add slight momentum/inertia for natural flow
  let previousPace = averagePace
  
  for (let i = 0; i < points.length; i++) {
    let pace = averagePace
    
    // Calculate elevation effects using realistic backward-looking analysis
    // Use recent elevation trend (last few points) for physiological response
    const recentTrend = calculateElevationTrend(points, i, 4) // Look back 4 points
    const currentGradient = calculateCurrentGradient(points, i) // Immediate change
    
    // Combine recent trend with current gradient for realistic response
    const combinedElevationEffect = (recentTrend * 0.7) + (currentGradient * 0.3)
    const terrainMultiplier = getElevationPaceMultiplier(combinedElevationEffect)
    
    // Apply terrain effect with strong minimum impact
    const minTerrainEffect = 0.6 // Increased from 0.5 for more terrain response
    const scalingFactor = Math.max(minTerrainEffect, inconsistency / 100)
    const terrainEffect = (terrainMultiplier - 1) * scalingFactor
    pace = pace * (1 + terrainEffect)
    
    // Add progressive fatigue with more variation
    const fatigueEffect = 0.008 * (i / points.length) * (inconsistency / 80)
    pace = pace * (1 + fatigueEffect)
    
    // Add continuous micro-variations to prevent plateaus
    const microVariation = Math.sin(i * 0.3) * 0.08 * (inconsistency / 100) * averagePace
    pace += microVariation
    
    // Add controlled random variation with different scales
    const randomFactor = (Math.random() - 0.5) * 2 // -1 to 1
    const baseVariationRange = (maxPace - minPace) / 3 // Smaller base range
    const randomVariation = randomFactor * baseVariationRange * 0.3
    pace += randomVariation
    
    // Apply momentum from previous pace (natural inertia)
    const momentum = 0.15 // 15% momentum from previous pace
    pace = pace * (1 - momentum) + previousPace * momentum
    
    // Ensure pace stays within bounds
    pace = Math.max(minPace, Math.min(maxPace, pace))
    paces.push(pace)
    previousPace = pace
    
    // Debug first few points and elevation changes
    if (i < 5 || (i % 20 === 0)) {
      console.log(`    Point ${i}: elev=${points[i].elevation || 0}m, trend=${recentTrend.toFixed(2)}, gradient=${currentGradient.toFixed(2)}, combined=${combinedElevationEffect.toFixed(2)}, multiplier=${terrainMultiplier.toFixed(2)}, pace=${pace.toFixed(2)}`)
    }
  }
  
  // Very light smoothing to reduce sharp spikes while preserving variation - BACKWARD LOOKING ONLY
  const smoothingWindow = Math.max(2, Math.min(3, Math.floor(points.length / 15)))
  console.log('  🛠️ Applying backward-looking smoothing with window:', smoothingWindow)
  const lightSmoothed = applyBackwardMovingAverage(paces, smoothingWindow)
  
  // Minimal adjustment to maintain average while preserving ALL terrain effects
  const currentAverage = lightSmoothed.reduce((sum, p) => sum + p, 0) / lightSmoothed.length
  const adjustment = (averagePace - currentAverage) * 0.15 // Reduced from 0.3 to preserve more variation
  
  console.log('  🎯 Adjustment needed:', adjustment.toFixed(3), 'min/km')
  
  const finalPaces = lightSmoothed.map((pace, index) => {
    // Apply smaller adjustment with distance-based variation to prevent uniformity
    const distanceVariation = Math.sin(index * 0.2) * 0.02 * (inconsistency / 100) * averagePace
    const adjustedPace = pace + (adjustment * 0.8) + distanceVariation // Only 80% of adjustment
    return Math.max(minPace, Math.min(maxPace, adjustedPace))
  })
  
  console.log('  ✅ Final pace stats:')
  console.log('    Min:', Math.min(...finalPaces).toFixed(2))
  console.log('    Max:', Math.max(...finalPaces).toFixed(2))
  console.log('    Avg:', (finalPaces.reduce((sum, p) => sum + p, 0) / finalPaces.length).toFixed(2))
  console.log('    Range:', (Math.max(...finalPaces) - Math.min(...finalPaces)).toFixed(2))
  console.log('    Std Dev:', calculateStandardDeviation(finalPaces).toFixed(3))
  
  return finalPaces
}

/**
 * Generate realistic heart rate data based on pace and elevation
 * @param points - Array of route points with elevation data
 * @param paces - Array of pace values for each point
 * @param averageHeartRate - Target average heart rate in bpm
 * @param variability - Heart rate variability percentage (0-50) - total spread as % of average
 * @returns Array of heart rate values for each point
 */
export const generateRealisticHeartRate = (
  points: Array<{ elevation?: number }>,
  paces: number[],
  averageHeartRate: number,
  variability: number
): number[] => {
  console.log('❤️ Starting heart rate generation:')
  console.log('  Points:', points.length)
  console.log('  Average HR target:', averageHeartRate)
  console.log('  Variability:', variability, '%')
  
  if (points.length === 0) return []
  if (points.length === 1) return [averageHeartRate]
  
  // If 0% variability, return flat line at average heart rate
  if (variability === 0) {
    console.log('  ➡️ 0% variability: returning flat HR')
    return new Array(points.length).fill(averageHeartRate)
  }
  
  const heartRates: number[] = []
  
  // Calculate the heart rate range based on variability percentage
  const hrSpread = (variability / 100) * averageHeartRate
  const minHeartRate = Math.max(70, averageHeartRate - (hrSpread / 2)) // Never below 70 bpm
  const maxHeartRate = Math.min(220, averageHeartRate + (hrSpread / 2)) // Never above 220 bpm
  
  console.log('  📊 HR range: [', minHeartRate.toFixed(0), '-', maxHeartRate.toFixed(0), '] bpm')
  
  // Start at a realistic resting heart rate between 80-110 bpm
  const startingHR = 80 + Math.random() * 30 // Random between 80-110 bpm
  console.log('  🏁 Starting HR:', startingHR.toFixed(0), 'bpm (random between 80-110)')
  
  // Calculate warm-up progression parameters - more gradual warm-up
  const warmupPointsBase = Math.max(5, Math.min(15, Math.floor(points.length * 0.15))) // 15% of route or 5-15 points
  const warmupPoints = Math.max(warmupPointsBase, Math.min(20, Math.floor(points.length / 4))) // At least 1/4 of points for short routes
  
  console.log('  🔥 Warm-up period:', warmupPoints, 'points')
  
  for (let i = 0; i < points.length; i++) {
    let heartRate: number
    
    if (i === 0) {
      // First point: start at random low HR
      heartRate = startingHR
    } else {
      // Calculate base progression from starting HR to target average - more gradual
      let progressRatio = Math.min(1, i / warmupPoints) // Warm-up progression
      
      // More gradual progression - slower initial rise for more realistic warm-up
      progressRatio = Math.pow(progressRatio, 0.7) // Power curve for gradual acceleration
      
      // Base heart rate progresses from starting HR to target average
      let baseHR = startingHR + (averageHeartRate - startingHR) * progressRatio
      
      // STRONG elevation response using realistic backward-looking analysis
      const recentTrend = calculateElevationTrend(points, i, 3) // Look back 3 points for HR
      const currentGradient = calculateCurrentGradient(points, i) // Immediate change
      
      // Combine recent elevation experience with current gradient
      const combinedElevationEffect = (recentTrend * 0.8) + (currentGradient * 0.2)
      let elevationEffect = 0
      
      if (combinedElevationEffect > 3) {
        elevationEffect = 25 + (combinedElevationEffect - 3) * 5 // Very steep uphill: +25-40 bpm
      } else if (combinedElevationEffect > 1.5) {
        elevationEffect = 15 + (combinedElevationEffect - 1.5) * 6.7 // Steep uphill: +15-25 bpm
      } else if (combinedElevationEffect > 0.8) {
        elevationEffect = 8 + (combinedElevationEffect - 0.8) * 10 // Moderate uphill: +8-15 bpm
      } else if (combinedElevationEffect > 0.2) {
        elevationEffect = combinedElevationEffect * 25 // Gentle uphill: +5-8 bpm
      } else if (combinedElevationEffect < -0.8) {
        elevationEffect = -12 + combinedElevationEffect * 3 // Steep downhill: -12 to -20 bpm
      } else if (combinedElevationEffect < -0.2) {
        elevationEffect = combinedElevationEffect * 20 // Gentle downhill: -4 to -12 bpm
      }
      
      // Scale elevation effect by variability and ensure it's always significant
      const scaledElevationEffect = elevationEffect * Math.max(0.7, variability / 50)
      baseHR += scaledElevationEffect
      
      // Pace effort correlation (faster pace = higher effort = higher HR)
      const baselinePace = 5.5
      const paceEffort = (baselinePace - paces[i]) * 4 * (variability / 50)
      baseHR += paceEffort
      
      // Progressive fatigue over distance (more gradual)
      const fatigueEffect = 0.008 * (i / points.length) * (variability / 40)
      baseHR *= (1 + fatigueEffect)
      
      // Reduced momentum for more responsiveness to elevation changes
      const previousHR = heartRates[i - 1] || startingHR
      const momentum = 0.1 // Reduced from 0.2 to 0.1 for more responsiveness
      heartRate = baseHR * (1 - momentum) + previousHR * momentum
      
      // Add small natural variation
      const randomFactor = (Math.random() - 0.5) * 2 // -1 to 1
      const variationRange = (maxHeartRate - minHeartRate) / 8 // Smaller variations
      heartRate += randomFactor * variationRange * 0.3
    }
    
    // Ensure heart rate stays within bounds but allow temporary spikes during steep climbs
    if (i < warmupPoints) {
      // During warm-up, allow gradual increase but cap at reasonable levels
      heartRate = Math.max(startingHR, Math.min(averageHeartRate + 10, heartRate))
    } else {
      // After warm-up, allow full range but respect physiological limits
      heartRate = Math.max(Math.max(70, minHeartRate - 5), Math.min(Math.min(210, maxHeartRate + 10), heartRate))
    }
    
    heartRates.push(Math.round(heartRate))
    
    // Debug first few points and elevation change points
    if (i < 8 || (i % 20 === 0)) {
      const recentTrend = calculateElevationTrend(points, i, 3)
      const currentGrad = calculateCurrentGradient(points, i)
      const currentElev = points[i].elevation || 0
      console.log(`    Point ${i}: elev=${currentElev.toFixed(0)}m, trend=${recentTrend.toFixed(2)}, grad=${currentGrad.toFixed(2)}, pace=${paces[i].toFixed(2)}, HR=${heartRate.toFixed(0)}bpm`)
    }
  }
  
  // Very minimal smoothing to preserve elevation responsiveness - BACKWARD LOOKING ONLY
  const smoothingWindow = 2 // Very light smoothing
  const lightSmoothed = applyBackwardMovingAverage(heartRates, smoothingWindow)
  
  // Minimal adjustment to maintain target average without flattening elevation effects
  const currentAverage = lightSmoothed.reduce((sum, hr) => sum + hr, 0) / lightSmoothed.length
  const adjustment = (averageHeartRate - currentAverage) * 0.15 // Very small adjustment
  
  console.log('  🎯 Target vs Current average:', averageHeartRate, 'vs', currentAverage.toFixed(1))
  console.log('  📐 Adjustment needed:', adjustment.toFixed(1), 'bpm')
  
  const finalHeartRates = lightSmoothed.map((hr, index) => {
    // Apply minimal adjustment that doesn't interfere with elevation response
    const adjustedHR = hr + adjustment * (index > warmupPoints ? 1 : 0.5) // Less adjustment during warm-up
    
    // Ensure final bounds
    const bounded = Math.max(
      Math.max(70, minHeartRate - 5), 
      Math.min(Math.min(210, maxHeartRate + 10), adjustedHR)
    )
    
    return Math.round(bounded)
  })
  
  console.log('  ✅ Final HR stats:')
  console.log('    Start:', finalHeartRates[0], 'bpm')
  console.log('    Min:', Math.min(...finalHeartRates), 'bpm')
  console.log('    Max:', Math.max(...finalHeartRates), 'bpm')
  console.log('    Avg:', Math.round(finalHeartRates.reduce((sum, hr) => sum + hr, 0) / finalHeartRates.length), 'bpm')
  console.log('    Warm-up end (point', warmupPoints, '):', finalHeartRates[warmupPoints], 'bpm')
  console.log('    Range:', Math.max(...finalHeartRates) - Math.min(...finalHeartRates), 'bpm')
  
  return finalHeartRates
}