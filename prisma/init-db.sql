-- PostgreSQL + PostGIS initialization script for FakeRun Pro
-- This script sets up the database with necessary extensions and initial data

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS \"postgis\";
CREATE EXTENSION IF NOT EXISTS \"postgis_topology\";
CREATE EXTENSION IF NOT EXISTS \"fuzzystrmatch\";
CREATE EXTENSION IF NOT EXISTS \"postgis_tiger_geocoder\";

-- Enable UUID extension for better ID generation
CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";

-- Set up spatial reference systems (if not already present)
-- Most common SRS for GPS data is EPSG:4326 (WGS84)
INSERT INTO spatial_ref_sys (srid, auth_name, auth_srid, proj4text, srtext) 
VALUES (4326, 'EPSG', 4326, '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs ', 
'GEOGCS[\"WGS 84\",DATUM[\"WGS_1984\",SPHEROID[\"WGS 84\",6378137,298.257223563,AUTHORITY[\"EPSG\",\"7030\"]],AUTHORITY[\"EPSG\",\"6326\"]],PRIMEM[\"Greenwich\",0,AUTHORITY[\"EPSG\",\"8901\"]],UNIT[\"degree\",0.01745329251994328,AUTHORITY[\"EPSG\",\"9122\"]],AUTHORITY[\"EPSG\",\"4326\"]]')
ON CONFLICT (srid) DO NOTHING;

-- Create indexes for better performance
-- These will be created automatically by Prisma, but good to have as reference

-- Function to calculate route distance from PostGIS geometry
CREATE OR REPLACE FUNCTION calculate_route_distance(route_geometry geometry)
RETURNS float AS $$
BEGIN
    RETURN ST_Length(ST_Transform(route_geometry, 3857)) / 1000.0; -- Convert to kilometers
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate elevation gain from waypoints
CREATE OR REPLACE FUNCTION calculate_elevation_gain(route_id text)
RETURNS float AS $$
DECLARE
    prev_elevation float := NULL;
    curr_elevation float;
    total_gain float := 0;
    waypoint RECORD;
BEGIN
    FOR waypoint IN 
        SELECT elevation 
        FROM route_waypoints 
        WHERE \"routeId\" = route_id 
        ORDER BY sequence ASC
    LOOP
        curr_elevation := waypoint.elevation;
        
        IF prev_elevation IS NOT NULL AND curr_elevation IS NOT NULL THEN
            IF curr_elevation > prev_elevation THEN
                total_gain := total_gain + (curr_elevation - prev_elevation);
            END IF;
        END IF;
        
        prev_elevation := curr_elevation;
    END LOOP;
    
    RETURN total_gain;
END;
$$ LANGUAGE plpgsql;

-- Function to find routes within a bounding box
CREATE OR REPLACE FUNCTION find_routes_in_bbox(
    min_lat float,
    min_lng float,
    max_lat float,
    max_lng float
)
RETURNS TABLE(
    route_id text,
    route_name text,
    distance_km float
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.name,
        r.distance
    FROM routes r
    WHERE r.\"isPublic\" = true
    AND ST_Intersects(
        r.geometry,
        ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to find nearby routes
CREATE OR REPLACE FUNCTION find_nearby_routes(
    center_lat float,
    center_lng float,
    radius_km float DEFAULT 10.0,
    activity_filter text DEFAULT NULL
)
RETURNS TABLE(
    route_id text,
    route_name text,
    distance_km float,
    distance_from_center_km float
) AS $$
DECLARE
    center_point geometry;
BEGIN
    center_point := ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326);
    
    RETURN QUERY
    SELECT 
        r.id,
        r.name,
        r.distance,
        ST_Distance(ST_Transform(center_point, 3857), ST_Transform(r.geometry, 3857)) / 1000.0
    FROM routes r
    WHERE r.\"isPublic\" = true
    AND ST_DWithin(
        ST_Transform(center_point, 3857),
        ST_Transform(r.geometry, 3857),
        radius_km * 1000
    )
    AND (activity_filter IS NULL OR r.\"activityType\"::text = activity_filter)
    ORDER BY ST_Distance(ST_Transform(center_point, 3857), ST_Transform(r.geometry, 3857));
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update route statistics
CREATE OR REPLACE FUNCTION update_route_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update route distance when geometry changes
    IF TG_OP = 'UPDATE' AND NEW.geometry IS DISTINCT FROM OLD.geometry THEN
        NEW.distance := calculate_route_distance(NEW.geometry);
        NEW.\"pointCount\" := ST_NPoints(NEW.geometry);
        NEW.\"updatedAt\" := NOW();
    END IF;
    
    -- For new routes
    IF TG_OP = 'INSERT' THEN
        NEW.distance := calculate_route_distance(NEW.geometry);
        NEW.\"pointCount\" := ST_NPoints(NEW.geometry);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS route_stats_trigger ON routes;
CREATE TRIGGER route_stats_trigger
    BEFORE INSERT OR UPDATE ON routes
    FOR EACH ROW
    EXECUTE FUNCTION update_route_stats();

-- Insert default system settings
INSERT INTO system_settings (id, key, value, description, category, \"isPublic\") VALUES
    ('default_rate_limit', 'default_rate_limit', '100', 'Default API rate limit per minute', 'api', false),
    ('max_route_points', 'max_route_points', '1000', 'Maximum points allowed per route', 'limits', true),
    ('max_route_distance', 'max_route_distance', '1000', 'Maximum route distance in kilometers', 'limits', true),
    ('enable_public_routes', 'enable_public_routes', 'true', 'Allow public route sharing', 'features', true),
    ('enable_route_export', 'enable_route_export', 'true', 'Allow route file exports', 'features', true)
ON CONFLICT (key) DO NOTHING;

-- Insert default tags
INSERT INTO tags (id, name, description, color) VALUES
    (gen_random_uuid()::text, 'beginner', 'Suitable for beginners', '#22c55e'),
    (gen_random_uuid()::text, 'intermediate', 'Intermediate difficulty', '#f59e0b'),
    (gen_random_uuid()::text, 'advanced', 'Advanced route', '#ef4444'),
    (gen_random_uuid()::text, 'scenic', 'Scenic route with beautiful views', '#3b82f6'),
    (gen_random_uuid()::text, 'urban', 'City/urban route', '#6b7280'),
    (gen_random_uuid()::text, 'trail', 'Trail or nature route', '#10b981'),
    (gen_random_uuid()::text, 'hills', 'Hilly terrain', '#f97316'),
    (gen_random_uuid()::text, 'flat', 'Flat terrain', '#84cc16')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better query performance
-- (These will also be created by Prisma migrations, but good to have as reference)

-- Spatial indexes (GIST)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routes_geometry ON routes USING GIST (geometry);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_waypoints_location ON route_waypoints USING GIST (location);

-- Regular indexes
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routes_public_activity ON routes (\"isPublic\", \"activityType\");
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_routes_user ON routes (\"userId\");
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_waypoints_route_sequence ON route_waypoints (\"routeId\", sequence);

-- Grant permissions (adjust based on your user setup)
-- GRANT USAGE ON SCHEMA public TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

COMMIT;