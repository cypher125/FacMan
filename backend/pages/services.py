import requests
from django.conf import settings


def get_user_pages(user_access_token):
    url = f"{settings.FACEBOOK_GRAPH_URL}/me/accounts"
    params = {
        "fields": "id,name,access_token,category,picture,fan_count,link,about",
        "access_token": user_access_token,
    }
    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    return response.json().get("data", [])


def get_page_details(page_id, page_access_token):
    url = f"{settings.FACEBOOK_GRAPH_URL}/{page_id}"
    params = {
        "fields": "id,name,about,category,fan_count,link,picture",
        "access_token": page_access_token,
    }
    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    return response.json()
