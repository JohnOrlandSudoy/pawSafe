-- Check if sensor_data table exists
DO $$
BEGIN
    -- Add location column if it doesn't exist
    IF EXISTS (
        SELECT FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'sensor_data'
    ) AND NOT EXISTS (
        SELECT FROM pg_catalog.pg_attribute
        WHERE attrelid = 'public.sensor_data'::regclass
        AND attname = 'location'
        AND NOT attisdropped
    ) THEN
        ALTER TABLE public.sensor_data ADD COLUMN location TEXT DEFAULT 'Main Room';
    END IF;
END
$$;

-- If the table doesn't exist, create it with all required columns
CREATE TABLE IF NOT EXISTS public.sensor_data (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    temperature DOUBLE PRECISION NOT NULL,
    humidity DOUBLE PRECISION NOT NULL,
    location TEXT DEFAULT 'Main Room',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Make table accessible
ALTER TABLE public.sensor_data ENABLE ROW LEVEL SECURITY;

-- Check if policy exists before creating it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'sensor_data' 
        AND policyname = 'sensor_data_select'
    ) THEN
        CREATE POLICY sensor_data_select ON public.sensor_data FOR SELECT USING (true);
    END IF;
END
$$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sensor_data_created_at ON public.sensor_data(created_at);
CREATE INDEX IF NOT EXISTS idx_sensor_data_location ON public.sensor_data(location);

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_sensor_history(INTEGER, TEXT);

-- Function to fetch historical sensor data - FIXED to match actual column types
CREATE OR REPLACE FUNCTION public.get_sensor_history(
    p_hours INTEGER DEFAULT 24,
    p_location TEXT DEFAULT NULL
) 
RETURNS TABLE (
    id BIGINT,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
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
                20 + (random() * 8)::DOUBLE PRECISION,
                -- Random humidity between 40% and 60%
                40 + (random() * 20)::DOUBLE PRECISION,
                'Main Room',
                NOW() - ((24 - i) || ' hours')::INTERVAL
            );
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql; 