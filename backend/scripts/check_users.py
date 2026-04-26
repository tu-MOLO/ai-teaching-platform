"""
检查数据库中的用户

用法：
    python scripts/check_users.py
"""

import sqlite3
from pathlib import Path

# 数据库文件路径
db_path = Path(__file__).parent.parent / "ai_teaching_platform.db"


def check_users():
    """检查数据库中的用户"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print(f"检查数据库: {db_path}")
    
    # 检查 users 表
    cursor.execute("PRAGMA table_info(users)")
    columns = cursor.fetchall()
    print("\nusers 表结构:")
    for col in columns:
        print(f"  {col[1]} ({col[2]})")
    
    # 查询用户数据
    cursor.execute("SELECT id, username, email, name FROM users")
    users = cursor.fetchall()
    
    print("\n现有用户:")
    if users:
        for user in users:
            print(f"  - ID: {user[0]}, 用户名: {user[1]}, 邮箱: {user[2]}, 姓名: {user[3]}")
    else:
        print("  无用户数据")
    
    # 检查是否有用户表
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    if cursor.fetchone():
        print("\nusers 表存在")
    else:
        print("\n错误: users 表不存在")
    
    conn.close()


if __name__ == "__main__":
    check_users()
