-- SQL Setup for User's existing Sensor Data Table

-- Enable Row Level Security on the sensor_data table
ALTER TABLE public.sensor_data ENABLE ROW LEVEL SECURITY;

-- Create policies for sensor_data to restrict access to owners only
CREATE POLICY sensor_data_select_policy ON public.sensor_data
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.owners));

CREATE POLICY sensor_data_insert_policy ON public.sensor_data
    FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM public.owners));

-- Create a trigger function to log extreme values to an alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'danger')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE
);

-- Enable RLS on alerts table
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow owners to see alerts
CREATE POLICY alerts_select_policy ON public.alerts
    FOR SELECT USING (auth.uid() IN (SELECT id FROM public.owners));

-- Create trigger function to monitor sensor values
CREATE OR REPLACE FUNCTION public.monitor_sensor_values()
RETURNS TRIGGER AS $$
BEGIN
    -- High temperature alert (>30°C)
    IF NEW.temperature > 30 THEN
        INSERT INTO public.alerts (type, message)
        VALUES ('danger', 'High temperature alert: ' || NEW.temperature || '°C');
    -- Low temperature alert (<15°C)
    ELSIF NEW.temperature < 15 THEN
        INSERT INTO public.alerts (type, message)
        VALUES ('warning', 'Low temperature alert: ' || NEW.temperature || '°C');
    END IF;
    
    -- High humidity alert (>70%)
    IF NEW.humidity > 70 THEN
        INSERT INTO public.alerts (type, message)
        VALUES ('warning', 'High humidity alert: ' || NEW.humidity || '%');
    -- Low humidity alert (<30%)
    ELSIF NEW.humidity < 30 THEN
        INSERT INTO public.alerts (type, message)
        VALUES ('warning', 'Low humidity alert: ' || NEW.humidity || '%');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for sensor monitoring
DROP TRIGGER IF EXISTS monitor_sensors ON public.sensor_data;
CREATE TRIGGER monitor_sensors
    AFTER INSERT ON public.sensor_data
    FOR EACH ROW
    EXECUTE PROCEDURE public.monitor_sensor_values(); 