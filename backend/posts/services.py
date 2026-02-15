import requests
from django.conf import settings


def create_text_post(page_id, page_access_token, message, link=None, published=True,
                     scheduled_publish_time=None):
    url = f"{settings.FACEBOOK_GRAPH_URL}/{page_id}/feed"
    data = {
        "message": message,
        "access_token": page_access_token,
    }
    if link:
        data["link"] = link
    if scheduled_publish_time:
        data["published"] = False
        data["scheduled_publish_time"] = int(scheduled_publish_time)
    else:
        data["published"] = published

    response = requests.post(url, data=data, timeout=30)
    response.raise_for_status()
    return response.json()


def create_photo_post(page_id, page_access_token, image_url, message="",
                      published=True, scheduled_publish_time=None):
    url = f"{settings.FACEBOOK_GRAPH_URL}/{page_id}/photos"
    data = {
        "url": image_url,
        "access_token": page_access_token,
    }
    if message:
        data["message"] = message
    if scheduled_publish_time:
        data["published"] = False
        data["scheduled_publish_time"] = int(scheduled_publish_time)
    else:
        data["published"] = published

    response = requests.post(url, data=data, timeout=30)
    response.raise_for_status()
    return response.json()


def create_video_post(page_id, page_access_token, video_url, description="",
                      title="", scheduled_publish_time=None):
    url = f"{settings.FACEBOOK_GRAPH_URL}/{page_id}/videos"
    data = {
        "file_url": video_url,
        "access_token": page_access_token,
    }
    if description:
        data["description"] = description
    if title:
        data["title"] = title
    if scheduled_publish_time:
        data["published"] = False
        data["scheduled_publish_time"] = int(scheduled_publish_time)

    response = requests.post(url, data=data, timeout=60)
    response.raise_for_status()
    return response.json()


def get_page_posts(page_id, page_access_token):
    url = f"{settings.FACEBOOK_GRAPH_URL}/{page_id}/feed"
    params = {
        "fields": "id,message,created_time,permalink_url,shares,"
                  "reactions.summary(true),comments.summary(true)",
        "access_token": page_access_token,
    }
    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    return response.json().get("data", [])


def update_post(post_id, page_access_token, message):
    url = f"{settings.FACEBOOK_GRAPH_URL}/{post_id}"
    data = {
        "message": message,
        "access_token": page_access_token,
    }
    response = requests.post(url, data=data, timeout=30)
    response.raise_for_status()
    return response.json()


def delete_post(post_id, page_access_token):
    url = f"{settings.FACEBOOK_GRAPH_URL}/{post_id}"
    params = {"access_token": page_access_token}
    response = requests.delete(url, params=params, timeout=30)
    response.raise_for_status()
    return response.json()
