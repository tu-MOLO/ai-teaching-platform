"""
日志配置模块
提供统一的日志配置和日志记录功能
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Optional

from app.core.config import settings


class ColoredFormatter(logging.Formatter):
    """带颜色的日志格式化器"""

    # ANSI颜色代码
    COLORS = {
        "DEBUG": "\033[36m",  # 青色
        "INFO": "\033[32m",  # 绿色
        "WARNING": "\033[33m",  # 黄色
        "ERROR": "\033[31m",  # 红色
        "CRITICAL": "\033[35m",  # 紫色
        "RESET": "\033[0m",  # 重置
    }

    def format(self, record: logging.LogRecord) -> str:
        """格式化日志记录"""
        # 保存原始级别名称
        original_levelname = record.levelname

        # 添加颜色
        if sys.platform != "win32" or "ANSICON" in os.environ:
            color = self.COLORS.get(record.levelname, self.COLORS["RESET"])
            record.levelname = f"{color}{record.levelname}{self.COLORS['RESET']}"

        # 格式化
        result = super().format(record)

        # 恢复原始级别名称
        record.levelname = original_levelname

        return result


class JsonFormatter(logging.Formatter):
    """JSON 日志格式化器。"""

    def format(self, record: logging.LogRecord) -> str:
        log_record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_record, ensure_ascii=False)


def setup_logging(level: Optional[str] = None, format_string: Optional[str] = None) -> None:
    """
    设置日志配置

    Args:
        level: 日志级别，默认使用配置中的LOG_LEVEL
        format_string: 日志格式，默认使用配置中的LOG_FORMAT
    """
    log_level = level or settings.LOG_LEVEL
    log_format = format_string or settings.LOG_FORMAT

    # 创建格式化器
    formatter: logging.Formatter
    if isinstance(log_format, str) and log_format.lower() == "json":
        formatter = JsonFormatter()
    else:
        try:
            if settings.DEBUG:
                formatter = ColoredFormatter(log_format)
            else:
                formatter = logging.Formatter(log_format)
        except ValueError:
            fallback_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            formatter = (
                ColoredFormatter(fallback_format)
                if settings.DEBUG
                else logging.Formatter(fallback_format)
            )

    # 配置根日志记录器
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))

    # 清除现有处理器
    root_logger.handlers.clear()

    # 添加控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # 设置第三方库的日志级别
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("minio").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    获取日志记录器

    Args:
        name: 日志记录器名称

    Returns:
        Logger实例
    """
    return logging.getLogger(name)
