-- DROP FUNCTION public.insert_new_apart_history();

CREATE OR REPLACE FUNCTION public.insert_buildings_history()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE 
BEGIN
	NEW."version" := COALESCE(NEW."version", 0) + 1;

    INSERT INTO new_aparts_history (
        building_id, "version", created_at,
        updated_at, address, code,
        district, latitude, longitude,
        status_code, finishing_code, metro,
        metro_car, metro_walk, floors,
        flats, vvod, anons_texts,
        family_hypotec, county, notes
    )
    VALUES (
    NEW.building_id, NEW."version", NEW.created_at,
    NEW.updated_at, NEW.address, NEW.code,
    NEW.district, NEW.latitude, NEW.longitude,
    NEW.status_code, NEW.finishing_code, NEW.metro,
    NEW.metro_car, NEW.metro_walk, NEW.floors,
    NEW.flats, NEW.vvod, NEW.anons_texts,
    NEW.family_hypotec, NEW.county, NEW.notes
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




