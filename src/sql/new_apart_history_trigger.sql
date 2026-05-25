-- DROP FUNCTION public.insert_new_apart_history();

CREATE OR REPLACE FUNCTION public.insert_new_apart_history()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE 
BEGIN
	NEW."version" := COALESCE(NEW."version", 0) + 1;

    INSERT INTO new_aparts_history (
        new_apart_id, address, building,
        building_id, building_code, "number",
        rooms, "floor", block, area,
        price, price_m, "type",
        term_of_application, open_sale, reserve,
        y2_sell, for_sell, num_on_floor,
        property, advants, article, 
        price_with_discount, percentage_discount, 
        auction, block_name,
        created_at, updated_at,
        "version"
    )
    VALUES (
        NEW.new_apart_id, NEW.address, NEW.building,
        NEW.building_id, NEW.building_code, NEW."number",
        NEW.rooms, NEW."floor", NEW.block, NEW.area,
        NEW.price, NEW.price_m, NEW."type",
        NEW.term_of_application, NEW.open_sale, NEW.reserve,
        NEW.y2_sell, NEW.for_sell, NEW.num_on_floor,
        NEW.property, NEW.advants, NEW.article, 
        NEW.price_with_discount, NEW.percentage_discount, 
        NEW.auction, NEW.block_name,
        NEW.created_at, NEW.updated_at,
		NEW."version");
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE TRIGGER new_apart_history_trigger 
BEFORE INSERT OR UPDATE
ON new_aparts
FOR EACH ROW  
EXECUTE FUNCTION insert_new_apart_history();




