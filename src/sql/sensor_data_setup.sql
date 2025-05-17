-- SQL Setup for Sensor Data Table

-- Create the sensor_data table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.sensor_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('temperature', 'humidity')),
    value NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location TEXT DEFAULT 'main'
);

-- Create an index for faster queries on type
CREATE INDEX IF NOT EXISTS idx_sensor_data_type ON public.sensor_data(type);

-- Create an index for faster sorting by timestamp
CREATE INDEX IF NOT EXISTS idx_sensor_data_created_at ON public.sensor_data(created_at DESC);

-- Create a function to update notification table on extreme values
CREATE OR REPLACE FUNCTION public.check_sensor_thresholds()
RETURNS TRIGGER AS $$
BEGIN
    -- Check temperature thresholds
    IF NEW.type = 'temperature' THEN
        -- High temperature alert (>30°C)
        IF NEW.value > 30 THEN
            INSERT INTO public.alerts (type, message, source)
            VALUES ('danger', 'High temperature alert: ' || NEW.value || '°C', 'sensor');
        -- Low temperature alert (<15°C)
        ELSIF NEW.value < 15 THEN
            INSERT INTO public.alerts (type, message, source)
            VALUES ('warning', 'Low temperature alert: ' || NEW.value || '°C', 'sensor');
        END IF;
    -- Check humidity thresholds
    ELSIF NEW.type = 'humidity' THEN
        -- High humidity alert (>70%)
        IF NEW.value > 70 THEN
            INSERT INTO public.alerts (type, message, source)
            VALUES ('warning', 'High humidity alert: ' || NEW.value || '%', 'sensor');
        -- Low humidity alert (<30%)
        ELSIF NEW.value < 30 THEN
            INSERT INTO public.alerts (type, message, source)
            VALUES ('warning', 'Low humidity alert: ' || NEW.value || '%', 'sensor');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create alerts table for notifications
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'danger')),
    message TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE
);

-- Create trigger for sensor threshold checks
DROP TRIGGER IF EXISTS on_sensor_data_insert ON public.sensor_data;
CREATE TRIGGER on_sensor_data_insert
    AFTER INSERT ON public.sensor_data
    FOR EACH ROW
    EXECUTE PROCEDURE public.check_sensor_thresholds();

-- Enable Row Level Security
ALTER TABLE public.sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for sensor_data
CREATE POLICY sensor_data_select_policy ON public.sensor_data
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.owners));

CREATE POLICY sensor_data_insert_policy ON public.sensor_data
    FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM public.owners));

-- Create policies for alerts
CREATE POLICY alerts_select_policy ON public.alerts
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.owners));

-- Insert sample data (uncomment if you want initial data)
/*
INSERT INTO public.sensor_data (type, value)
VALUES 
    ('temperature', 24.5),
    ('humidity', 55.2);
*/ 