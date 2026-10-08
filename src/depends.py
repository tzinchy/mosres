from src.service import MosResService
from src.torgi import TorgiService
from src.torgi_objects import TorgiObjectsService


def get_mosres_service() -> MosResService:
    return MosResService()


def get_torgi_service() -> TorgiService:
    return TorgiService()


def get_torgi_objects_service() -> TorgiObjectsService:
    return TorgiObjectsService()
