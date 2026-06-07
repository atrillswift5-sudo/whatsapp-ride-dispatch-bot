CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS riders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  vehicle TEXT,
  plate TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rider_id UUID REFERENCES riders(id),
  rider_phone TEXT NOT NULL,
  rider_name TEXT,
  pickup_location TEXT,
  dropoff_location TEXT,
  pickup_time TEXT,
  passengers INTEGER,
  vehicle_type TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  assigned_driver_id UUID REFERENCES drivers(id),
  eta_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_states (
  phone TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'rider',
  state TEXT NOT NULL,
  ride_id UUID,
  temp_data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ride_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID REFERENCES rides(id),
  sender_phone TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO drivers (phone, name, vehicle, plate, status)
VALUES
('+12425550001', 'Michael', 'Black Toyota Alphard', 'C12345', 'available'),
('+12425550002', 'David', 'White Honda Odyssey', 'D23456', 'available')
ON CONFLICT (phone) DO NOTHING;
