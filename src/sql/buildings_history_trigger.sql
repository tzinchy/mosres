-- Reference only. Runtime applies this via alembic-utils (src/pg_definitions.py).

CREATE OR REPLACE FUNCTION public.insert_buildings_history()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF ROW(
            OLD.address, OLD.code, OLD.district, OLD.latitude, OLD.longitude,
            OLD.status_code, OLD.finishing_code, OLD.metro, OLD.metro_car, OLD.metro_walk,
            OLD.floors, OLD.flats, OLD.vvod, OLD.anons_texts, OLD.family_hypotec, OLD.county
        ) IS NOT DISTINCT FROM ROW(
            NEW.address, NEW.code, NEW.district, NEW.latitude, NEW.longitude,
            NEW.status_code, NEW.finishing_code, NEW.metro, NEW.metro_car, NEW.metro_walk,
            NEW.floors, NEW.flats, NEW.vvod, NEW.anons_texts, NEW.family_hypotec, NEW.county
        ) THEN
            RETURN NEW;
        END IF;
    END IF;

    NEW."version" := COALESCE(OLD."version", 0) + 1;

    INSERT INTO buildings_history (
        building_id,    "version",      created_at,
        updated_at,     address,        code,
        district,       latitude,       longitude,
        status_code,    finishing_code, metro,
        metro_car,      metro_walk,     floors,
        flats,          vvod,           anons_texts,
        family_hypotec, county,         notes
    ) VALUES (
        NEW.building_id,    NEW."version",      NEW.created_at,
        NEW.updated_at,     NEW.address,        NEW.code,
        NEW.district,       NEW.latitude,       NEW.longitude,
        NEW.status_code,    NEW.finishing_code, NEW.metro,
        NEW.metro_car,      NEW.metro_walk,     NEW.floors,
        NEW.flats,          NEW.vvod,           NEW.anons_texts,
        NEW.family_hypotec, NEW.county,         NEW.notes
    );
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE TRIGGER buildings_history_trigger
BEFORE INSERT OR UPDATE
ON buildings
FOR EACH ROW
EXECUTE FUNCTION insert_buildings_history();
