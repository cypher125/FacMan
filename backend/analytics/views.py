import csv
import logging
from datetime import datetime

from django.db.models import Avg, Count, Max, Min, Sum
from django.http import HttpResponse
from django.utils.dateparse import parse_date
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import require_scope
from facebook_auth.utils import decrypt_token
from pages.models import FacebookPage

from .models import PageInsight
from .serializers import InsightsSummarySerializer, PageInsightSerializer
from .services import get_page_insights

logger = logging.getLogger(__name__)

_error_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={"error": openapi.Schema(type=openapi.TYPE_STRING)},
)

_page_id_param = openapi.Parameter(
    "page_id", openapi.IN_PATH,
    description="Facebook page ID.",
    type=openapi.TYPE_STRING,
    required=True,
)

_date_params = [
    openapi.Parameter(
        "since", openapi.IN_QUERY,
        description="Start date filter (YYYY-MM-DD).",
        type=openapi.TYPE_STRING, format="date",
    ),
    openapi.Parameter(
        "until", openapi.IN_QUERY,
        description="End date filter (YYYY-MM-DD).",
        type=openapi.TYPE_STRING, format="date",
    ),
]


class InsightsSyncView(APIView):
    """
    Fetch insights from Facebook and store locally.
    """

    permission_classes = [IsAuthenticated, require_scope("analytics:write")]

    @swagger_auto_schema(
        operation_id="analytics_sync",
        operation_summary="Sync insights from Facebook",
        operation_description=(
            "Fetches page-level insights from the Facebook Graph API and stores them locally. "
            "Metrics include page impressions, engagement, fan counts, and more.\n\n"
            "**Supported periods:** `day`, `week`, `days_28`\n\n"
            "Optionally provide `since` and `until` dates in the request body to limit the date range."
        ),
        manual_parameters=[_page_id_param],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "period": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="Aggregation period.",
                    enum=["day", "week", "days_28"],
                    default="day",
                ),
                "since": openapi.Schema(
                    type=openapi.TYPE_STRING, format="date",
                    description="Start date (YYYY-MM-DD).",
                ),
                "until": openapi.Schema(
                    type=openapi.TYPE_STRING, format="date",
                    description="End date (YYYY-MM-DD).",
                ),
            },
        ),
        responses={
            200: openapi.Response(
                description="Insights synced successfully.",
                schema=PageInsightSerializer(many=True),
            ),
            400: openapi.Response(description="No access token for this page.", schema=_error_schema),
            404: openapi.Response(description="Page not found.", schema=_error_schema),
            502: openapi.Response(description="Failed to fetch insights from Facebook.", schema=_error_schema),
        },
        tags=["Analytics"],
    )
    def post(self, request, page_id):
        try:
            page = FacebookPage.objects.get(page_id=page_id, user=request.user)
        except FacebookPage.DoesNotExist:
            return Response(
                {"error": "Page not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        page_token = decrypt_token(page.access_token)
        if not page_token:
            return Response(
                {"error": "No access token for this page."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        period = request.data.get("period", "day")
        since = request.data.get("since")
        until = request.data.get("until")

        try:
            fb_insights = get_page_insights(
                page.page_id, page_token, period=period,
                since=since, until=until,
            )
        except Exception:
            logger.exception("Failed to fetch insights from Facebook")
            return Response(
                {"error": "Failed to fetch insights from Facebook."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        synced = []
        for metric in fb_insights:
            metric_name = metric.get("name", "")
            metric_title = metric.get("title", "")
            metric_desc = metric.get("description", "")
            metric_period = metric.get("period", period)

            for value_entry in metric.get("values", []):
                raw_value = value_entry.get("value", 0)
                if isinstance(raw_value, dict):
                    raw_value = sum(raw_value.values())

                end_time = value_entry.get("end_time", "")
                if end_time:
                    date = datetime.fromisoformat(
                        end_time.replace("+0000", "+00:00")
                    ).date()
                else:
                    continue

                insight, _ = PageInsight.objects.update_or_create(
                    page=page,
                    metric_type=metric_name,
                    date=date,
                    period=metric_period,
                    defaults={
                        "value": raw_value,
                        "title": metric_title,
                        "description": metric_desc,
                    },
                )
                synced.append(insight)

        return Response(
            PageInsightSerializer(synced, many=True).data,
            status=status.HTTP_200_OK,
        )


class InsightsListView(APIView):
    """
    List stored insights for a page with optional filters.
    """

    permission_classes = [IsAuthenticated, require_scope("analytics:read")]

    @swagger_auto_schema(
        operation_id="analytics_list",
        operation_summary="List page insights",
        operation_description=(
            "Returns locally stored insights for the specified page. "
            "Use query parameters to filter by metric type, period, or date range.\n\n"
            "Insights must be synced first using the sync endpoint."
        ),
        manual_parameters=[
            _page_id_param,
            openapi.Parameter(
                "metric", openapi.IN_QUERY,
                description="Filter by metric type (e.g., `page_impressions`, `page_engaged_users`).",
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                "period", openapi.IN_QUERY,
                description="Filter by aggregation period.",
                type=openapi.TYPE_STRING,
                enum=["day", "week", "days_28"],
            ),
            *_date_params,
        ],
        responses={
            200: openapi.Response(
                description="List of insights.",
                schema=PageInsightSerializer(many=True),
            ),
            404: openapi.Response(description="Page not found.", schema=_error_schema),
        },
        tags=["Analytics"],
    )
    def get(self, request, page_id):
        try:
            page = FacebookPage.objects.get(page_id=page_id, user=request.user)
        except FacebookPage.DoesNotExist:
            return Response(
                {"error": "Page not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        qs = PageInsight.objects.filter(page=page)

        metric = request.query_params.get("metric")
        if metric:
            qs = qs.filter(metric_type=metric)

        period = request.query_params.get("period")
        if period:
            qs = qs.filter(period=period)

        since = request.query_params.get("since")
        if since:
            parsed = parse_date(since)
            if parsed:
                qs = qs.filter(date__gte=parsed)

        until = request.query_params.get("until")
        if until:
            parsed = parse_date(until)
            if parsed:
                qs = qs.filter(date__lte=parsed)

        serializer = PageInsightSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class InsightsSummaryView(APIView):
    """
    Aggregated summary of insights for a page.
    """

    permission_classes = [IsAuthenticated, require_scope("analytics:read")]

    @swagger_auto_schema(
        operation_id="analytics_summary",
        operation_summary="Get insights summary",
        operation_description=(
            "Returns aggregated statistics (sum, average, min, max, count) "
            "for each metric type stored for the specified page. "
            "Results are grouped by `metric_type`.\n\n"
            "Use query parameters to filter by period or date range before aggregation."
        ),
        manual_parameters=[
            _page_id_param,
            openapi.Parameter(
                "period", openapi.IN_QUERY,
                description="Filter by aggregation period before summarizing.",
                type=openapi.TYPE_STRING,
                enum=["day", "week", "days_28"],
            ),
            *_date_params,
        ],
        responses={
            200: openapi.Response(
                description="Aggregated insights summary.",
                schema=InsightsSummarySerializer(many=True),
                examples={
                    "application/json": [
                        {
                            "metric_type": "page_impressions",
                            "total": 15420,
                            "average": 514.0,
                            "min_value": 120,
                            "max_value": 980,
                            "data_points": 30,
                        }
                    ]
                },
            ),
            404: openapi.Response(description="Page not found.", schema=_error_schema),
        },
        tags=["Analytics"],
    )
    def get(self, request, page_id):
        try:
            page = FacebookPage.objects.get(page_id=page_id, user=request.user)
        except FacebookPage.DoesNotExist:
            return Response(
                {"error": "Page not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        qs = PageInsight.objects.filter(page=page)

        period = request.query_params.get("period")
        if period:
            qs = qs.filter(period=period)

        since = request.query_params.get("since")
        if since:
            parsed = parse_date(since)
            if parsed:
                qs = qs.filter(date__gte=parsed)

        until = request.query_params.get("until")
        if until:
            parsed = parse_date(until)
            if parsed:
                qs = qs.filter(date__lte=parsed)

        summary = (
            qs.values("metric_type")
            .annotate(
                total=Sum("value"),
                average=Avg("value"),
                min_value=Min("value"),
                max_value=Max("value"),
                data_points=Count("id"),
            )
            .order_by("metric_type")
        )

        serializer = InsightsSummarySerializer(summary, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class InsightsExportView(APIView):
    """
    Export insights as a CSV file download.
    """

    permission_classes = [IsAuthenticated, require_scope("analytics:read")]

    @swagger_auto_schema(
        operation_id="analytics_export",
        operation_summary="Export insights as CSV",
        operation_description=(
            "Downloads a CSV file containing insights data for the specified page. "
            "The CSV includes columns: Date, Metric, Value, Period, Title.\n\n"
            "Use query parameters to filter the exported data."
        ),
        manual_parameters=[
            _page_id_param,
            openapi.Parameter(
                "metric", openapi.IN_QUERY,
                description="Filter by metric type.",
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                "period", openapi.IN_QUERY,
                description="Filter by aggregation period.",
                type=openapi.TYPE_STRING,
                enum=["day", "week", "days_28"],
            ),
            *_date_params,
        ],
        responses={
            200: openapi.Response(
                description="CSV file download.",
                schema=openapi.Schema(type=openapi.TYPE_FILE),
            ),
            404: openapi.Response(description="Page not found.", schema=_error_schema),
        },
        produces=["text/csv"],
        tags=["Analytics"],
    )
    def get(self, request, page_id):
        try:
            page = FacebookPage.objects.get(page_id=page_id, user=request.user)
        except FacebookPage.DoesNotExist:
            return Response(
                {"error": "Page not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        qs = PageInsight.objects.filter(page=page)

        metric = request.query_params.get("metric")
        if metric:
            qs = qs.filter(metric_type=metric)

        period = request.query_params.get("period")
        if period:
            qs = qs.filter(period=period)

        since = request.query_params.get("since")
        if since:
            parsed = parse_date(since)
            if parsed:
                qs = qs.filter(date__gte=parsed)

        until = request.query_params.get("until")
        if until:
            parsed = parse_date(until)
            if parsed:
                qs = qs.filter(date__lte=parsed)

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="insights_{page.page_id}.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(["Date", "Metric", "Value", "Period", "Title"])

        for insight in qs:
            writer.writerow([
                insight.date,
                insight.metric_type,
                insight.value,
                insight.period,
                insight.title,
            ])

        return response
