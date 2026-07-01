"""
分页工具测试
"""
import pytest
from app.utils.pagination import (
    calculate_offset,
    calculate_total_pages,
    calculate_pagination_info,
)


class TestCalculateOffset:
    """测试 calculate_offset 函数"""

    def test_first_page(self):
        """测试第一页的偏移量"""
        offset = calculate_offset(page=1, page_size=10)
        assert offset == 0

    def test_second_page(self):
        """测试第二页的偏移量"""
        offset = calculate_offset(page=2, page_size=10)
        assert offset == 10

    def test_third_page(self):
        """测试第三页的偏移量"""
        offset = calculate_offset(page=3, page_size=20)
        assert offset == 40


class TestCalculateTotalPages:
    """测试 calculate_total_pages 函数"""

    def test_exact_division(self):
        """测试整除情况"""
        pages = calculate_total_pages(total=100, page_size=10)
        assert pages == 10

    def test_remainder(self):
        """测试有余数的情况"""
        pages = calculate_total_pages(total=105, page_size=10)
        assert pages == 11

    def test_zero_total(self):
        """测试总数为0"""
        pages = calculate_total_pages(total=0, page_size=10)
        assert pages == 0

    def test_zero_page_size(self):
        """测试页大小为0"""
        pages = calculate_total_pages(total=100, page_size=0)
        assert pages == 0

    def test_negative_page_size(self):
        """测试页大小为负数"""
        pages = calculate_total_pages(total=100, page_size=-10)
        assert pages == 0


class TestCalculatePaginationInfo:
    """测试 calculate_pagination_info 函数"""

    def test_first_page(self):
        """测试第一页的分页信息"""
        offset, pages = calculate_pagination_info(page=1, page_size=10, total=100)
        assert offset == 0
        assert pages == 10

    def test_middle_page(self):
        """测试中间页的分页信息"""
        offset, pages = calculate_pagination_info(page=5, page_size=10, total=100)
        assert offset == 40
        assert pages == 10

    def test_last_page_with_remainder(self):
        """测试最后一页（有余数）"""
        offset, pages = calculate_pagination_info(page=11, page_size=10, total=105)
        assert offset == 100
        assert pages == 11
