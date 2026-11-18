from datetime import datetime, timezone


class MetricsTracker:
    def __init__(self):
        self.calls = 0
        self.failures = 0
        self.last_status = "unknown"
        self.last_provider = None
        self.last_checked_at = None

    def record_call(self):
        self.calls += 1

    def record_failure(self, provider: str):
        self.failures += 1
        self.last_status = "degraded"
        self.last_provider = provider
        self.last_checked_at = datetime.now(timezone.utc).isoformat()

    def record_success(self, provider: str):
        self.last_status = "ok"
        self.last_provider = provider
        self.last_checked_at = datetime.now(timezone.utc).isoformat()

    def record_unavailable(self):
        self.last_status = "unavailable"
        self.last_provider = None
        self.last_checked_at = datetime.now(timezone.utc).isoformat()


metrics_tracker = MetricsTracker()
