"""Российские номерные знаки: нормализация, разбор и компиляция масок.

Маски компилируются в regex, который одинаково понимают Postgres (`plate_norm ~
regex`) и Python `re`: только анкеры, классы символов, границы повторения и
backreference — без lookahead и прочих диалектных расширений.
"""

import itertools
import re
from typing import NamedTuple

# Буквы, допустимые в российском номере (кириллица, совпадающая по виду с латиницей)
LETTERS = "АВЕКМНОРСТУХ"

# Портал отдаёт номера то кириллицей, то латиницей — внешне буквы те же
HOMOGLYPHS = str.maketrans("ABEKMHOPCTYX", LETTERS)

MASK_MAX_LEN = 12

_LETTER = f"[{LETTERS}]"
# трёхзначные коды регионов начинаются на 1, 7 или 9; без этого «АА123477»
# неоднозначен: такси с регионом 477 или прицеп с регионом 77
_REGION = r"(?:\d{2}|[179]\d{2})"

_FORMATS = (
    re.compile(rf"{_LETTER}\d{{3}}{_LETTER}{{2}}({_REGION})"),  # легковой
    re.compile(rf"{_LETTER}{{2}}\d{{3}}({_REGION})"),  # такси / общественный
    re.compile(rf"{_LETTER}{{2}}\d{{4}}({_REGION})"),  # прицеп
    re.compile(rf"\d{{4}}{_LETTER}{{2}}({_REGION})"),  # мото
)

_MASK_ATOMS = {"?": _LETTER, "#": r"\d", "*": ".*"}
# свернуть в `{n}` можно только одноместные классы: литералы оставляем как есть
# для читаемости, `.*` — потому что повтор любого остатка бессмыслен
_COLLAPSIBLE = (_LETTER, r"\d")


class PlateParts(NamedTuple):
    plate_norm: str | None
    plate_region: str | None
    plate_valid: bool


def normalize_plate(raw: str | None) -> str | None:
    """«а 001 aa 77» → «А001АА77». Мусорная строка нормализуется как есть."""
    if not raw:
        return None
    norm = "".join(c for c in raw.upper().translate(HOMOGLYPHS) if c.isalnum())
    return norm or None


def parse_plate(raw: str | None) -> PlateParts:
    norm = normalize_plate(raw)
    if norm is None:
        return PlateParts(None, None, False)
    for fmt in _FORMATS:
        m = fmt.fullmatch(norm)
        if m:
            return PlateParts(norm, m.group(1), True)
    return PlateParts(norm, None, False)


def validate_mask(mask: str) -> None:
    """Кидает ValueError с текстом, который можно показать пользователю."""
    _prepare_mask(mask)


def mask_to_regex(mask: str) -> str:
    """`?#==??*` → `^[АВЕКМНОРСТУХ](\\d)\\1\\1[АВЕКМНОРСТУХ]{2}.*$`."""
    atoms: list[str] = []
    groups = 0
    back_ref: str | None = None  # ссылка на предыдущий атом, если он уже в группе
    for char in _prepare_mask(mask):
        if char == "=":
            if back_ref is None:
                groups += 1
                back_ref = f"\\{groups}"
                atoms[-1] = f"({atoms[-1]})"
            atoms.append(back_ref)
            continue
        atoms.append(_MASK_ATOMS.get(char, char))
        back_ref = None
    return f"^{''.join(_collapse(atoms))}$"


PRESETS: dict[str, str] = {
    # ссылка на символ двумя позициями раньше и перечисление серий маской не
    # выражаются, поэтому такие правила живут готовыми regex
    "Три одинаковые цифры": rf"^{_LETTER}(\d)\1\1{_LETTER}{{2}}{_REGION}$",
    "Зеркальные цифры": rf"^{_LETTER}(\d)\d\1{_LETTER}{{2}}{_REGION}$",
    "Малые цифры 001–009": rf"^{_LETTER}00[1-9]{_LETTER}{{2}}{_REGION}$",
    "Блатные серии": rf"^(?:А\d{{3}}МР|Е\d{{3}}КХ|М\d{{3}}МР|А\d{{3}}ОО){_REGION}$",
    "Одинаковые буквы серии": rf"^({_LETTER})\d{{3}}\1\1{_REGION}$",
}


def _prepare_mask(mask: str) -> str:
    norm = (mask or "").strip().upper().translate(HOMOGLYPHS)
    if not norm:
        return _fail("маска пустая")
    if len(norm) > MASK_MAX_LEN:
        return _fail(f"маска длиннее {MASK_MAX_LEN} символов")
    bad = {c for c in norm if c not in _MASK_ATOMS and c != "=" and not _literal(c)}
    if bad:
        return _fail(f"недопустимые символы: {''.join(sorted(bad))}")
    if norm[0] == "=":
        return _fail("«=» повторяет предыдущий символ, поэтому не может быть первым")
    if "*=" in norm:
        return _fail("«=» нельзя ставить после «*»")
    return norm


def _literal(char: str) -> bool:
    return char.isdigit() or char in LETTERS


def _fail(reason: str):
    raise ValueError(f"Неверная маска: {reason}")


def _collapse(atoms: list[str]):
    for atom, run in itertools.groupby(atoms):
        count = len(list(run))
        if count > 1 and atom in _COLLAPSIBLE:
            yield f"{atom}{{{count}}}"
        else:
            yield atom * count
