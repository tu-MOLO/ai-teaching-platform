"""
分页工具模块
提供统一的分页计算逻辑
"""


def calculate_offset(page: int, page_size: int) -> int:
    """
    计算分页偏移量
    Args:
        page: 页码（从1开始）
        page_size: 每页数量

    Returns:
        偏移量
    """
    return (page - 1) * page_size


def calculate_total_pages(total: int, page_size: int) -> int:
    """
    计算总页数
    Args:
        total: 总记录数
        page_size: 每页数量

    Returns:
        总页数
    """
    if page_size <= 0:
        return 0
    return (total + page_size - 1) // page_size


def calculate_pagination_info(
    page: int,
    page_size: int,
    total: int
) -> tuple[int, int]:
    """
    计算分页信息（偏移量和总页数）

    Args:
        page: 页码（从1开始）
        page_size: 每页数量
        total: 总记录数

    Returns:
        (偏移量, 总页数)
    """
    offset = calculate_offset(page, page_size)
    pages = calculate_total_pages(total, page_size)
    return offset, pages
