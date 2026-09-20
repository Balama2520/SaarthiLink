class MetricsTracker:
    def __init__(self):
        self.calls = 0
        self.failures = 0

    def record_call(self):
        self.calls += 1

    def record_failure(self):
        self.failures += 1


metrics_tracker = MetricsTracker()
