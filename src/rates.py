"""Central Bank key rate — fetched from cbr.ru, cached in memory."""

import datetime
import re
import ssl

import aiohttp
import certifi
from loguru import logger

_SSL = ssl.create_default_context(cafile=certifi.where())

_SOAP_URL = "https://www.cbr.ru/DailyInfoWebServ/DailyInfo.asmx"
_ENVELOPE = """<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <KeyRate xmlns="http://web.cbr.ru/">
      <fromDate>{frm}</fromDate>
      <ToDate>{to}</ToDate>
    </KeyRate>
  </soap:Body>
</soap:Envelope>"""

_CACHE: dict = {}  # {"rate": float, "date": date, "fetched": datetime}
_TTL = datetime.timedelta(hours=6)
_FALLBACK = 18.0  # used only if cbr.ru is unreachable and nothing cached yet


async def _fetch() -> tuple[float, datetime.date]:
    today = datetime.date.today()
    body = _ENVELOPE.format(frm=(today - datetime.timedelta(days=90)), to=today)
    headers = {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "http://web.cbr.ru/KeyRate",
    }
    async with aiohttp.ClientSession() as s:
        async with s.post(
            _SOAP_URL,
            data=body,
            headers=headers,
            ssl=_SSL,
            timeout=aiohttp.ClientTimeout(total=15),
        ) as r:
            xml = await r.text()
    pairs = re.findall(r"<DT>(\d{4}-\d{2}-\d{2})[^<]*</DT>\s*<Rate>([\d.]+)</Rate>", xml)
    if not pairs:
        raise ValueError("no <KR> rows in cbr.ru response")
    d, rate = max(pairs, key=lambda p: p[0])
    return float(rate), datetime.date.fromisoformat(d)


async def get_key_rate() -> dict:
    now = datetime.datetime.now()
    cached = _CACHE.get("rate")
    if cached is not None and now - _CACHE["fetched"] < _TTL:
        return {"rate": _CACHE["rate"], "date": _CACHE["date"].isoformat()}
    try:
        rate, date = await _fetch()
        _CACHE.update(rate=rate, date=date, fetched=now)
    except Exception:
        logger.exception("key rate fetch failed")
        if cached is None:
            return {"rate": _FALLBACK, "date": None}
    return {"rate": _CACHE["rate"], "date": _CACHE["date"].isoformat()}
