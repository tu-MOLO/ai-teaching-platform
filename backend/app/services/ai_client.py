"""AI 服务商调用的公共客户端与错误文案映射。

所有调用外部大模型的位置（AI 会话、IEP 初稿与报告生成等）统一走本模块，
目的是解决两个问题：

1. 超时策略不一致：以前只传了 ``AI_REQUEST_TIMEOUT``（600s）作为总超时，
   网络不通时会把请求挂到十分钟才失败。这里显式拆成连接超时与读取超时。
2. 异常直接冒泡成 500：httpx 的 ``ConnectError`` / ``TimeoutException`` 和
   服务商返回的 4xx/5xx 都会原样抛给用户，界面上只能看到"服务器内部错误"。
   这里把它们翻译成"发生了什么 + 可能原因 + 下一步怎么做"的文案，
   同时把原始异常写进日志，便于排查。
"""

import ssl
from typing import Optional

import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# 连接建立阶段单独计时，读取阶段（模型生成）用更长的总超时
_CONNECT_TIMEOUT = settings.AI_CONNECT_TIMEOUT
_READ_TIMEOUT = settings.AI_REQUEST_TIMEOUT


class AIServiceError(Exception):
    """面向用户的 AI 调用错误。

    ``user_message`` 会直接展示给终端用户；``log_detail`` 只写日志，不回显，
    避免密钥、内部地址等信息泄漏到界面上。
    """

    def __init__(
        self,
        user_message: str,
        log_detail: str = "",
        *,
        retryable: bool = True,
    ) -> None:
        self.user_message = user_message
        self.log_detail = log_detail
        self.retryable = retryable
        super().__init__(user_message)


def build_timeout() -> httpx.Timeout:
    """构造 AI 请求超时：连接短、读取长。"""
    return httpx.Timeout(connect=_CONNECT_TIMEOUT, read=_READ_TIMEOUT, write=_CONNECT_TIMEOUT, pool=_CONNECT_TIMEOUT)


def build_client() -> httpx.AsyncClient:
    """构造 AI 请求客户端。

    ``AI_VERIFY_SSL=false`` 时跳过证书校验，仅用于存在 HTTPS 中间人拦截的
    内网/自用环境（公司网关、本地代理软件），默认保持校验开启。
    """
    return httpx.AsyncClient(timeout=build_timeout(), verify=settings.AI_VERIFY_SSL)


def _safe_body(response: httpx.Response, limit: int = 300) -> str:
    try:
        return (response.text or "")[:limit]
    except Exception:  # noqa: BLE001 - 读取失败不应影响错误提示
        return ""


def _status_message(status_code: int, api_base: str) -> tuple[str, bool]:
    """把 HTTP 状态码翻译成用户文案，返回 (文案, 是否可重试)。"""
    if status_code == 401:
        return (
            "AI 服务商拒绝了本次请求：API 密钥无效或已失效。"
            "请到「设置 → AI 助手」核对密钥后重试；若刚更换过密钥，请重新保存一次。",
            False,
        )
    if status_code == 403:
        return (
            "AI 服务商拒绝了本次请求：当前密钥没有访问该模型的权限。"
            "请到服务商控制台确认该模型已开通，或在「设置 → AI 助手」更换模型。",
            False,
        )
    if status_code == 404:
        return (
            f"AI 服务商返回 404：接口地址或模型名称不存在（当前地址 {api_base}）。"
            "请检查「设置 → AI 助手」中的服务地址与模型名是否与该服务商的文档一致。",
            False,
        )
    if status_code == 422:
        return (
            "AI 服务商无法处理本次请求内容（参数不合规）。"
            "可能是本次输入过长，可尝试精简问题或开启新会话后重试。",
            True,
        )
    if status_code == 429:
        return (
            "AI 服务商提示请求过于频繁，或账户额度已用尽。"
            "请稍等片刻再试；若持续出现，请到服务商控制台确认余额与限流设置。",
            True,
        )
    if status_code in (500, 502, 503, 504):
        return (
            "AI 服务商暂时不可用（服务端错误）。"
            "这是服务商一侧的问题，可稍后重试；若长时间未恢复，可临时切换到其他模型。",
            True,
        )
    return (
        f"AI 服务商返回了未预期的响应（HTTP {status_code}）。"
        "请核对服务地址与模型名，或稍后重试。",
        True,
    )


def raise_for_status(response: httpx.Response, api_base: str) -> None:
    """校验响应状态码，失败时抛出带用户文案的 :class:`AIServiceError`。"""
    if 200 <= response.status_code < 300:
        return
    message, retryable = _status_message(response.status_code, api_base)
    logger.error(
        "AI 服务商返回异常状态码 %s (api_base=%s): %s",
        response.status_code,
        api_base,
        _safe_body(response),
    )
    raise AIServiceError(message, f"HTTP {response.status_code}", retryable=retryable)


def describe_exception(exc: Exception, api_base: str) -> AIServiceError:
    """把 httpx 异常翻译成带用户文案的 :class:`AIServiceError`。"""
    if isinstance(exc, httpx.TimeoutException):
        message = (
            f"连接或等待 AI 服务响应超时（连接 {_CONNECT_TIMEOUT} 秒 / 读取 {_READ_TIMEOUT} 秒）。"
            "可能是网络较慢，也可能是模型正在进行长思考。"
            "请稍后重试；若反复超时，建议在「设置 → AI 助手」换用响应更快的模型。"
        )
        return AIServiceError(message, f"timeout: {exc}")

    if isinstance(exc, httpx.ConnectError):
        detail = str(exc)
        if isinstance(exc.__cause__, ssl.SSLCertVerificationError) or "CERTIFICATE_VERIFY_FAILED" in detail:
            message = (
                "连接 AI 服务时证书校验未通过，请求被中止。"
                "常见原因是公司网络或本机代理对 HTTPS 做了中间人拦截。"
                "可先关闭代理软件后重试；若确实需要在此环境下使用，"
                "可在后端配置中设置 AI_VERIFY_SSL=false（仅建议内网自用环境）。"
            )
            return AIServiceError(message, f"ssl verify failed: {detail}")
        message = (
            f"无法连接 AI 服务（{api_base}）。"
            "请检查网络是否正常、服务地址是否填写正确；若需要通过代理访问，请确认代理可用。"
        )
        return AIServiceError(message, f"connect error: {detail}")

    if isinstance(exc, httpx.HTTPError):
        message = (
            "与 AI 服务通信时发生错误，本次请求未能完成。"
            "请稍后重试；若反复出现，请检查网络环境与服务地址配置。"
        )
        return AIServiceError(message, f"{type(exc).__name__}: {exc}")

    message = "调用 AI 服务时发生未知错误，本次请求未能完成。请稍后重试。"
    return AIServiceError(message, f"{type(exc).__name__}: {exc}")


def log_and_describe(exc: Exception, api_base: str, scene: str) -> AIServiceError:
    """记录日志并把异常转换为用户可读错误。"""
    described = describe_exception(exc, api_base)
    logger.error("AI 调用失败[%s] (api_base=%s): %s", scene, api_base, described.log_detail)
    return described


def friendly_message(error: AIServiceError, fallback: Optional[str] = None) -> str:
    """取最终展示给用户的文案。"""
    return error.user_message or fallback or "AI 服务调用失败，请稍后重试。"
