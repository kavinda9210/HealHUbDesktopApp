"""Payment routes.

The payment endpoints are currently implemented in `appointment.py`.
This module re-exports the `payment_bp` blueprint so the app factory can
import it from `app.routes.payment`.
"""

from .appointment import payment_bp

__all__ = ["payment_bp"]

