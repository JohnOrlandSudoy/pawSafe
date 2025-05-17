-- Function to fetch historical sensor data
CREATE OR REPLACE FUNCTION public.get_sensor_history(
    p_hours INTEGER DEFAULT 24,
    p_location TEXT DEFAULT NULL
) 
RETURNS TABLE (
    id UUID,
    temperature NUMERIC,
    humidity NUMERIC,
    location TEXT,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    cutoff_time TIMESTAMPTZ := NOW() - (p_hours || ' hours')::INTERVAL;
BEGIN
    RETURN QUERY 
    SELECT 
        sd.id,
        sd.temperature,
        sd.humidity,
        sd.location,
        sd.created_at
    FROM 
        public.sensor_data sd
    WHERE 
        sd.created_at >= cutoff_time
        AND (p_location IS NULL OR sd.location = p_location)
    ORDER BY 
        sd.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the sensor_data table exists
CREATE TABLE IF NOT EXISTS public.sensor_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    temperature NUMERIC NOT NULL,
    humidity NUMERIC NOT NULL,
    location TEXT DEFAULT 'Main Room',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Make table accessible
ALTER TABLE public.sensor_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY sensor_data_select ON public.sensor_data FOR SELECT USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sensor_data_created_at ON public.sensor_data(created_at);
CREATE INDEX IF NOT EXISTS idx_sensor_data_location ON public.sensor_data(location);

-- Add some sample data if table is empty
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO record_count FROM public.sensor_data;
    
    IF record_count = 0 THEN
        -- Insert sample data for the last 24 hours
        FOR i IN 1..24 LOOP
            INSERT INTO public.sensor_data (temperature, humidity, location, created_at)
            VALUES (
                -- Random temperature between 20°C and 28°C
                20 + (random() * 8)::NUMERIC(4,1),
                -- Random humidity between 40% and 60%
                40 + (random() * 20)::NUMERIC(4,1),
                'Main Room',
                NOW() - ((24 - i) || ' hours')::INTERVAL
            );
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql; 