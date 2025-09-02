-- Add paceHeartRateSettings field to routes table
ALTER TABLE routes ADD COLUMN "paceHeartRateSettings" JSONB;

-- Add comment for documentation
COMMENT ON COLUMN routes."paceHeartRateSettings" IS 'JSON object containing pace and heart rate settings for the route';