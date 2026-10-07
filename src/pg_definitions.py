from alembic_utils.pg_function import PGFunction
from alembic_utils.pg_trigger import PGTrigger

# The history triggers are the single source of truth for versioning. They must
# survive `INSERT ... ON CONFLICT DO UPDATE`, which fires the BEFORE INSERT trigger
# for every row *before* the conflict is resolved — so a plain "on INSERT, write
# history v1" writes a spurious row for rows that then become UPDATEs. Guard: on
# INSERT, if the key already exists, do nothing and let the UPDATE pass handle it;
# on UPDATE, skip entirely when no meaningful column changed.

insert_buildings_history_func = PGFunction(
    schema="public",
    signature="insert_buildings_history()",
    definition="""
        RETURNS trigger
        LANGUAGE plpgsql
        AS $function$
        BEGIN
            IF TG_OP = 'INSERT'
               AND EXISTS (SELECT 1 FROM buildings WHERE building_id = NEW.building_id) THEN
                RETURN NEW;
            END IF;

            IF TG_OP = 'UPDATE' THEN
                IF ROW(
                    OLD.address, OLD.code, OLD.district, OLD.latitude, OLD.longitude,
                    OLD.status_code, OLD.finishing_code, OLD.metro, OLD.metro_car, OLD.metro_walk,
                    OLD.floors, OLD.flats, OLD.vvod, OLD.anons_texts, OLD.family_hypotec, OLD.county,
                    OLD.img, OLD.gallery
                ) IS NOT DISTINCT FROM ROW(
                    NEW.address, NEW.code, NEW.district, NEW.latitude, NEW.longitude,
                    NEW.status_code, NEW.finishing_code, NEW.metro, NEW.metro_car, NEW.metro_walk,
                    NEW.floors, NEW.flats, NEW.vvod, NEW.anons_texts, NEW.family_hypotec, NEW.county,
                    NEW.img, NEW.gallery
                ) THEN
                    RETURN NULL;
                END IF;
                NEW.updated_at := now();
            END IF;

            NEW."version" := COALESCE(OLD."version", 0) + 1;

            INSERT INTO buildings_history (
                building_id,    "version",      created_at,
                updated_at,     address,        code,
                district,       latitude,       longitude,
                status_code,    finishing_code, metro,
                metro_car,      metro_walk,     floors,
                flats,          vvod,           anons_texts,
                family_hypotec, county,         notes,
                img,            gallery
            ) VALUES (
                NEW.building_id,    NEW."version",      NEW.created_at,
                NEW.updated_at,     NEW.address,        NEW.code,
                NEW.district,       NEW.latitude,       NEW.longitude,
                NEW.status_code,    NEW.finishing_code, NEW.metro,
                NEW.metro_car,      NEW.metro_walk,     NEW.floors,
                NEW.flats,          NEW.vvod,           NEW.anons_texts,
                NEW.family_hypotec, NEW.county,         NEW.notes,
                NEW.img,            NEW.gallery
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


insert_new_apart_history_func = PGFunction(
    schema="public",
    signature="insert_new_aparts_history()",
    definition="""
        RETURNS trigger
        LANGUAGE plpgsql
        AS $function$
        BEGIN
            IF TG_OP = 'INSERT'
               AND EXISTS (SELECT 1 FROM new_aparts WHERE new_apart_id = NEW.new_apart_id) THEN
                RETURN NEW;
            END IF;

            IF TG_OP = 'UPDATE' THEN
                -- plan / plan_s excluded on purpose. The source re-hashes the
                -- floor-plan image URL on nearly every refresh without the plan
                -- itself changing, which otherwise bumps the version for ~half
                -- the dataset each run. tour_3d has a stable URL, so it stays.
                IF ROW(
                    OLD.address, OLD.building, OLD.building_id, OLD.building_code, OLD."number",
                    OLD.rooms, OLD."floor", OLD.block, OLD.area, OLD.price, OLD.price_m, OLD."type",
                    OLD.term_of_application, OLD.open_sale, OLD.reserve, OLD.y2_sell, OLD.for_sell,
                    OLD.num_on_floor, OLD.property, OLD.advants, OLD.article,
                    OLD.price_with_discount, OLD.percentage_discount, OLD.auction, OLD.block_name,
                    OLD.tour_3d
                ) IS NOT DISTINCT FROM ROW(
                    NEW.address, NEW.building, NEW.building_id, NEW.building_code, NEW."number",
                    NEW.rooms, NEW."floor", NEW.block, NEW.area, NEW.price, NEW.price_m, NEW."type",
                    NEW.term_of_application, NEW.open_sale, NEW.reserve, NEW.y2_sell, NEW.for_sell,
                    NEW.num_on_floor, NEW.property, NEW.advants, NEW.article,
                    NEW.price_with_discount, NEW.percentage_discount, NEW.auction, NEW.block_name,
                    NEW.tour_3d
                ) THEN
                    RETURN NULL;
                END IF;
                NEW.updated_at := now();
            END IF;

            NEW."version" := COALESCE(OLD."version", 0) + 1;

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
                plan, plan_s, tour_3d,
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
                NEW.plan, NEW.plan_s, NEW.tour_3d,
                NEW.created_at, NEW.updated_at,
                NEW."version"
            );

            RETURN NEW;
        END;
        $function$
    """,
)

new_apart_trigger = PGTrigger(
    schema="public",
    signature="new_aparts_history_trigger",
    on_entity="public.new_aparts",
    is_constraint=False,
    definition="""
        BEFORE INSERT OR UPDATE
        ON new_aparts
        FOR EACH ROW
        EXECUTE FUNCTION insert_new_aparts_history()
    """,
)


# Лоты torgi.mos.ru — та же схема версионирования, что у квартир и корпусов.
# portal_views / source_updated_at исключены из сравнения: портал крутит их на
# каждом обновлении, из-за чего версия бы росла на каждом прогоне без реальных
# изменений по лоту.
TORGI_COMPARED_COLUMNS = (
    "name", "url", "status_text", "transport_category", "brand", "model", "year",
    "plate", "vin", "pts", "color", "body", "eco_class", "power", "engine_volume",
    "drive", "transmission", "mileage", "start_price", "deposit", "auction_step",
    "final_price", "request_start_date", "request_end_date", "tender_date",
    "final_date", "platform_link", "torgi_gov_link", "video_link", "latitude",
    "longitude", "photos", "plate_norm", "plate_region", "plate_valid",
)

TORGI_HISTORY_COLUMNS = (
    "lot_id", "version", "created_at", "updated_at", "notes", "portal_views",
    "source_updated_at", *TORGI_COMPARED_COLUMNS,
)


def _row(prefix: str, columns) -> str:
    return ", ".join(f'{prefix}."{c}"' for c in columns)


def torgi_history_func(compared: tuple[str, ...]) -> PGFunction:
    """Функция-триггер истории под заданный список сравниваемых колонок.

    Параметризована, чтобы downgrade миграции мог вернуть предыдущую версию,
    не копируя plpgsql.
    """
    history = (
        "lot_id", "version", "created_at", "updated_at", "notes", "portal_views",
        "source_updated_at", *compared,
    )
    return PGFunction(
        schema="public",
        signature="insert_torgi_lots_history()",
        definition=f"""
            RETURNS trigger
            LANGUAGE plpgsql
            AS $function$
            BEGIN
                IF TG_OP = 'INSERT'
                   AND EXISTS (SELECT 1 FROM torgi_lots WHERE lot_id = NEW.lot_id) THEN
                    RETURN NEW;
                END IF;

                IF TG_OP = 'UPDATE' THEN
                    IF ROW({_row("OLD", compared)})
                       IS NOT DISTINCT FROM
                       ROW({_row("NEW", compared)}) THEN
                        RETURN NULL;
                    END IF;
                    NEW.updated_at := now();
                END IF;

                NEW."version" := COALESCE(OLD."version", 0) + 1;

                INSERT INTO torgi_lots_history (
                    {", ".join(f'"{c}"' for c in history)}
                ) VALUES (
                    {_row("NEW", history)}
                );

                RETURN NEW;
            END;
            $function$
        """,
    )


insert_torgi_lots_history_func = torgi_history_func(TORGI_COMPARED_COLUMNS)

torgi_lots_history_trigger = PGTrigger(
    schema="public",
    signature="torgi_lots_history_trigger",
    on_entity="public.torgi_lots",
    is_constraint=False,
    definition="""
        BEFORE INSERT OR UPDATE
        ON public.torgi_lots
        FOR EACH ROW
        EXECUTE FUNCTION public.insert_torgi_lots_history()
    """,
)
