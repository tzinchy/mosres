from alembic_utils.pg_function import PGFunction
from alembic_utils.pg_trigger import PGTrigger

insert_buildings_history_func = PGFunction(
    schema="public",
    signature="insert_buildings_history()",
    definition="""
        RETURNS trigger
        LANGUAGE plpgsql
        AS $function$
        DECLARE
        BEGIN
            NEW."version" := COALESCE(NEW."version", 0) + 1;

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
    """,
)

buildings_history_trigger = PGTrigger(
    schema="public",
    signature="buildings_history_trigger",
    on_entity="public.buildings",
    is_constraint=False,
    definition="""
        BEFORE INSERT OR UPDATE
        ON public.buildings
        FOR EACH ROW
        EXECUTE FUNCTION public.insert_buildings_history()
    """,
)


insert_new_apart_history_func =  PGFunction(
    schema="public",
    signature="insert_new_aparts_history()",
    definition="""
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
    """
)

new_apart_trigger = PGTrigger(
    schema='public',
    signature='new_aparts_history_trigger',
    on_entity='public.new_aparts',
    is_constraint=False,
    definition="""
        BEFORE INSERT OR UPDATE
        ON new_aparts
        FOR EACH ROW  
        EXECUTE FUNCTION insert_new_aparts_history();
    """,
)



