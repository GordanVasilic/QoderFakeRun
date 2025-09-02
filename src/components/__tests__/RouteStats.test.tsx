import { render, screen } from '@testing-library/react'
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

describe('RouteStats Component', () => {
  it('renders route statistics correctly', () => {
    render(<RouteStats routeData={mockRouteData} unitSystem="metric" />)
    
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
    
    render(<RouteStats routeData={emptyRoute} unitSystem="metric" />)
    
    expect(screen.getByText('0.00')).toBeInTheDocument()
    expect(screen.getByText('0:00')).toBeInTheDocument()
  })
  
  it('formats pace correctly', () => {
    const routeWithDifferentPace: RouteData = {
      ...mockRouteData,
      averagePace: 4.25 // 4:15 pace
    }
    
    render(<RouteStats routeData={routeWithDifferentPace} unitSystem="metric" />)
    
    // Look for pace specifically in the average pace section
    expect(screen.getByText('Avg Pace')).toBeInTheDocument()
    const paceElements = screen.getAllByText(/4:15/)
    expect(paceElements.length).toBeGreaterThan(0)
  })
  
  it('shows heart rate option checkbox', () => {
    render(<RouteStats routeData={mockRouteData} unitSystem="metric" />)
    
    // Look for the checkbox input directly since the label structure includes emojis
    const heartRateCheckbox = screen.getByRole('checkbox')
    expect(heartRateCheckbox).toBeInTheDocument()
    expect(heartRateCheckbox).toHaveAttribute('type', 'checkbox')
    
    // Check if the text content is present
    expect(screen.getByText('Include Heart Rate Data')).toBeInTheDocument()
  })
  
  it('displays pace consistency information', () => {
    render(<RouteStats routeData={mockRouteData} unitSystem="metric" />)
    
    expect(screen.getByText('Pace Consistency')).toBeInTheDocument()
    expect(screen.getByText('🎯 Constant pace throughout - most efficient strategy')).toBeInTheDocument()
  })
})