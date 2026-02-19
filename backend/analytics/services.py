import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Metrics and the period they support.
# Each tuple: (metric_name, period)
# page_fans only supports "lifetime"; all others support day/week/days_28.
METRICS_CONFIG = [
    ("page_impressions", None),       # None = use caller's period
    ("page_engaged_users", None),
    ("page_views_total", None),
    ("page_fans", "lifetime"),
]

# Keep for backwards-compat import in views.py (no longer used directly).
DEFAULT_METRICS = "page_impressions,page_engaged_users,page_views_total"
LIFETIME_METRICS = "page_fans"


def get_page_insights(page_id, page_access_token, period="day",
                      since=None, until=None, metrics=None):
    url = f"{settings.FACEBOOK_GRAPH_URL}/{page_id}/insights"
    params = {
        "metric": metrics or DEFAULT_METRICS,
        "period": period,
        "access_token": page_access_token,
    }
    if since:
        params["since"] = since
    if until:
        params["until"] = until

    response = requests.get(url, params=params, timeout=30)
    if not response.ok:
        logger.error(
            "Facebook insights API error (page=%s, status=%s): %s",
            page_id, response.status_code, response.text,
        )
    response.raise_for_status()
    return response.json().get("data", [])


def get_page_insights_safe(page_id, page_access_token, period="day",
                           since=None, until=None):
    """
    Fetch all configured metrics one at a time.
    Skips any metric that Facebook rejects (deprecated, wrong period, etc.)
    so a single bad metric never blocks the whole sync.
    Returns a flat list of metric dicts.
    """
    results = []
    for metric_name, fixed_period in METRICS_CONFIG:
        effective_period = fixed_period if fixed_period else period
        try:
            data = get_page_insights(
                page_id, page_access_token,
                period=effective_period,
                since=since if fixed_period is None else None,
                until=until if fixed_period is None else None,
                metrics=metric_name,
            )
            results.extend(data)
        except Exception:
            logger.warning(
                "Skipping metric '%s' (period=%s) for page %s — request failed",
                metric_name, effective_period, page_id,
            )
    return results
