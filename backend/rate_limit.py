"""Rate limiter bersama untuk seluruh router."""

from slowapi import Limiter
from slowapi.util import get_remote_address

from settings import DEFAULT_RATE_LIMIT

default_limits = (
    [DEFAULT_RATE_LIMIT]
    if DEFAULT_RATE_LIMIT and DEFAULT_RATE_LIMIT.lower() not in ("none", "false", "0")
    else []
)

limiter = Limiter(key_func=get_remote_address, default_limits=default_limits)
