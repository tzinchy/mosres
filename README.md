# mosres
Simple project what get data from 

москварталы.api: 

base_url = 'https://xn--80aae5aibotfo5h.xn--p1ai/pokupka-nedvizhimosti-dlya-vseh/ajax.php'

Query params accepted: 
    type[] - список, принимающий значения 
        - "R": "Квартиры"
        - "NR": "Коммерческие помещения"
        - "P": "Паркинг"
    example: 
        type[] = ["R", "NR"]

    'open_sale': '1', #hz
    'map': 'forall', #hz
    pagesize: 1_000_000, #кол-во записей

    "finishing" : {
        "FULL" : "С отделкой",
        "NO" : "Без отделки",
        "STD": "Отделка по стандарту реновации"
    }

    """
    "metro" : name, color
    """