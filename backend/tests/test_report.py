from datetime import datetime

from app.services.report import ReportService


class TestGetMonthStart:
    def test_current_month(self):
        base = datetime(2024, 3, 15, 14, 30, 45)
        result = ReportService.get_month_start(base, 0)
        assert result == datetime(2024, 3, 1, 0, 0, 0)

    def test_previous_month(self):
        base = datetime(2024, 3, 15)
        result = ReportService.get_month_start(base, -1)
        assert result == datetime(2024, 2, 1, 0, 0, 0)

    def test_year_boundary_january_to_december(self):
        base = datetime(2024, 1, 15)
        result = ReportService.get_month_start(base, -1)
        assert result == datetime(2023, 12, 1, 0, 0, 0)

    def test_year_boundary_december_to_january(self):
        base = datetime(2024, 12, 15)
        result = ReportService.get_month_start(base, 1)
        assert result == datetime(2025, 1, 1, 0, 0, 0)

    def test_multiple_months_back(self):
        base = datetime(2024, 6, 15)
        result = ReportService.get_month_start(base, -5)
        assert result == datetime(2024, 1, 1, 0, 0, 0)

    def test_multiple_months_forward(self):
        base = datetime(2024, 1, 15)
        result = ReportService.get_month_start(base, 2)
        assert result == datetime(2024, 3, 1, 0, 0, 0)

    def test_default_offset_is_zero(self):
        base = datetime(2024, 7, 20)
        result = ReportService.get_month_start(base)
        assert result == datetime(2024, 7, 1, 0, 0, 0)

    def test_leap_year_february(self):
        base = datetime(2024, 3, 10)
        result = ReportService.get_month_start(base, -1)
        assert result == datetime(2024, 2, 1, 0, 0, 0)

    def test_non_leap_year_february(self):
        base = datetime(2023, 3, 10)
        result = ReportService.get_month_start(base, -1)
        assert result == datetime(2023, 2, 1, 0, 0, 0)

    def test_large_offset_across_years(self):
        base = datetime(2024, 5, 15)
        result = ReportService.get_month_start(base, -18)
        assert result == datetime(2022, 11, 1, 0, 0, 0)

    def test_large_offset_forward_across_years(self):
        base = datetime(2024, 5, 15)
        result = ReportService.get_month_start(base, 18)
        assert result == datetime(2025, 11, 1, 0, 0, 0)