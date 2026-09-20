"""
邮件发送工具模块
提供邮箱验证码生成和发送功能
"""

import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings


def generate_verification_code(length: int = 6) -> str:
    """生成指定长度的数字验证码"""
    return "".join(random.choices(string.digits, k=length))


async def send_verification_email(
    email: str,
    code: str,
    code_type: str,
) -> None:
    """
    通过 SMTP 异步发送验证码邮件

    Args:
        email: 收件人邮箱地址
        code: 验证码
        code_type: 验证码类型 (register / reset_password)
    """
    import aiosmtplib

    type_label = "注册" if code_type == "register" else "重置密码"

    # 构建邮件
    msg = MIMEMultipart("alternative")
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = email
    msg["Subject"] = f"[AI教学平台] 邮箱验证码 - {type_label}"

    # 纯文本内容
    text_content = (
        f"您好！\n\n"
        f"您正在进行{type_label}操作，验证码如下：\n\n"
        f"    {code}\n\n"
        f"验证码有效期为 {settings.VERIFICATION_CODE_EXPIRE_MINUTES} 分钟，请尽快使用。\n"
        f"如非本人操作，请忽略此邮件。\n\n"
        f"AI教学平台"
    )

    # HTML内容
    html_content = f"""
    <div style="max-width: 480px; margin: 0 auto; padding: 32px 24px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: #f9fafb; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #1f2937; margin: 0;">AI教学平台</h2>
      </div>
      <div style="background: white; padding: 32px 24px; border-radius: 8px;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <p style="color: #4b5563; font-size: 14px; margin-bottom: 16px;">
          您正在进行 <strong>{type_label}</strong> 操作，请在验证码输入框中输入以下验证码：
        </p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;
                    text-align: center; margin-bottom: 16px;">
          <span style="font-size: 28px; font-weight: 700; color: #1f2937;
                       letter-spacing: 6px;">{code}</span>
        </div>
        <p style="color: #6b7280; font-size: 12px; margin-bottom: 8px;">
          验证码有效期为 {settings.VERIFICATION_CODE_EXPIRE_MINUTES} 分钟，请尽快使用。
        </p>
        <p style="color: #6b7280; font-size: 12px;">
          如非本人操作，请忽略此邮件。
        </p>
      </div>
    </div>
    """

    part1 = MIMEText(text_content, "plain", "utf-8")
    part2 = MIMEText(html_content, "html", "utf-8")
    msg.attach(part1)
    msg.attach(part2)

    # 异步发送
    smtp_kwargs = {
        "hostname": settings.SMTP_HOST,
        "port": settings.SMTP_PORT,
        "use_tls": settings.SMTP_USE_SSL,
        "username": settings.SMTP_USERNAME,
        "password": settings.SMTP_PASSWORD,
    }

    async with aiosmtplib.SMTP(**smtp_kwargs) as smtp:
        await smtp.send_message(msg)
