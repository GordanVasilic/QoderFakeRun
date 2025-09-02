-- Migration: Add routeCoordinates and routeElevations fields to routes table
-- This ensures complete route data is preserved instead of being reconstructed

-- Add new JSONB columns to store complete route data
ALTER TABLE routes 
ADD COLUMN "routeCoordinates" JSONB,
ADD COLUMN "routeElevations" JSONB;

-- Add indexes for better query performance
CREATE INDEX idx_routes_route_coordinates ON routes USING GIN ("routeCoordinates");
CREATE INDEX idx_routes_route_elevations ON routes USING GIN ("routeElevations");

-- Add comments to document the new fields
COMMENT ON COLUMN routes."routeCoordinates" IS 'Complete route coordinates array from Mapbox routing API as JSONB';
COMMENT ON COLUMN routes."routeElevations" IS 'Complete route elevations array corresponding to route coordinates as JSONB';

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON routes TO anon;
GRANT ALL PRIVILEGES ON routes TO authenticated;