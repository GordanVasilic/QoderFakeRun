/**
 * Software Rendering Test Suite
 * 
 * Tests to verify that the MapComponent works correctly in software rendering mode
 * without WebGL dependencies.
 */

import { render, screen } from '@testing-library/react'
// import '@testing-library/jest-dom' // Commented out to fix Vercel build issues
import MapComponent from '@/components/MapComponent'

// Mock Mapbox GL JS for testing
jest.mock('mapbox-gl', () => ({
  Map: jest.fn().mockImplementation(() => ({
    addControl: jest.fn(),
    on: jest.fn(),
    getCanvas: jest.fn().mockReturnValue({
      getContext: jest.fn().mockReturnValue(null), // No WebGL context
      addEventListener: jest.fn(),
      style: {}
    }),
    remove: jest.fn(),
    flyTo: jest.fn(),
    getSource: jest.fn(),
    getLayer: jest.fn(),
    addSource: jest.fn(),
    addLayer: jest.fn()
  })),
  NavigationControl: jest.fn(),
  GeolocateControl: jest.fn().mockImplementation(() => ({
    on: jest.fn()
  })),
  accessToken: ''
}))

// Mock environment variables
const originalEnv = process.env
beforeEach(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: 'pk.test.token'
  }
})

afterEach(() => {
  process.env = originalEnv
})

describe('MapComponent - Software Rendering Mode', () => {
  const mockProps = {
    onRouteChange: jest.fn(),
    selectedShape: 'draw' as const,
    showWaypoints: true,
    onShowWaypointsChange: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should render without WebGL errors or software rendering notifications', () => {
    render(<MapComponent {...mockProps} />)
    
    // Should not show any WebGL error messages
    expect(screen.queryByText(/webgl/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/graphics context/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/recovery/i)).not.toBeInTheDocument()
    
    // Should not show software rendering notification in UI
    expect(screen.queryByText(/software rendering/i)).not.toBeInTheDocument()
  })

  test('should show loading state without software rendering references', async () => {
    render(<MapComponent {...mockProps} />)
    
    // Should show loading initially
    expect(screen.getByText(/loading map/i)).toBeInTheDocument()
    
    // But should not mention software rendering
    expect(screen.queryByText(/software rendering/i)).not.toBeInTheDocument()
  })

  test('should handle rendering errors gracefully', () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    
    render(<MapComponent {...mockProps} />)
    
    // Should handle errors without crashing
    expect(screen.queryByText(/all recovery attempts failed/i)).not.toBeInTheDocument()
    
    consoleSpy.mockRestore()
  })

  test('should initialize with software rendering configuration', () => {
    const MapboxGL = require('mapbox-gl')
    
    render(<MapComponent {...mockProps} />)
    
    // Should be called with software rendering configuration
    expect(MapboxGL.Map).toHaveBeenCalledWith(
      expect.objectContaining({
        failIfMajorPerformanceCaveat: false, // Always use software fallback
        preserveDrawingBuffer: true, // Required for software rendering
        antialias: false, // Disable for better software performance
        renderWorldCopies: false // Reduce complexity
      })
    )
  })
})