from django.db import models


class PageInsight(models.Model):
    class Period(models.TextChoices):
        DAY = "day", "Day"
        WEEK = "week", "Week"
        MONTH = "month", "Month"

    page = models.ForeignKey(
        "pages.FacebookPage",
        on_delete=models.CASCADE,
        related_name="insights",
    )
    metric_type = models.CharField(max_length=100)
    value = models.IntegerField(default=0)
    date = models.DateField()
    period = models.CharField(
        max_length=10,
        choices=Period.choices,
        default=Period.DAY,
    )
    title = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "metric_type"]
        unique_together = ["page", "metric_type", "date", "period"]

    def __str__(self):
        return f"{self.metric_type} ({self.period}) - {self.date}: {self.value}"
