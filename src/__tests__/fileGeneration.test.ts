/// <reference types="jest" />
import { generateGPX, generateTCX, generateRunSummary } from '@/utils/fileGeneration'
import type { RouteData } from '@/types'

const mockRouteData: RouteData = {
  points: [
    { lat: 46.05, lng: 14.5, elevation: 300 },
    { lat: 46.06, lng: 14.51, elevation: 310 },
    { lat: 46.07, lng: 14.52, elevation: 320 }
  ],
  distance: 2.1,
  duration: 630, // 10:30
  elevationGain: 20,
  averagePace: 5.0
}

const mockOptions = {
  name: 'Test Route',
  date: '2024-01-15',
  startTime: '08:30',
  description: 'Test route description',
  includeHeartRate: true,
  activityType: 'run' as const
}

describe('File Generation Utils', () => {
  describe('generateGPX', () => {
    it('generates valid GPX content', () => {
      const gpx = generateGPX(mockRouteData, mockOptions)
      
      // Check XML declaration
      expect(gpx).toContain('<?xml version=\"1.0\" encoding=\"UTF-8\"?>')
      
      // Check GPX namespace
      expect(gpx).toContain('<gpx version=\"1.1\"')
      expect(gpx).toContain('xmlns=\"http://www.topografix.com/GPX/1/1\"')
      
      // Check metadata
      expect(gpx).toContain('<name>Test Route</name>')
      expect(gpx).toContain('<desc>Test route description</desc>')
      
      // Check track points
      expect(gpx).toContain('lat=\"46.0500000\" lon=\"14.5000000\"')
      expect(gpx).toContain('<ele>300.00</ele>')
      
      // Check structure
      expect(gpx).toContain('<trk>')
      expect(gpx).toContain('<trkseg>')
      expect(gpx).toContain('<trkpt')
    })
    
    it('escapes XML special characters', () => {
      const optionsWithSpecialChars = {
        ...mockOptions,
        name: 'Route with <special> & \"characters\"',
        description: 'Description with <tags> & \"quotes\"'
      }
      
      const gpx = generateGPX(mockRouteData, optionsWithSpecialChars)
      
      expect(gpx).toContain('&lt;special&gt;')
      expect(gpx).toContain('&amp;')
      expect(gpx).toContain('&quot;')
    })
  })
  
  describe('generateTCX', () => {
    it('generates valid TCX content', () => {
      const chartData = [
        { distance: 0, pace: 5.0, elevation: 300, heartRate: 150 },
        { distance: 1.0, pace: 5.1, elevation: 310, heartRate: 155 },
        { distance: 2.1, pace: 4.9, elevation: 320, heartRate: 160 }
      ]
      
      const tcx = generateTCX(mockRouteData, mockOptions, chartData)
      
      // Check XML declaration
      expect(tcx).toContain('<?xml version=\"1.0\" encoding=\"UTF-8\"?>')
      
      // Check TCX namespace
      expect(tcx).toContain('xmlns=\"http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2\"')
      
      // Check activity type
      expect(tcx).toContain('Sport=\"Running\"')
      
      // Check lap data
      expect(tcx).toContain('<TotalTimeSeconds>630.0</TotalTimeSeconds>')
      expect(tcx).toContain('<DistanceMeters>2100.00</DistanceMeters>')
      
      // Check heart rate data
      expect(tcx).toContain('<AverageHeartRateBpm>')
      expect(tcx).toContain('<MaximumHeartRateBpm>')
      expect(tcx).toContain('<HeartRateBpm>')
      
      // Check track points
      expect(tcx).toContain('<LatitudeDegrees>46.0500000</LatitudeDegrees>')
      expect(tcx).toContain('<LongitudeDegrees>14.5000000</LongitudeDegrees>')
    })
    
    it('handles cycling activity type', () => {
      const cyclingOptions = {
        ...mockOptions,
        activityType: 'bike' as const
      }
      
      const tcx = generateTCX(mockRouteData, cyclingOptions)
      
      expect(tcx).toContain('Sport=\"Biking\"')
    })
    
    it('excludes heart rate when not requested', () => {
      const optionsWithoutHR = {
        ...mockOptions,
        includeHeartRate: false
      }
      
      const tcx = generateTCX(mockRouteData, optionsWithoutHR)
      
      expect(tcx).not.toContain('<AverageHeartRateBpm>')
      expect(tcx).not.toContain('<HeartRateBpm>')
    })
  })
  
  describe('generateRunSummary', () => {
    it('generates formatted run summary', () => {
      const summary = generateRunSummary(mockRouteData, mockOptions)
      
      // Check title
      expect(summary).toContain('=== Test Route ===')
      
      // Check basic info
      expect(summary).toContain('Date:')
      expect(summary).toContain('Start Time: 08:30')
      expect(summary).toContain('Activity: Running')
      
      // Check statistics
      expect(summary).toContain('Distance: 2.10 km')
      expect(summary).toContain('Duration: 10:30')
      expect(summary).toContain('Average Pace: 5:00 min/km')
      expect(summary).toContain('Elevation Gain: 20 m')
      expect(summary).toContain('Route Points: 3')
      
      // Check description
      expect(summary).toContain('Test route description')
      
      // Check footer
      expect(summary).toContain('Generated with FakeRun Pro')
    })
    
    it('handles missing optional fields', () => {
      const minimalOptions = {
        name: '',
        date: '2024-01-15',
        startTime: '08:30',
        description: '',
        includeHeartRate: false,
        activityType: 'run' as const
      }
      
      const summary = generateRunSummary(mockRouteData, minimalOptions)
      
      expect(summary).toContain('=== My Route ===')
      expect(summary).toContain('No description provided')
    })
  })
})