import requests
from django.conf import settings

DEFAULT_METRICS = (
    "page_impressions,"
    "page_engaged_users,"
    "page_fans,"
    "page_fan_adds,"
    "page_fan_removes,"
    "page_views_total,"
    "page_posts_impressions,"
    "page_video_views"
)


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
    response.raise_for_status()
    return response.json().get("data", [])
