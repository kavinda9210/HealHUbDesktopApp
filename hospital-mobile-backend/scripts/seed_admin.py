"""Seed or update a verified admin user in the database.

This script is idempotent:
- If the user exists (by email), it updates role/password/is_verified/is_active.
- If not, it inserts a new user row.

It uses Supabase service-role key when configured (bypasses RLS).

Usage:
  python scripts/seed_admin.py

Optional environment overrides:
  ADMIN_EMAIL
  ADMIN_PASSWORD
  FLASK_ENV (default: default)
"""

from __future__ import annotations

import os
import sys

# Ensure the backend root (the folder that contains the `app/` package) is on sys.path.
_BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

from app import create_app
from app.utils.security import hash_password
from app.utils.supabase_client import SupabaseClient
from app.utils.time_utils import sl_now_iso


def main() -> int:
    admin_email = (os.environ.get("ADMIN_EMAIL") or "admin@gmail.com").strip().lower()
    admin_password = os.environ.get("ADMIN_PASSWORD") or "Admin@9210"
    config_name = os.environ.get("FLASK_ENV", "default")

    app = create_app(config_name)

    with app.app_context():
        # 1) Look up user by email (admin query to bypass RLS)
        lookup = SupabaseClient.execute_admin_query(
            "users",
            "select",
            filter_email=admin_email,
            limit=1,
        )
        if not lookup.get("success"):
            print(f"ERROR: Failed to query users table: {lookup.get('error')}", file=sys.stderr)
            return 2

        rows = lookup.get("data") or []
        password_hash = hash_password(admin_password)

        if rows:
            user = rows[0]
            user_id = user.get("user_id")
            if not user_id:
                print("ERROR: Existing user row is missing user_id.", file=sys.stderr)
                return 3

            upd = SupabaseClient.execute_admin_query(
                "users",
                "update",
                filter_user_id=user_id,
                role="admin",
                password_hash=password_hash,
                is_verified=True,
                is_active=True,
            )
            if not upd.get("success"):
                print(f"ERROR: Failed to update admin user: {upd.get('error')}", file=sys.stderr)
                return 4

            print(f"OK: Updated admin user {admin_email} (user_id={user_id}).")
            return 0

        # 2) Insert new admin
        ins = SupabaseClient.execute_admin_query(
            "users",
            "insert",
            email=admin_email,
            password_hash=password_hash,
            role="admin",
            is_verified=True,
            is_active=True,
            created_at=sl_now_iso(),
        )
        if not ins.get("success") or not ins.get("data"):
            print(f"ERROR: Failed to insert admin user: {ins.get('error')}", file=sys.stderr)
            return 5

        created = ins["data"][0]
        print(f"OK: Created admin user {admin_email} (user_id={created.get('user_id')}).")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
