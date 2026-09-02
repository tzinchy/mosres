# Graph Report - src  (2026-09-02)

## Corpus Check
- Corpus is ~2,942 words - fits in a single context window. You may not need a graph.

## Summary
- 83 nodes · 146 edges · 8 communities (7 shown, 1 thin omitted)
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Data Models & ORM
- Repository & Client Layer
- Service Layer
- Pydantic Schemas
- SQL Query Builder
- FastAPI Endpoints
- Config

## God Nodes (most connected - your core abstractions)
1. `MosResService` - 16 edges
2. `Base` - 11 edges
3. `upsert_with_except_from_temp_table()` - 8 edges
4. `insert_into_table()` - 6 edges
5. `NewApart` - 5 edges
6. `response_format()` - 5 edges
7. `create_insert_query_for_table()` - 5 edges
8. `MosResService` - 4 edges
9. `BuildingMixing` - 4 edges
10. `NewApartMixing` - 4 edges

## Surprising Connections (you probably didn't know these)
- `get_buildings_table()` --uses--> `Building`  [INFERRED]
  repository.py → models.py
- `get_buildings_apartments()` --uses--> `NewApart`  [INFERRED]
  repository.py → models.py
- `get_new_aparts_table()` --uses--> `NewApart`  [INFERRED]
  repository.py → models.py
- `get_new_aparts_history()` --uses--> `NewApartHistory`  [INFERRED]
  repository.py → models.py
- `get_buildings_history()` --uses--> `BuildingHistory`  [INFERRED]
  repository.py → models.py

## Import Cycles
- None detected.

## Communities (8 total, 1 thin omitted)

### Community 0 - "Data Models & ORM"
Cohesion: 0.23
Nodes (13): Base, DeclarativeBase, BuildingMixing, NewApartMixing, Building, BuildingHistory, BuildingTemp, District (+5 more)

### Community 1 - "Repository & Client Layer"
Cohesion: 0.21
Nodes (10): AsyncSession, MosResService, MosResClient, get_buildings_apartments(), get_buildings_history(), get_buildings_table(), get_data_for_excel_file(), get_new_aparts_history() (+2 more)

### Community 2 - "Service Layer"
Cohesion: 0.19
Nodes (3): get_mosres_service(), MosResService, MosResService

### Community 3 - "Pydantic Schemas"
Cohesion: 0.26
Nodes (11): BaseModel, field_validator, BuildingSchema, DistrictSchemaBase, DistrictSchemaForInsert, DistrictSchemaForTypeAdapter, MetroSchemaBase, MetroSchemaForInsert (+3 more)

### Community 4 - "SQL Query Builder"
Cohesion: 0.29
Nodes (11): Any, upsert_with_except_from_temp_table(), create_insert_query_for_table(), create_insert_query_for_table_with_except_from_temp(), create_placeholders(), create_placeholders_with_excluded(), create_truncate_query(), Необходимо передавать только название файла Все файлы в папке по умолчанию .sql (+3 more)

### Community 5 - "FastAPI Endpoints"
Cohesion: 0.50
Nodes (8): get_buildings(), get_buildings_versions(), get_excel_file_for_current_date(), get_new_apart_versions(), get_new_apats(), MosResService, update_data(), get

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MosResService` connect `Service Layer` to `Pydantic Schemas`?**
  _High betweenness centrality (0.360) - this node is a cross-community bridge._
- **Why does `upsert_with_except_from_temp_table()` connect `SQL Query Builder` to `Repository & Client Layer`, `Service Layer`?**
  _High betweenness centrality (0.190) - this node is a cross-community bridge._
- **Why does `insert_into_table()` connect `Repository & Client Layer` to `Service Layer`, `SQL Query Builder`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `MosResService` (e.g. with `get_mosres_service()` and `BuildingSchema`) actually correct?**
  _`MosResService` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `upsert_with_except_from_temp_table()` (e.g. with `.update_all_data()` and `create_insert_query_for_table()`) actually correct?**
  _`upsert_with_except_from_temp_table()` has 5 INFERRED edges - model-reasoned connections that need verification._