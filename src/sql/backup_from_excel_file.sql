SET session_replication_role = replica;

UPDATE new_aparts na
SET
    version              = h.version,
    created_at           = h.created_at,
    updated_at           = h.updated_at,
    address              = h.address,
    building             = h.building,
    building_id          = h.building_id,
    building_code        = h.building_code,
    number               = h.number,
    rooms                = h.rooms,
    floor                = h.floor,
    block                = h.block,
    area                 = h.area,
    price                = h.price,
    price_m              = h.price_m,
    type                 = h.type,
    term_of_application  = h.term_of_application,
    open_sale            = h.open_sale,
    reserve              = h.reserve,
    y2_sell              = h.y2_sell,
    for_sell             = h.for_sell,
    num_on_floor         = h.num_on_floor,
    property             = h.property,
    advants              = h.advants,
    article              = h.article,
    price_with_discount  = h.price_with_discount,
    percentage_discount  = h.percentage_discount,
    auction              = h.auction,
    block_name           = h.block_name,
    notes                = h.notes
FROM (
    -- берём только строки с максимальной версией для каждого apart
    SELECT DISTINCT ON (new_apart_id) *
    FROM new_aparts_history
    ORDER BY new_apart_id, version DESC
) h
WHERE na.new_apart_id = h.new_apart_id;

SET session_replication_role = default;