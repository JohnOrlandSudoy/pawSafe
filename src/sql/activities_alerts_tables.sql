-- Create activities table to track system events
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  entity_type TEXT,
  entity_id UUID
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);

-- Create alerts table for system notifications
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  source TEXT,
  entity_type TEXT,
  entity_id UUID
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);

-- Create function to generate activities automatically on pet insert
CREATE OR REPLACE FUNCTION create_pet_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activities (action, user_id, user_name, details, entity_type, entity_id)
  VALUES (
    'added a new pet',
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'Added ' || NEW.name || ' (' || NEW.type || ')',
    'pet',
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for pet activities
DROP TRIGGER IF EXISTS pet_activity_trigger ON pets;
CREATE TRIGGER pet_activity_trigger
AFTER INSERT ON pets
FOR EACH ROW
EXECUTE FUNCTION create_pet_activity();

-- Create function to generate temperature alerts
CREATE OR REPLACE FUNCTION create_temperature_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if temperature is out of normal range (e.g., below 18°C or above 30°C)
  IF NEW.temperature < 18 OR NEW.temperature > 30 THEN
    INSERT INTO alerts (
      message, 
      type, 
      source,
      entity_type, 
      entity_id
    )
    VALUES (
      'Temperature alert: ' || NEW.temperature || '°C at location ' || NEW.location,
      CASE 
        WHEN NEW.temperature < 15 OR NEW.temperature > 35 THEN 'error'
        WHEN NEW.temperature < 18 OR NEW.temperature > 30 THEN 'warning'
        ELSE 'info'
      END,
      'sensor',
      'sensor_data',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for temperature alerts
DROP TRIGGER IF EXISTS temperature_alert_trigger ON sensor_data;
CREATE TRIGGER temperature_alert_trigger
AFTER INSERT ON sensor_data
FOR EACH ROW
EXECUTE FUNCTION create_temperature_alert();

-- Create sample data
INSERT INTO activities (action, user_name, details)
VALUES 
  ('system started', 'System', 'PawSafe monitoring system initialized'),
  ('sensor connected', 'System', 'Temperature and humidity sensors online');

INSERT INTO alerts (message, type)
VALUES 
  ('Welcome to PawSafe', 'info'),
  ('System is ready', 'info'); 