-- Initialize NagaraTrack Lite Database
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create basic tables for the application
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    route_id VARCHAR(50) UNIQUE NOT NULL,
    route_short_name VARCHAR(10),
    route_long_name VARCHAR(255),
    route_type INTEGER DEFAULT 3, -- Bus = 3 in GTFS
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stops (
    id SERIAL PRIMARY KEY,
    stop_id VARCHAR(50) UNIQUE NOT NULL,
    stop_name VARCHAR(255),
    stop_lat DECIMAL(10, 8),
    stop_lon DECIMAL(11, 8),
    location GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) UNIQUE NOT NULL,
    route_id VARCHAR(50) REFERENCES routes(route_id),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    bearing REAL,
    speed REAL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO routes (route_id, route_short_name, route_long_name) VALUES
('ROUTE_42', '42', 'City Center - Airport'),
('ROUTE_15', '15', 'Railway Station - Tech Park')
ON CONFLICT (route_id) DO NOTHING;

INSERT INTO stops (stop_id, stop_name, stop_lat, stop_lon) VALUES
('STOP_001', 'City Center', 28.7041, 77.1025),
('STOP_002', 'Airport', 28.5562, 77.1000),
('STOP_003', 'Railway Station', 28.6448, 77.2167),
('STOP_004', 'Tech Park', 28.4595, 77.0266)
ON CONFLICT (stop_id) DO NOTHING;

-- Update spatial column based on lat/lon if appropriate column exists
DO $$
BEGIN
    -- If a 'location' geography column exists, populate it where NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stops' AND column_name = 'location'
    ) THEN
        EXECUTE 'UPDATE stops SET location = ST_SetSRID(ST_MakePoint(stop_lon, stop_lat), 4326) WHERE location IS NULL;';

    -- Else if a spatial 'position' column exists (geometry/geography), populate it
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = 'stops' AND c.column_name = 'position' AND c.udt_name IN ('geometry','geography')
    ) THEN
        EXECUTE 'UPDATE stops SET position = ST_SetSRID(ST_MakePoint(stop_lon, stop_lat), 4326) WHERE position IS NULL;';

    ELSE
        RAISE NOTICE 'No spatial column (location or spatial position) present on stops; skipping geometry update.';
    END IF;
END
$$ LANGUAGE plpgsql;

-- Vehicles and assignments for Traccar devices
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    device_id TEXT UNIQUE NOT NULL, -- matches traccar device uniqueId
    license_plate TEXT,
    label TEXT,
    active BOOLEAN DEFAULT true,
    last_seen TIMESTAMP WITH TIME ZONE,
    last_lat DOUBLE PRECISION,
    last_lon DOUBLE PRECISION,
    last_speed DOUBLE PRECISION,
    last_heading DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS vehicle_assignments (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
    route_id TEXT NOT NULL,
    start_ts TIMESTAMP WITH TIME ZONE DEFAULT now(),
    end_ts TIMESTAMP WITH TIME ZONE
);

-- Add a non-destructive geography 'location' column and backfill from lat/lon
DO $$
BEGIN
    -- Add column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stops' AND column_name = 'location'
    ) THEN
        ALTER TABLE stops ADD COLUMN location geography(POINT,4326);
        -- Backfill for rows that have lat/lon
        UPDATE stops SET location = ST_SetSRID(ST_MakePoint(stop_lon::double precision, stop_lat::double precision), 4326)
            WHERE stop_lat IS NOT NULL AND stop_lon IS NOT NULL;
    ELSE
        -- If column exists and is of geography/geometry type, backfill missing values
        IF EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_name = 'stops' AND c.column_name = 'location' AND c.udt_name IN ('geography','geometry')
        ) THEN
            UPDATE stops SET location = ST_SetSRID(ST_MakePoint(stop_lon::double precision, stop_lat::double precision), 4326)
                WHERE (location IS NULL) AND stop_lat IS NOT NULL AND stop_lon IS NOT NULL;
        ELSE
            RAISE NOTICE 'Column "location" exists but is not geometry/geography; skipping backfill.';
        END IF;
    END IF;
END
$$ LANGUAGE plpgsql;