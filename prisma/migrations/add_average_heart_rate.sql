-- Add averageHeartRate field to routes table
ALTER TABLE routes ADD COLUMN "averageHeartRate" INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN routes."averageHeartRate" IS 'Average heart rate in beats per minute for the route';