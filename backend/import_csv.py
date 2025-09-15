import os
import csv
import asyncio
import asyncpg
from typing import Optional
from dateutil import parser as date_parser


def _safe_parse_ts(value: Optional[str]):
    if value is None or value == "":
        return None
    try:
        return date_parser.parse(value)
    except Exception:
        return None

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:password@postgres:5432/nagaratrack"
)

DATA_DIR = os.environ.get("DATA_DIR", "/app/data")


async def import_bus_stops(conn: asyncpg.Connection, path: str) -> None:
    print(f"Importing bus stops from {path}...")
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    for r in rows:
        stop_id = r.get('stop_id')
        name = r.get('name') or r.get('stop_name')
        lat = r.get('latitude') or r.get('stop_lat')
        lon = r.get('longitude') or r.get('stop_lon')

        if not stop_id or not lat or not lon:
            continue

        try:
            await conn.execute(
                """
                INSERT INTO stops (stop_id, stop_name, stop_lat, stop_lon)
                VALUES ($1, $2, $3::double precision, $4::double precision)
                ON CONFLICT (stop_id) DO UPDATE SET
                    stop_name = EXCLUDED.stop_name,
                    stop_lat = EXCLUDED.stop_lat,
                    stop_lon = EXCLUDED.stop_lon
                """,
                stop_id,
                name,
                float(lat),
                float(lon),
            )
        except Exception as e:
            print(f"Failed to upsert stop {stop_id}: {e}")


async def import_routes(conn: asyncpg.Connection, path: str) -> None:
    print(f"Importing routes from {path}...")
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    for idx, r in enumerate(rows):
        route_id = r.get('route_id')
        short_name = r.get('route_short_name')
        long_name = r.get('route_name') or r.get('route_long_name') or short_name or route_id
        route_color = r.get('route_color')

        if not route_id:
            continue

        try:
            await conn.execute(
                """
                INSERT INTO routes (route_id, route_short_name, route_long_name)
                VALUES ($1, $2, $3)
                ON CONFLICT (route_id) DO UPDATE SET
                    route_short_name = EXCLUDED.route_short_name,
                    route_long_name = EXCLUDED.route_long_name
                """,
                str(route_id),
                short_name,
                long_name,
            )
        except Exception as e:
            print(f"Failed to upsert route {route_id}: {e}")


async def import_vehicles(conn: asyncpg.Connection, path: str) -> None:
    print(f"Importing vehicles from {path}...")
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    # Detect which vehicles schema is present. Some DBs define `device_id` and `last_*` columns (traccar-style),
    # others have `vehicle_id`, `latitude`, `longitude`, `bearing`, `speed`, `last_updated`.
    has_device_id = await conn.fetchval(
        "SELECT count(*) FROM information_schema.columns WHERE table_name='vehicles' AND column_name=$1",
        'device_id',
    )

    if has_device_id and int(has_device_id) > 0:
        # Use traccar-style columns
        for r in rows:
            device_id = r.get('vehicle_id') or r.get('device_id')
            route_id = r.get('route_id')
            lat = r.get('latitude') or r.get('last_lat')
            lon = r.get('longitude') or r.get('last_lon')
            speed = r.get('speed') or r.get('last_speed')
            heading = r.get('bearing') or r.get('last_heading')
            last_seen = r.get('last_updated') or r.get('updated_at') or r.get('last_seen')

            if not device_id or not lat or not lon:
                continue
            # Ensure route exists to avoid FK errors; if missing, set to NULL
            if route_id:
                route_exists = await conn.fetchval("SELECT 1 FROM routes WHERE route_id=$1", route_id)
                if not route_exists:
                    route_id = None

            try:
                await conn.execute(
                    """
                    INSERT INTO vehicles (device_id, last_lat, last_lon, last_speed, last_heading, last_seen, active)
                    VALUES ($1, $2::double precision, $3::double precision, $4::double precision, $5::double precision, $6::timestamptz, true)
                    ON CONFLICT (device_id) DO UPDATE SET
                        last_lat = EXCLUDED.last_lat,
                        last_lon = EXCLUDED.last_lon,
                        last_speed = EXCLUDED.last_speed,
                        last_heading = EXCLUDED.last_heading,
                        last_seen = EXCLUDED.last_seen,
                        active = EXCLUDED.active
                    """,
                    str(device_id),
                    float(lat),
                    float(lon),
                    float(speed) if speed not in (None, "") else None,
                    float(heading) if heading not in (None, "") else None,
                    # Parse timestamp values safely; if invalid, store NULL
                    _safe_parse_ts(last_seen),
                )
            except Exception as e:
                print(f"Failed to upsert vehicle {device_id}: {e}")
    else:
        # Fall back to original schema with vehicle_id, latitude, longitude
        for r in rows:
            vehicle_id = r.get('vehicle_id') or r.get('device_id')
            route_id = r.get('route_id')
            lat = r.get('latitude') or r.get('last_lat')
            lon = r.get('longitude') or r.get('last_lon')
            speed = r.get('speed') or r.get('last_speed')
            heading = r.get('bearing') or r.get('last_heading')
            last_updated = r.get('last_updated') or r.get('updated_at') or r.get('last_seen')

            if not vehicle_id or not lat or not lon:
                continue
            # Ensure route exists to avoid FK errors; if missing, set to NULL
            if route_id:
                route_exists = await conn.fetchval("SELECT 1 FROM routes WHERE route_id=$1", route_id)
                if not route_exists:
                    route_id = None

            try:
                await conn.execute(
                    """
                    INSERT INTO vehicles (vehicle_id, route_id, latitude, longitude, bearing, speed, last_updated)
                    VALUES ($1, $2, $3::double precision, $4::double precision, $5::double precision, $6::double precision, $7::timestamptz)
                    ON CONFLICT (vehicle_id) DO UPDATE SET
                        route_id = EXCLUDED.route_id,
                        latitude = EXCLUDED.latitude,
                        longitude = EXCLUDED.longitude,
                        bearing = EXCLUDED.bearing,
                        speed = EXCLUDED.speed,
                        last_updated = EXCLUDED.last_updated
                    """,
                    str(vehicle_id),
                    route_id,
                    float(lat),
                    float(lon),
                    float(heading) if heading not in (None, "") else None,
                    float(speed) if speed not in (None, "") else None,
                    _safe_parse_ts(last_updated),
                )
            except Exception as e:
                print(f"Failed to upsert vehicle {vehicle_id}: {e}")


async def main() -> None:
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # Paths inside container (data mounted read-only at /app/data)
        stops_csv = os.path.join(DATA_DIR, 'BusStops.csv')
        routes_csv = os.path.join(DATA_DIR, 'Routes.csv')
        vehicles_csv = os.path.join(DATA_DIR, 'Vehicles.csv')

        if os.path.exists(stops_csv):
            await import_bus_stops(conn, stops_csv)
        else:
            print("BusStops.csv not found; skipping.")

        if os.path.exists(routes_csv):
            await import_routes(conn, routes_csv)
        else:
            print("Routes.csv not found; skipping.")

        if os.path.exists(vehicles_csv):
            await import_vehicles(conn, vehicles_csv)
        else:
            print("Vehicles.csv not found; skipping.")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
