import hashlib


def hash_password(password: str) -> str:
    """Hash password using SHA-256 (kept consistent with existing auth)."""
    return hashlib.sha256(password.encode()).hexdigest()
