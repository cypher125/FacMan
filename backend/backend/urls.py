from django.contrib import admin
from django.urls import include, path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions

schema_view = get_schema_view(
    openapi.Info(
        title="FacMan API",
        default_version="v1",
        description=(
            "## FacMan - Facebook Page Management Platform\n\n"
            "Manage multiple Facebook Pages through a unified REST API. "
            "FacMan integrates with the Facebook Graph API v18.0 to provide "
            "page management, content publishing, engagement monitoring, "
            "analytics, and messaging.\n\n"
            "### Authentication\n"
            "Most endpoints require **Token Authentication**. Include the header:\n"
            "```\nAuthorization: Token <your-token>\n```\n"
            "Obtain a token via the Facebook OAuth login flow at "
            "`/api/auth/facebook/login/`.\n\n"
            "### Rate Limits\n"
            "Facebook Graph API enforces **200 calls/hour/user**. "
            "Plan your sync and publish operations accordingly.\n\n"
            "### Pagination\n"
            "List endpoints return paginated results with **20 items per page** by default. "
            "Use `?page=N` to navigate pages."
        ),
        terms_of_service="",
        contact=openapi.Contact(email="admin@facman.com"),
        license=openapi.License(name="Proprietary"),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    path("admin/", admin.site.urls),
    # API Documentation
    path(
        "docs/",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui",
    ),
    path(
        "docs/redoc/",
        schema_view.with_ui("redoc", cache_timeout=0),
        name="schema-redoc",
    ),
    path(
        "docs/json/",
        schema_view.without_ui(cache_timeout=0),
        name="schema-json",
    ),
    # API endpoints
    path("api/auth/facebook/", include("facebook_auth.urls")),
    path("api/auth/", include("accounts.urls")),
    path("api/pages/", include("pages.urls")),
    path("api/posts/", include("posts.urls")),
    path("api/analytics/", include("analytics.urls")),
    path("api/messages/", include("messaging.urls")),
    path("api/scheduler/", include("scheduler.urls")),
]
