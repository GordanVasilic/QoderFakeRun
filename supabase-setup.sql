-- Enable PostGIS extension in Supabase
-- Run this in your Supabase SQL Editor

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS is installed
SELECT PostGIS_Version();

-- List all available extensions to confirm
SELECT * FROM pg_available_extensions WHERE name LIKE '%postgis%';