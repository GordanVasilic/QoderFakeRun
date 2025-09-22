/**
 * WebGL Diagnostic Utility
 * Provides comprehensive WebGL diagnostics and error analysis
 */

export interface WebGLDiagnostics {
  webglSupported: boolean
  webgl2Supported: boolean
  renderer: string
  vendor: string
  version: string
  extensions: string[]
  maxTextureSize: number
  maxVertexAttribs: number
  maxVaryingVectors: number
  maxFragmentUniforms: number
  maxVertexUniforms: number
  aliasedPointSizeRange: number[]
  aliasedLineWidthRange: number[]
  maxViewportDims: number[]
  contextAttributes: WebGLContextAttributes | null
  failureReason: string
  contextLost: boolean
  memoryInfo?: {
    totalJSHeapSize?: number
    usedJSHeapSize?: number
    jsHeapSizeLimit?: number
  }
}

/**
 * Get comprehensive WebGL diagnostics
 */
export function getWebGLDiagnostics(canvas?: HTMLCanvasElement): WebGLDiagnostics {
  const diagnostics: WebGLDiagnostics = {
    webglSupported: false,
    webgl2Supported: false,
    renderer: 'unknown',
    vendor: 'unknown',
    version: 'unknown',
    extensions: [],
    maxTextureSize: 0,
    maxVertexAttribs: 0,
    maxVaryingVectors: 0,
    maxFragmentUniforms: 0,
    maxVertexUniforms: 0,
    aliasedPointSizeRange: [0, 0],
    aliasedLineWidthRange: [0, 0],
    maxViewportDims: [0, 0],
    contextAttributes: null,
    failureReason: 'unknown',
    contextLost: false
  }

  try {
    const testCanvas = canvas || document.createElement('canvas')
    
    // Try WebGL 2.0 first, then WebGL 1.0
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = testCanvas.getContext('webgl2')
    if (gl) {
      diagnostics.webgl2Supported = true
      diagnostics.webglSupported = true
    } else {
      const webgl1Context = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')
      if (webgl1Context) {
        gl = webgl1Context as WebGLRenderingContext
        diagnostics.webglSupported = true
      }
    }

    if (!gl) {
      diagnostics.failureReason = 'No WebGL context could be created'
      return diagnostics
    }

    const webglContext = gl as WebGLRenderingContext
    
    // Check if context is lost
    diagnostics.contextLost = webglContext.isContextLost()

    // Get renderer and vendor info
    try {
      const debugInfo = webglContext.getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        diagnostics.renderer = webglContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown'
        diagnostics.vendor = webglContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown'
      }
    } catch (e) {
      // Debug info not available
    }

    // Get basic WebGL info
    diagnostics.version = webglContext.getParameter(webglContext.VERSION) || 'unknown'
    diagnostics.contextAttributes = webglContext.getContextAttributes()

    // Get WebGL limits
    diagnostics.maxTextureSize = webglContext.getParameter(webglContext.MAX_TEXTURE_SIZE) || 0
    diagnostics.maxVertexAttribs = webglContext.getParameter(webglContext.MAX_VERTEX_ATTRIBS) || 0
    diagnostics.maxVaryingVectors = webglContext.getParameter(webglContext.MAX_VARYING_VECTORS) || 0
    diagnostics.maxFragmentUniforms = webglContext.getParameter(webglContext.MAX_FRAGMENT_UNIFORM_VECTORS) || 0
    diagnostics.maxVertexUniforms = webglContext.getParameter(webglContext.MAX_VERTEX_UNIFORM_VECTORS) || 0
    diagnostics.aliasedPointSizeRange = webglContext.getParameter(webglContext.ALIASED_POINT_SIZE_RANGE) || [0, 0]
    diagnostics.aliasedLineWidthRange = webglContext.getParameter(webglContext.ALIASED_LINE_WIDTH_RANGE) || [0, 0]
    diagnostics.maxViewportDims = webglContext.getParameter(webglContext.MAX_VIEWPORT_DIMS) || [0, 0]

    // Get extensions
    diagnostics.extensions = webglContext.getSupportedExtensions() || []

    // Get memory info if available
    if ('memory' in performance) {
      const memInfo = (performance as {
        memory?: {
          totalJSHeapSize?: number;
          usedJSHeapSize?: number;
          jsHeapSizeLimit?: number;
        };
      }).memory;
      diagnostics.memoryInfo = {
        totalJSHeapSize: memInfo.totalJSHeapSize,
        usedJSHeapSize: memInfo.usedJSHeapSize,
        jsHeapSizeLimit: memInfo.jsHeapSizeLimit
      }
    }

    // Check for errors
    const error = webglContext.getError()
    if (error !== webglContext.NO_ERROR) {
      diagnostics.failureReason = `WebGL error: ${getWebGLErrorName(error, webglContext)}`
    }

  } catch (error) {
    diagnostics.failureReason = `Exception: ${error}`
  }

  return diagnostics
}

/**
 * Get human-readable WebGL error name
 */
function getWebGLErrorName(error: number, gl: WebGLRenderingContext): string {
  switch (error) {
    case gl.NO_ERROR: return 'NO_ERROR'
    case gl.INVALID_ENUM: return 'INVALID_ENUM'
    case gl.INVALID_VALUE: return 'INVALID_VALUE'
    case gl.INVALID_OPERATION: return 'INVALID_OPERATION'
    case gl.INVALID_FRAMEBUFFER_OPERATION: return 'INVALID_FRAMEBUFFER_OPERATION'
    case gl.OUT_OF_MEMORY: return 'OUT_OF_MEMORY'
    case gl.CONTEXT_LOST_WEBGL: return 'CONTEXT_LOST_WEBGL'
    default: return `UNKNOWN_ERROR(${error})`
  }
}

/**
 * Analyze WebGL diagnostics and provide user-friendly recommendations
 */
export function analyzeWebGLIssues(diagnostics: WebGLDiagnostics): {
  severity: 'critical' | 'warning' | 'info'
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []
  let severity: 'critical' | 'warning' | 'info' = 'info'

  // Critical issues
  if (!diagnostics.webglSupported) {
    severity = 'critical'
    issues.push('WebGL is not supported')
    recommendations.push('Update your browser to the latest version')
    recommendations.push('Enable hardware acceleration in browser settings')
    recommendations.push('Try a different browser (Chrome, Firefox, Safari)')
  }

  if (diagnostics.contextLost) {
    severity = 'critical'
    issues.push('WebGL context is lost')
    recommendations.push('Refresh the page')
    recommendations.push('Close other graphics-intensive applications')
    recommendations.push('Update your graphics drivers')
  }

  // Warning issues
  if (diagnostics.maxTextureSize < 4096) {
    severity = severity === 'critical' ? 'critical' : 'warning'
    issues.push(`Low maximum texture size: ${diagnostics.maxTextureSize}px`)
    recommendations.push('Update your graphics drivers')
    recommendations.push('Enable hardware acceleration')
  }

  if (diagnostics.renderer.includes('Software') || diagnostics.renderer.includes('software')) {
    severity = severity === 'critical' ? 'critical' : 'warning'
    issues.push('Using software rendering instead of hardware acceleration')
    recommendations.push('Enable hardware acceleration in browser settings')
    recommendations.push('Update your graphics drivers')
  }

  // Check for critical extensions
  const criticalExtensions = ['OES_element_index_uint', 'OES_standard_derivatives']
  const missingExtensions = criticalExtensions.filter(ext => !diagnostics.extensions.includes(ext))
  
  if (missingExtensions.length > 0) {
    severity = severity === 'critical' ? 'critical' : 'warning'
    issues.push(`Missing critical extensions: ${missingExtensions.join(', ')}`)
    recommendations.push('Update your graphics drivers')
    recommendations.push('Try a different browser')
  }

  // Memory warnings
  if (diagnostics.memoryInfo) {
    const memUsage = diagnostics.memoryInfo.usedJSHeapSize || 0
    const memLimit = diagnostics.memoryInfo.jsHeapSizeLimit || 0
    if (memLimit > 0 && memUsage / memLimit > 0.8) {
      severity = severity === 'critical' ? 'critical' : 'warning'
      issues.push('High memory usage detected')
      recommendations.push('Close other browser tabs or applications')
      recommendations.push('Refresh the page to free up memory')
    }
  }

  return { severity, issues, recommendations }
}

/**
 * Format diagnostics for console output
 */
export function logWebGLDiagnostics(diagnostics: WebGLDiagnostics): void {
  console.group('🔍 WebGL Diagnostics Report')
  
  console.log('📊 WebGL Support:', diagnostics.webglSupported ? '✅ Yes' : '❌ No')
  if (diagnostics.webgl2Supported) console.log('📊 WebGL 2.0:', '✅ Supported')
  
  console.log('💻 Renderer:', diagnostics.renderer)
  console.log('🏢 Vendor:', diagnostics.vendor)
  console.log('🔢 Version:', diagnostics.version)
  console.log('🖼️ Max Texture Size:', `${diagnostics.maxTextureSize}px`)
  console.log('📐 Max Viewport:', `${diagnostics.maxViewportDims[0]}x${diagnostics.maxViewportDims[1]}`)
  console.log('🧩 Extensions:', `${diagnostics.extensions.length} available`)
  
  if (diagnostics.contextLost) {
    console.warn('⚠️ Context Status:', 'LOST')
  } else {
    console.log('✅ Context Status:', 'OK')
  }
  
  if (diagnostics.memoryInfo) {
    const used = Math.round((diagnostics.memoryInfo.usedJSHeapSize || 0) / 1024 / 1024)
    const limit = Math.round((diagnostics.memoryInfo.jsHeapSizeLimit || 0) / 1024 / 1024)
    console.log('🧠 Memory Usage:', `${used}MB / ${limit}MB`)
  }
  
  if (diagnostics.failureReason !== 'unknown') {
    console.error('❌ Failure Reason:', diagnostics.failureReason)
  }
  
  const analysis = analyzeWebGLIssues(diagnostics)
  if (analysis.issues.length > 0) {
    console.group(`${analysis.severity === 'critical' ? '🚨' : '⚠️'} Issues Found`)
    analysis.issues.forEach(issue => console.warn('•', issue))
    console.groupEnd()
    
    console.group('💡 Recommendations')
    analysis.recommendations.forEach(rec => console.info('•', rec))
    console.groupEnd()
  }
  
  console.groupEnd()
}

/**
 * Test WebGL functionality
 */
export function testWebGLFunctionality(canvas?: HTMLCanvasElement): {
  success: boolean
  tests: { name: string, passed: boolean, error?: string }[]
} {
  const tests: { name: string, passed: boolean, error?: string }[] = []
  
  try {
    const testCanvas = canvas || document.createElement('canvas')
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')
    
    if (!gl) {
      tests.push({ name: 'Context Creation', passed: false, error: 'No WebGL context' })
      return { success: false, tests }
    }
    
    const webglContext = gl as WebGLRenderingContext
    tests.push({ name: 'Context Creation', passed: true })
    
    // Test shader creation
    try {
      const vertexShader = webglContext.createShader(webglContext.VERTEX_SHADER)
      const fragmentShader = webglContext.createShader(webglContext.FRAGMENT_SHADER)
      
      if (vertexShader && fragmentShader) {
        tests.push({ name: 'Shader Creation', passed: true })
        webglContext.deleteShader(vertexShader)
        webglContext.deleteShader(fragmentShader)
      } else {
        tests.push({ name: 'Shader Creation', passed: false, error: 'Could not create shaders' })
      }
    } catch (e) {
      tests.push({ name: 'Shader Creation', passed: false, error: String(e) })
    }
    
    // Test buffer creation
    try {
      const buffer = webglContext.createBuffer()
      if (buffer) {
        tests.push({ name: 'Buffer Creation', passed: true })
        webglContext.deleteBuffer(buffer)
      } else {
        tests.push({ name: 'Buffer Creation', passed: false, error: 'Could not create buffer' })
      }
    } catch (e) {
      tests.push({ name: 'Buffer Creation', passed: false, error: String(e) })
    }
    
    // Test texture creation
    try {
      const texture = webglContext.createTexture()
      if (texture) {
        tests.push({ name: 'Texture Creation', passed: true })
        webglContext.deleteTexture(texture)
      } else {
        tests.push({ name: 'Texture Creation', passed: false, error: 'Could not create texture' })
      }
    } catch (e) {
      tests.push({ name: 'Texture Creation', passed: false, error: String(e) })
    }
    
    const success = tests.every(test => test.passed)
    return { success, tests }
    
  } catch (error) {
    tests.push({ name: 'General Test', passed: false, error: String(error) })
    return { success: false, tests }
  }
}