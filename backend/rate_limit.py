"""Rate limiter bersama untuk seluruh router."""

import os

from slowapi import Limiter
from slowapi.util import get_remote_address

rate_limit_default = os.getenv("DEFAULT_RATE_LIMIT", "300/minute")
default_limits = (
    [rate_limit_default]
    if rate_limit_default and rate_limit_default.lower() not in ("none", "false", "0")
    else []
)

limiter = Limiter(key_func=get_remote_address, default_limits=default_limits)
