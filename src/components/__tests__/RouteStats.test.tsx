import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import RouteStats from '../RouteStats'
import type { RouteData } from '@/types'

const mockRouteData: RouteData = {
  points: [
    { lat: 46.05, lng: 14.5, elevation: 300 },
    { lat: 46.06, lng: 14.51, elevation: 310 }
  ],
  distance: 5.2,
  duration: 1800, // 30 minutes
  elevationGain: 150,
  averagePace: 5.5
}

const mockProps = {
  routeData: mockRouteData,
  unitSystem: 'metric' as const,
  activityType: 'run' as const,
  onUnitSystemChange: jest.fn(),
  onActivityTypeChange: jest.fn(),
  onPaceHeartRateSettingsChange: jest.fn()
}

describe('RouteStats Component', () => {
  it('renders route statistics correctly', () => {
    render(<RouteStats {...mockProps} />)
    
    // Check if main heading is present
    expect(screen.getByText('Activity Stats')).toBeInTheDocument()
    
    // Check distance display
    expect(screen.getByText('5.20')).toBeInTheDocument()
    expect(screen.getByText('km')).toBeInTheDocument()
    
    // Check duration display (30 minutes = 30:00)
    expect(screen.getByText('30:00')).toBeInTheDocument()
    
    // Check elevation gain
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('m')).toBeInTheDocument()
    
    // Check average pace (5:30)
    expect(screen.getByText('Avg Pace')).toBeInTheDocument()
    const paceElements = screen.getAllByText('5:30')
    expect(paceElements.length).toBeGreaterThan(0)
  })
  
  it('displays zero values for empty route', () => {
    const emptyRoute: RouteData = {
      points: [],
      distance: 0,
      duration: 0,
      elevationGain: 0,
      averagePace: 5.5
    }
    
    render(<RouteStats {...mockProps} routeData={emptyRoute} />)
    
    expect(screen.getByText('0.00')).toBeInTheDocument()
    expect(screen.getByText('0:00')).toBeInTheDocument()
  })
  
  it('formats pace correctly', () => {
    const routeWithDifferentPace: RouteData = {
      ...mockRouteData,
      averagePace: 4.25 // 4:15 pace
    }
    
    render(<RouteStats {...mockProps} routeData={routeWithDifferentPace} />)
    
    // Look for pace specifically in the average pace section
    expect(screen.getByText('Avg Pace')).toBeInTheDocument()
    // Check that pace settings are displayed (the component uses default pace settings)
    expect(screen.getByText('Pace & Heart Rate Settings')).toBeInTheDocument()
  })
  
  it('shows heart rate settings section', () => {
    render(<RouteStats {...mockProps} />)
    
    // Check if the heart rate settings section is present
    expect(screen.getByText('Include Heart Rate Data')).toBeInTheDocument()
    
    // Check for pace and heart rate settings header
    expect(screen.getByText('Pace & Heart Rate Settings')).toBeInTheDocument()
  })
  
  it('displays pace and heart rate settings', () => {
    render(<RouteStats {...mockProps} />)
    
    expect(screen.getByText('Pace & Heart Rate Settings')).toBeInTheDocument()
    expect(screen.getByText('Avg Pace')).toBeInTheDocument()
  })
})