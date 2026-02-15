from urllib.parse import urlencode

import requests
from django.conf import settings


def get_authorization_url():
    params = {
        "client_id": settings.FACEBOOK_APP_ID,
        "redirect_uri": settings.FACEBOOK_REDIRECT_URI,
        "scope": settings.FACEBOOK_SCOPES,
        "response_type": "code",
    }
    return f"{settings.FACEBOOK_OAUTH_URL}?{urlencode(params)}"


def exchange_code_for_token(code):
    url = f"{settings.FACEBOOK_GRAPH_URL}/oauth/access_token"
    params = {
        "client_id": settings.FACEBOOK_APP_ID,
        "client_secret": settings.FACEBOOK_APP_SECRET,
        "redirect_uri": settings.FACEBOOK_REDIRECT_URI,
        "code": code,
    }
    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()
    return data["access_token"], data.get("expires_in")


def get_long_lived_token(short_token):
    url = f"{settings.FACEBOOK_GRAPH_URL}/oauth/access_token"
    params = {
        "grant_type": "fb_exchange_token",
        "client_id": settings.FACEBOOK_APP_ID,
        "client_secret": settings.FACEBOOK_APP_SECRET,
        "fb_exchange_token": short_token,
    }
    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    data = response.json()
    return data["access_token"], data.get("expires_in")


def get_user_profile(access_token):
    url = f"{settings.FACEBOOK_GRAPH_URL}/me"
    params = {
        "fields": "id,name,email,picture",
        "access_token": access_token,
    }
    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    return response.json()
