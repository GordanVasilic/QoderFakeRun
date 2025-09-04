import type { RouteData, RoutePoint, RunDetails } from '@/types'

export interface FileGenerationOptions {
  name: string
  date: string
  startTime: string
  description: string
  includeHeartRate: boolean
  activityType: 'run' | 'bike'
}

// Generate GPX file content with full route coordinates
export function generateGPX(routeData: RouteData, options: FileGenerationOptions, chartData?: any[]): string {
  const { name, date, startTime, description } = options
  
  // Enhanced debug logging for heart rate
  console.log('📁 GPX Generation - Title:', name, 'Description:', description)
  console.log('💓 GPX Generation - Include HR:', options.includeHeartRate, 'Chart data points:', chartData?.length || 0)
  
  // Additional heart rate debug logging
  if (options.includeHeartRate) {
    console.log('💓 HEART RATE ENABLED - Expected to include HR data in GPX')
    if (chartData && chartData.length > 0) {
      const hrSamples = chartData.slice(0, 5).map(p => ({ dist: p.distance, hr: p.heartRate }))
      console.log('💓 Sample chart data with HR:', hrSamples)
    } else {
      console.log('⚠️  PROBLEM: Heart rate enabled but no chart data for GPX!')
    }
  } else {
    console.log('💫 Heart rate DISABLED - Will NOT include HR data in GPX')
  }
  
  // Parse date and time
  const startDateTime = new Date(`${date}T${startTime}:00.000Z`)
  
  let gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd" creator="StravaGPX" version="1.1" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <metadata>
    <time>${startDateTime.toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(name || 'My Route')}</name>
    <type>${options.activityType === 'bike' ? 'cycling' : 'running'}</type>
    <trkseg>`

  // Use complete route coordinates if available, otherwise fallback to waypoints
  const useFullRoute = routeData.routeCoordinates && 
                      routeData.routeCoordinates.length > 0 && 
                      routeData.routeElevations &&
                      routeData.routeElevations.length > 0
  
  if (useFullRoute) {
    console.log('📁 GPX: Using full route with', routeData.routeCoordinates!.length, 'GPS points')
    
    let cumulativeTime = 0 // Track time in seconds
    
    // Generate track points from complete route with realistic pace timing
    routeData.routeCoordinates!.forEach((coord, index) => {
      const [lng, lat] = coord // Mapbox format: [lng, lat]
      const elevation = routeData.routeElevations![index] || 0
      
      // Calculate realistic time based on pace if chart data is available
      if (index > 0 && chartData && chartData.length > 0) {
        const prevCoord = routeData.routeCoordinates![index - 1]
        const [prevLng, prevLat] = prevCoord
        const segmentDistance = calculateDistance(prevLat, prevLng, lat, lng) // in km
        
        // Get pace for this segment from chart data
        const chartIndex = Math.min(Math.floor((index / routeData.routeCoordinates!.length) * chartData.length), chartData.length - 1)
        const segmentPace = chartData[chartIndex]?.pace || routeData.averagePace // min/km
        
        // Calculate time for this segment: distance (km) * pace (min/km) * 60 (sec/min)
        const segmentTime = segmentDistance * segmentPace * 60
        cumulativeTime += segmentTime
      } else if (index > 0) {
        // Fallback: use average pace if no chart data
        const prevCoord = routeData.routeCoordinates![index - 1]
        const [prevLng, prevLat] = prevCoord
        const segmentDistance = calculateDistance(prevLat, prevLng, lat, lng)
        const segmentTime = segmentDistance * routeData.averagePace * 60
        cumulativeTime += segmentTime
      }
      
      const pointTime = new Date(startDateTime.getTime() + (cumulativeTime * 1000))
      
      gpxContent += `
      <trkpt lat="${lat.toFixed(7)}" lon="${lng.toFixed(7)}">
        <ele>${elevation.toFixed(2)}</ele>
        <time>${pointTime.toISOString()}</time>`
      
      // Add heart rate data if available and enabled
      if (options.includeHeartRate && chartData && chartData.length > 0) {
        const chartIndex = Math.min(Math.floor((index / routeData.routeCoordinates!.length) * chartData.length), chartData.length - 1)
        const heartRate = chartData[chartIndex]?.heartRate
        
        if (heartRate && heartRate > 50 && heartRate < 250) {
          gpxContent += `
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>${Math.round(heartRate)}</gpxtpx:hr>
          </gpxtpx:TrackPointExtension>
        </extensions>`
        }
      }
      
      gpxContent += `
      </trkpt>`
    })
  } else {
    console.log('📁 GPX: Using waypoints only (', routeData.points.length, 'points)')
    
    // Fallback to waypoints with 30-second intervals
    routeData.points.forEach((point, index) => {
      const pointTime = new Date(startDateTime.getTime() + (index * 30000)) // 30 seconds between points
      const elevation = point.elevation || 0
      
      gpxContent += `
      <trkpt lat="${point.lat.toFixed(7)}" lon="${point.lng.toFixed(7)}">
        <ele>${elevation.toFixed(2)}</ele>
        <time>${pointTime.toISOString()}</time>`
      
      // Add heart rate data if available and enabled
      if (options.includeHeartRate && chartData && chartData[index]) {
        const heartRate = chartData[index].heartRate
        if (heartRate && heartRate > 50 && heartRate < 250) {
          gpxContent += `
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>${Math.round(heartRate)}</gpxtpx:hr>
          </gpxtpx:TrackPointExtension>
        </extensions>`
        }
      }
      
      gpxContent += `
      </trkpt>`
    })
  }

  gpxContent += `
    </trkseg>
  </trk>
</gpx>`

  return gpxContent
}

// Generate TCX file content (Training Center XML) with full route coordinates
export function generateTCX(routeData: RouteData, options: FileGenerationOptions, chartData?: any[]): string {
  const { name, date, startTime, description, includeHeartRate, activityType } = options
  
  // Enhanced debug logging for heart rate
  console.log('📋 TCX Generation - Title:', name, 'Description:', description)
  console.log('💓 TCX Generation - Include HR:', includeHeartRate, 'Chart data points:', chartData?.length || 0)
  
  // Additional heart rate debug logging
  if (includeHeartRate) {
    console.log('💓 HEART RATE ENABLED - Expected to include HR data')
    if (chartData && chartData.length > 0) {
      const hrSamples = chartData.slice(0, 5).map(p => ({ dist: p.distance, hr: p.heartRate }))
      console.log('💓 Sample chart data with HR:', hrSamples)
    } else {
      console.log('⚠️  PROBLEM: Heart rate enabled but no chart data!')
    }
  } else {
    console.log('💫 Heart rate DISABLED - Will NOT include HR data')
  }
  
  // Parse date and time
  const startDateTime = new Date(`${date}T${startTime}:00.000Z`)
  
  // Use complete route coordinates if available
  const useFullRoute = routeData.routeCoordinates && 
                      routeData.routeCoordinates.length > 0 && 
                      routeData.routeElevations &&
                      routeData.routeElevations.length > 0
  
  console.log('📁 TCX: Using', useFullRoute ? 'full route' : 'waypoints only')
  
  let tcxContent = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="${activityType === 'bike' ? 'Biking' : 'Running'}">
      <Id>${startDateTime.toISOString()}</Id>
      <Name>${escapeXml(name || 'My Route')}</Name>
      <Lap StartTime="${startDateTime.toISOString()}">
        <TotalTimeSeconds>${routeData.duration.toFixed(1)}</TotalTimeSeconds>
        <DistanceMeters>${(routeData.distance * 1000).toFixed(2)}</DistanceMeters>
        <MaximumSpeed>${(1000 / (routeData.averagePace * 60)).toFixed(2)}</MaximumSpeed>
        <Calories>${Math.round(routeData.distance * (activityType === 'bike' ? 40 : 70))}</Calories>`

  if (includeHeartRate && chartData && chartData.length > 0) {
    const validHeartRates = chartData.filter(point => point.heartRate && point.heartRate > 50).map(point => point.heartRate)
    if (validHeartRates.length > 0) {
      const avgHeartRate = validHeartRates.reduce((sum, hr) => sum + hr, 0) / validHeartRates.length
      const maxHeartRate = Math.max(...validHeartRates)
      
      tcxContent += `
        <AverageHeartRateBpm>
          <Value>${Math.round(avgHeartRate)}</Value>
        </AverageHeartRateBpm>
        <MaximumHeartRateBpm>
          <Value>${Math.round(maxHeartRate)}</Value>
        </MaximumHeartRateBpm>`
    }
  }

  tcxContent += `
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>
        <Track>`

  if (useFullRoute) {
    // Use complete route coordinates for realistic GPS tracking with pace-based timing
    const routeCoords = routeData.routeCoordinates!
    const routeElevs = routeData.routeElevations!
    
    let cumulativeDistance = 0
    let cumulativeTime = 0 // Track time in seconds
    
    routeCoords.forEach((coord, index) => {
      const [lng, lat] = coord // Mapbox format: [lng, lat]
      const elevation = routeElevs[index] || 0
      
      // Calculate cumulative distance and realistic timing
      if (index > 0) {
        const prevCoord = routeCoords[index - 1]
        const [prevLng, prevLat] = prevCoord
        const segmentDistance = calculateDistance(prevLat, prevLng, lat, lng) * 1000 // Convert to meters
        cumulativeDistance += segmentDistance
        
        // Calculate realistic time based on pace if chart data is available
        if (chartData && chartData.length > 0) {
          const chartIndex = Math.min(Math.floor((index / routeCoords.length) * chartData.length), chartData.length - 1)
          const segmentPace = chartData[chartIndex]?.pace || routeData.averagePace // min/km
          const segmentDistanceKm = segmentDistance / 1000 // Convert back to km for pace calculation
          const segmentTime = segmentDistanceKm * segmentPace * 60 // seconds
          cumulativeTime += segmentTime
        } else {
          // Fallback: use average pace
          const segmentDistanceKm = segmentDistance / 1000
          const segmentTime = segmentDistanceKm * routeData.averagePace * 60
          cumulativeTime += segmentTime
        }
      }
      
      const pointTime = new Date(startDateTime.getTime() + (cumulativeTime * 1000))
      
      tcxContent += `
          <Trackpoint>
            <Time>${pointTime.toISOString()}</Time>
            <Position>
              <LatitudeDegrees>${lat.toFixed(7)}</LatitudeDegrees>
              <LongitudeDegrees>${lng.toFixed(7)}</LongitudeDegrees>
            </Position>
            <AltitudeMeters>${elevation.toFixed(2)}</AltitudeMeters>
            <DistanceMeters>${cumulativeDistance.toFixed(2)}</DistanceMeters>`

      // Add heart rate data if available and corresponds to route points
      if (includeHeartRate && chartData && chartData.length > 0) {
        // Map route point to chart data point based on distance or index
        const chartIndex = Math.min(Math.floor((index / routeCoords.length) * chartData.length), chartData.length - 1)
        const heartRate = chartData[chartIndex]?.heartRate
        
        if (heartRate && heartRate > 50 && heartRate < 250) {
          tcxContent += `
            <HeartRateBpm>
              <Value>${Math.round(heartRate)}</Value>
            </HeartRateBpm>`
        }
      }

      tcxContent += `
          </Trackpoint>`
    })
  } else {
    // Fallback to waypoints
    routeData.points.forEach((point, index) => {
      const pointTime = new Date(startDateTime.getTime() + (index * 30000)) // 30 seconds between points
      const elevation = point.elevation || 0
      const distanceMeters = index > 0 ? calculateCumulativeDistance(routeData.points.slice(0, index + 1)) * 1000 : 0
      
      tcxContent += `
          <Trackpoint>
            <Time>${pointTime.toISOString()}</Time>
            <Position>
              <LatitudeDegrees>${point.lat.toFixed(7)}</LatitudeDegrees>
              <LongitudeDegrees>${point.lng.toFixed(7)}</LongitudeDegrees>
            </Position>
            <AltitudeMeters>${elevation.toFixed(2)}</AltitudeMeters>
            <DistanceMeters>${distanceMeters.toFixed(2)}</DistanceMeters>`

      if (includeHeartRate && chartData && chartData[index]) {
        const heartRate = chartData[index].heartRate
        if (heartRate && heartRate > 50 && heartRate < 250) {
          tcxContent += `
            <HeartRateBpm>
              <Value>${Math.round(heartRate)}</Value>
            </HeartRateBpm>`
        }
      }

      tcxContent += `
          </Trackpoint>`
    })
  }

  tcxContent += `
        </Track>
      </Lap>
      <Notes>${escapeXml((name && description) ? `${name}: ${description}` : (name || description || `Generated with FakeMyRide - Distance: ${routeData.distance.toFixed(2)}km, Duration: ${Math.floor(routeData.duration/60)}:${Math.floor(routeData.duration%60).toString().padStart(2,'0')}, Elevation: ${Math.round(routeData.elevationGain)}m`))}</Notes>
      <Training VirtualPartner="false">
        <Plan Type="Workout" IntervalWorkout="false"/>
      </Training>
    </Activity>
  </Activities>
  <Author>
    <Name>FakeMyRide</Name>
    <Build>
      <Version>
        <VersionMajor>1</VersionMajor>
        <VersionMinor>0</VersionMinor>
      </Version>
    </Build>
    <LangID>en</LangID>
    <PartNumber>000-00000-00</PartNumber>
  </Author>
</TrainingCenterDatabase>`

  return tcxContent
}

// Calculate cumulative distance for a series of points
function calculateCumulativeDistance(points: RoutePoint[]): number {
  let totalDistance = 0
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    totalDistance += calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng)
  }
  
  return totalDistance
}

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// Escape XML special characters
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case '\'': return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}

// Generate and download file
export function downloadFile(content: string, filename: string, mimeType: string = 'application/octet-stream') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

// Generate summary statistics
export function generateRunSummary(routeData: RouteData, options: FileGenerationOptions): string {
  const { name, date, startTime, description, activityType } = options
  
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatPace = (pace: number): string => {
    const minutes = Math.floor(pace)
    const seconds = Math.floor((pace - minutes) * 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatSpeed = (pace: number): string => {
    const speed = 60 / pace // Convert pace to speed
    return speed.toFixed(1)
  }

  const paceOrSpeedLabel = activityType === 'bike' ? 'Average Speed' : 'Average Pace'
  const paceOrSpeedValue = activityType === 'bike' 
    ? `${formatSpeed(routeData.averagePace)} km/h`
    : `${formatPace(routeData.averagePace)} min/km`

  return `
=== ${name || 'My Route'} ===
Date: ${new Date(date).toLocaleDateString()}
Start Time: ${startTime}
Activity: ${activityType === 'bike' ? 'Cycling' : 'Running'}

STATISTICS:
Distance: ${routeData.distance.toFixed(2)} km
Duration: ${formatTime(routeData.duration)}
${paceOrSpeedLabel}: ${paceOrSpeedValue}
Elevation Gain: ${Math.round(routeData.elevationGain)} m
Route Points: ${routeData.points.length}

DESCRIPTION:
${description || 'No description provided'}

Generated with FakeRun Pro
${new Date().toISOString()}
  `.trim()
}