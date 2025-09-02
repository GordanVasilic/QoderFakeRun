-- Add averageHeartRate column to routes table
-- This column will store the average heart rate for each route in beats per minute (BPM)

ALTER TABLE routes ADD COLUMN "averageHeartRate" INTEGER;

-- Add comment to describe the column
COMMENT ON COLUMN routes."averageHeartRate" IS 'Average heart rate for the route in beats per minute (BPM)';