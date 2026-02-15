import requests
from django.conf import settings


def get_post_comments(post_id, page_access_token):
    url = f"{settings.FACEBOOK_GRAPH_URL}/{post_id}/comments"
    params = {
        "fields": "id,message,from,created_time,like_count",
        "access_token": page_access_token,
    }
    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    return response.json().get("data", [])


def reply_to_comment(comment_id, page_access_token, message):
    url = f"{settings.FACEBOOK_GRAPH_URL}/{comment_id}/comments"
    data = {
        "message": message,
        "access_token": page_access_token,
    }
    response = requests.post(url, data=data, timeout=30)
    response.raise_for_status()
    return response.json()


def like_object(object_id, page_access_token):
    url = f"{settings.FACEBOOK_GRAPH_URL}/{object_id}/likes"
    data = {"access_token": page_access_token}
    response = requests.post(url, data=data, timeout=30)
    response.raise_for_status()
    return response.json()


def unlike_object(object_id, page_access_token):
    url = f"{settings.FACEBOOK_GRAPH_URL}/{object_id}/likes"
    params = {"access_token": page_access_token}
    response = requests.delete(url, params=params, timeout=30)
    response.raise_for_status()
    return response.json()


def get_page_conversations(page_id, page_access_token):
    url = f"{settings.FACEBOOK_GRAPH_URL}/{page_id}/conversations"
    params = {
        "fields": "participants,updated_time,messages{message,from,created_time}",
        "access_token": page_access_token,
    }
    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    return response.json().get("data", [])


def send_page_message(page_id, page_access_token, recipient_id, text):
    url = f"{settings.FACEBOOK_GRAPH_URL}/{page_id}/messages"
    params = {"access_token": page_access_token}
    payload = {
        "recipient": {"id": recipient_id},
        "message": {"text": text},
    }
    response = requests.post(url, params=params, json=payload, timeout=30)
    response.raise_for_status()
    return response.json()
