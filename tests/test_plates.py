import re

import pytest

from src.plates import (
    LETTERS,
    PRESETS,
    mask_to_regex,
    normalize_plate,
    parse_plate,
    validate_mask,
)


def test_normalize_fixes_homoglyphs_case_and_spaces():
    # латиница целиком: в «A001AA77» ни одной кириллической буквы
    assert normalize_plate("a001aa77") == "А001АА77"
    assert normalize_plate(" а 001 АА-77 ") == "А001АА77"
    assert set("ABEKMHOPCTYX").isdisjoint(normalize_plate("ABEKMHOPCTYX"))
    assert normalize_plate("ABEKMHOPCTYX") == LETTERS


def test_normalize_keeps_garbage_but_drops_empty():
    assert normalize_plate("отсутствует") == "ОТСУТСТВУЕТ"
    assert normalize_plate("б/н") == "БН"
    assert normalize_plate("---") is None
    assert normalize_plate("") is None
    assert normalize_plate(None) is None


@pytest.mark.parametrize(
    "raw, norm, region",
    [
        ("А001АА77", "А001АА77", "77"),  # легковой
        ("а 001 aa 177", "А001АА177", "177"),  # он же с трёхзначным регионом
        ("АА12377", "АА12377", "77"),  # такси
        ("АА123477", "АА123477", "77"),  # прицеп
        ("1234АА77", "1234АА77", "77"),  # мото
    ],
)
def test_parse_all_four_formats(raw, norm, region):
    parts = parse_plate(raw)
    assert parts == (norm, region, True)


@pytest.mark.parametrize("raw", ["отсутствует", "АА1234567", "А001ЖЖ77", "А001АА7"])
def test_parse_keeps_norm_for_unparsable(raw):
    parts = parse_plate(raw)
    assert parts.plate_norm == normalize_plate(raw)
    assert parts.plate_region is None
    assert parts.plate_valid is False


def test_parse_of_nothing_is_all_empty():
    assert parse_plate(None) == (None, None, False)


def test_mask_compiles_every_symbol_of_the_language():
    assert mask_to_regex("?#==??*") == (
        rf"^[{LETTERS}](\d)\1\1[{LETTERS}]{{2}}.*$"
    )
    assert mask_to_regex("а001аа77") == "^А001АА77$"  # литералы, латиница → кириллица
    assert mask_to_regex("*77") == "^.*77$"


@pytest.mark.parametrize(
    "mask, hit, miss",
    [
        ("?###??*", "А001АА77", "АА12377"),  # формат легкового
        ("?#==??*", "А777АА77", "А778АА77"),  # три одинаковые цифры
        ("?777??*", "А777ВС177", "А778ВС177"),  # номер с 777
        ("*77", "А001АА77", "А001АА99"),  # регион 77 (суффикс, поэтому 177 тоже попадёт)
        ("?###МР*", "А001МР77", "А001АА77"),  # серия **МР
        ("А001АА77", "А001АА77", "А001АА78"),  # точный номер
    ],
)
def test_compiled_mask_matches_reference_plates(mask, hit, miss):
    regex = mask_to_regex(mask)
    assert re.fullmatch(regex, hit)
    assert not re.fullmatch(regex, miss)


@pytest.mark.parametrize("mask", ["=??", "?##Ж", "????????????#", ""])
def test_validate_rejects_broken_masks(mask):
    with pytest.raises(ValueError):
        validate_mask(mask)


@pytest.mark.parametrize(
    "label, plate",
    [
        ("Три одинаковые цифры", "А777АА77"),
        ("Зеркальные цифры", "А121ВС177"),
        ("Малые цифры 001–009", "А001ВС77"),
        ("Блатные серии", "Е001КХ77"),
        ("Одинаковые буквы серии", "В001ВВ99"),
    ],
)
def test_every_preset_compiles_and_catches_its_plate(label, plate):
    regex = re.compile(PRESETS[label])
    assert regex.fullmatch(plate)
    assert not regex.fullmatch("Х123ОР190")
