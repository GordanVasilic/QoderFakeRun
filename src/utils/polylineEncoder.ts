/**
 * Polyline encoding utility for Mapbox Static Images API
 * Implements Google's polyline encoding algorithm
 */

/**
 * Encodes an array of coordinates into a polyline string
 * @param coordinates Array of [longitude, latitude] pairs
 * @returns Encoded polyline string
 */
export function encodePolyline(coordinates: [number, number][]): string {
  if (!coordinates || coordinates.length === 0) {
    return '';
  }

  let result = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const [lng, lat] of coordinates) {
    // Convert to integers (multiply by 1e5 and round)
    const latE5 = Math.round(lat * 1e5);
    const lngE5 = Math.round(lng * 1e5);

    // Calculate deltas
    const deltaLat = latE5 - prevLat;
    const deltaLng = lngE5 - prevLng;

    // Encode deltas
    result += encodeSignedNumber(deltaLat);
    result += encodeSignedNumber(deltaLng);

    // Update previous values
    prevLat = latE5;
    prevLng = lngE5;
  }

  return result;
}

/**
 * Encodes a signed number using the polyline algorithm
 * @param num Signed number to encode
 * @returns Encoded string
 */
function encodeSignedNumber(num: number): string {
  // Left-shift the binary value one bit and flip all the bits if negative
  let sgn_num = num << 1;
  if (num < 0) {
    sgn_num = ~sgn_num;
  }

  return encodeUnsignedNumber(sgn_num);
}

/**
 * Encodes an unsigned number using the polyline algorithm
 * @param num Unsigned number to encode
 * @returns Encoded string
 */
function encodeUnsignedNumber(num: number): string {
  let result = '';
  
  while (num >= 0x20) {
    result += String.fromCharCode((0x20 | (num & 0x1f)) + 63);
    num >>= 5;
  }
  
  result += String.fromCharCode(num + 63);
  return result;
}

/**
 * Simplifies a route by removing redundant points to reduce URL length
 * Uses a smarter approach that preserves route shape while limiting simplification
 * @param coordinates Array of [longitude, latitude] pairs
 * @param tolerance Tolerance for simplification (default: 0.00005)
 * @returns Simplified coordinates array
 */
export function simplifyRoute(coordinates: [number, number][], tolerance: number = 0.00005): [number, number][] {
  if (coordinates.length <= 2) {
    return coordinates;
  }

  // Use a much smaller tolerance to preserve route shape
  // 0.00005 degrees ≈ 5.5 meters at equator
  const actualTolerance = tolerance;
  
  // First pass: Douglas-Peucker simplification with small tolerance
  let simplified = douglasPeuckerSimplify(coordinates, actualTolerance);
  
  // If still too many points (>100), do a second pass with slightly higher tolerance
  if (simplified.length > 100) {
    simplified = douglasPeuckerSimplify(coordinates, actualTolerance * 2);
  }
  
  // If still too many points (>50), do uniform sampling to preserve shape
  if (simplified.length > 50) {
    simplified = uniformSample(coordinates, 50);
  }
  
  // Ensure we have at least start and end points
  if (simplified.length < 2) {
    return [coordinates[0], coordinates[coordinates.length - 1]];
  }
  
  return simplified;
}

/**
 * Douglas-Peucker line simplification algorithm
 * @param coordinates Array of [longitude, latitude] pairs
 * @param tolerance Tolerance for simplification
 * @returns Simplified coordinates array
 */
function douglasPeuckerSimplify(coordinates: [number, number][], tolerance: number): [number, number][] {
  if (coordinates.length <= 2) {
    return coordinates;
  }

  const simplified: [number, number][] = [coordinates[0]];
  
  for (let i = 1; i < coordinates.length - 1; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];
    const next = coordinates[i + 1];
    
    // Calculate distance from current point to line between prev and next
    const distance = pointToLineDistance(curr, prev, next);
    
    if (distance > tolerance) {
      simplified.push(curr);
    }
  }
  
  // Always include the last point
  simplified.push(coordinates[coordinates.length - 1]);
  
  return simplified;
}

/**
 * Uniform sampling to reduce points while preserving overall shape
 * @param coordinates Array of [longitude, latitude] pairs
 * @param maxPoints Maximum number of points to keep
 * @returns Sampled coordinates array
 */
function uniformSample(coordinates: [number, number][], maxPoints: number): [number, number][] {
  if (coordinates.length <= maxPoints) {
    return coordinates;
  }
  
  const result: [number, number][] = [coordinates[0]]; // Always include first point
  
  // Calculate step size for uniform sampling
  const step = (coordinates.length - 1) / (maxPoints - 1);
  
  for (let i = 1; i < maxPoints - 1; i++) {
    const index = Math.round(i * step);
    result.push(coordinates[index]);
  }
  
  // Always include last point
  result.push(coordinates[coordinates.length - 1]);
  
  return result;
}

/**
 * Calculates the distance from a point to a line segment
 * @param point The point [lng, lat]
 * @param lineStart Start of line segment [lng, lat]
 * @param lineEnd End of line segment [lng, lat]
 * @returns Distance from point to line
 */
function pointToLineDistance(point: [number, number], lineStart: [number, number], lineEnd: [number, number]): number {
  const [px, py] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    // Line segment is actually a point
    return Math.sqrt(A * A + B * B);
  }
  
  const param = dot / lenSq;
  
  let xx: number, yy: number;
  
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  
  const dx = px - xx;
  const dy = py - yy;
  
  return Math.sqrt(dx * dx + dy * dy);
}