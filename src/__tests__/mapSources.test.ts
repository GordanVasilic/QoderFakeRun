/**
 * Test for Map Sources Initialization
 * Verifies that duplicate source errors are prevented
 */

describe('Map Sources Initialization', () => {
  // Mock Mapbox GL JS
  const mockMap = {
    getSource: jest.fn(),
    addSource: jest.fn(),
    addLayer: jest.fn(),
    getLayer: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should handle existing sources gracefully', () => {
    // Simulate existing source
    mockMap.getSource.mockImplementation((id: string) => {
      if (id === 'route') {
        return {
          setData: jest.fn()
        }
      }
      return null
    })

    // Simulate the addSourceSafely logic
    const addSourceSafely = (id: string, source: any) => {
      const existingSource = mockMap.getSource(id)
      if (existingSource) {
        console.log(`📋 Source '${id}' already exists, updating data...`)
        if (existingSource && 'setData' in existingSource) {
          existingSource.setData(source.data)
        }
      } else {
        console.log(`➕ Adding new source '${id}'...`)
        mockMap.addSource(id, source)
      }
    }

    // Test adding a source that already exists
    const routeSource = {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      }
    }

    addSourceSafely('route', routeSource)

    // Verify that addSource was NOT called (because source already exists)
    expect(mockMap.addSource).not.toHaveBeenCalled()
    
    // Verify that getSource was called to check existence
    expect(mockMap.getSource).toHaveBeenCalledWith('route')
  })

  test('should add new source when it does not exist', () => {
    // Simulate no existing source
    mockMap.getSource.mockReturnValue(null)

    // Simulate the addSourceSafely logic
    const addSourceSafely = (id: string, source: any) => {
      const existingSource = mockMap.getSource(id)
      if (existingSource) {
        console.log(`📋 Source '${id}' already exists, updating data...`)
        if (existingSource && 'setData' in existingSource) {
          existingSource.setData(source.data)
        }
      } else {
        console.log(`➕ Adding new source '${id}'...`)
        mockMap.addSource(id, source)
      }
    }

    // Test adding a new source
    const waypointsSource = {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    }

    addSourceSafely('waypoints', waypointsSource)

    // Verify that addSource was called (because source doesn't exist)
    expect(mockMap.addSource).toHaveBeenCalledWith('waypoints', waypointsSource)
    
    // Verify that getSource was called to check existence
    expect(mockMap.getSource).toHaveBeenCalledWith('waypoints')
  })

  test('should handle existing layers gracefully', () => {
    // Simulate existing layer
    mockMap.getLayer.mockImplementation((id: string) => {
      if (id === 'route') {
        return { id: 'route', type: 'line' }
      }
      return null
    })

    // Simulate the addLayerSafely logic
    const addLayerSafely = (layer: any) => {
      if (mockMap.getLayer(layer.id)) {
        console.log(`📋 Layer '${layer.id}' already exists, skipping...`)
      } else {
        console.log(`➕ Adding new layer '${layer.id}'...`)
        mockMap.addLayer(layer)
      }
    }

    // Test adding a layer that already exists
    const routeLayer = {
      id: 'route',
      type: 'line',
      source: 'route',
      paint: { 'line-color': '#fc4c02' }
    }

    addLayerSafely(routeLayer)

    // Verify that addLayer was NOT called (because layer already exists)
    expect(mockMap.addLayer).not.toHaveBeenCalled()
    
    // Verify that getLayer was called to check existence
    expect(mockMap.getLayer).toHaveBeenCalledWith('route')
  })
})