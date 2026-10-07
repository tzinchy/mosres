from src.service import MosResService
from src.torgi import TorgiService


def get_mosres_service() -> MosResService:
    return MosResService()


def get_torgi_service() -> TorgiService:
    return TorgiService()
