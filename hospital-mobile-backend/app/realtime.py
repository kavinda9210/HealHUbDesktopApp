from __future__ import annotations

import logging
from typing import Iterable, Optional

from flask import request
from flask_socketio import SocketIO, join_room
from flask_jwt_extended import decode_token

from app.utils.supabase_client import SupabaseClient, get_user_by_id

logger = logging.getLogger(__name__)


# NOTE: We intentionally avoid eventlet/gevent to keep setup simple.
# With `simple-websocket` installed, Flask-SocketIO can serve WebSockets using
# Werkzeug in development.
socketio = SocketIO(async_mode="threading")


def init_socketio(app) -> None:
    cors_origins = app.config.get("CORS_ORIGINS") or "*"
    socketio.init_app(
        app,
        cors_allowed_origins=cors_origins,
        logger=False,
        engineio_logger=False,
    )


def _safe_topics(topics: Optional[Iterable[str]]) -> list[str]:
    if not topics:
        return []
    out: list[str] = []
    for t in topics:
        if not t:
            continue
        out.append(str(t))
    return out


def emit_user_invalidate(user_id: str, topics: Optional[Iterable[str]] = None) -> None:
    """Tell a specific user to refresh some data."""
    if not user_id:
        return
    socketio.emit(
        "invalidate",
        {"topics": _safe_topics(topics)},
        room=f"user:{user_id}",
    )


def emit_patient_invalidate(patient_id: int, topics: Optional[Iterable[str]] = None) -> None:
    """Tell a patient (by patient_id) to refresh some data."""
    if not patient_id:
        return
    socketio.emit(
        "invalidate",
        {"topics": _safe_topics(topics)},
        room=f"patient:{int(patient_id)}",
    )


def resolve_patient_user_id(patient_id: int) -> Optional[str]:
    try:
        res = SupabaseClient.execute_query("patients", "select", filter_patient_id=int(patient_id))
        if res.get("success") and res.get("data"):
            return res["data"][0].get("user_id")
    except Exception:
        return None
    return None


def resolve_patient_id_for_user(user_id: str) -> Optional[int]:
    try:
        res = SupabaseClient.execute_query("patients", "select", filter_user_id=user_id)
        if res.get("success") and res.get("data"):
            pid = res["data"][0].get("patient_id")
            return int(pid) if pid is not None else None
    except Exception:
        return None
    return None


def resolve_ambulance_id_for_user(user_id: str) -> Optional[int]:
    try:
        res = SupabaseClient.execute_query("ambulances", "select", filter_user_id=user_id)
        if res.get("success") and res.get("data"):
            aid = res["data"][0].get("ambulance_id")
            return int(aid) if aid is not None else None
    except Exception:
        return None
    return None


@socketio.on("connect")
def on_connect(auth):
    """Authenticate socket using JWT access token."""
    token = None
    if isinstance(auth, dict):
        token = auth.get("token")

    if not token:
        token = request.args.get("token")

    if not token:
        logger.info("Socket connect rejected: missing token")
        return False

    try:
        decoded = decode_token(token)
        user_id = decoded.get("sub")
        if not user_id:
            logger.info("Socket connect rejected: invalid token payload")
            return False

        join_room(f"user:{user_id}")

        user = get_user_by_id(str(user_id)) or {}
        role = user.get("role")

        if role == "patient":
            patient_id = resolve_patient_id_for_user(str(user_id))
            if patient_id:
                join_room(f"patient:{patient_id}")

        if role == "ambulance_staff":
            ambulance_id = resolve_ambulance_id_for_user(str(user_id))
            if ambulance_id:
                join_room(f"ambulance:{ambulance_id}")

        logger.info(f"Socket connected: user={user_id} role={role}")
        return True

    except Exception as e:
        logger.info(f"Socket connect rejected: {e}")
        return False
