"""
使用SQL直接创建测试用户

用法：
    python scripts/create_user_sql.py
"""

import sqlite3
import hashlib
from pathlib import Path

# 数据库文件路径
db_path = Path(__file__).parent.parent / "ai_teaching_platform.db"


def hash_password(password):
    """简单的密码哈希函数"""
    return hashlib.sha256(password.encode()).hexdigest()


def create_test_user():
    """创建测试用户"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print(f"连接数据库: {db_path}")
    
    # 检查 users 表是否存在
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    if not cursor.fetchone():
        print("创建 users 表...")
        # 创建 users 表
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            username TEXT UNIQUE,
            hashed_password TEXT,
            full_name TEXT,
            avatar_url TEXT,
            phone TEXT,
            bio TEXT,
            role TEXT DEFAULT 'teacher',
            status TEXT DEFAULT 'active',
            is_active BOOLEAN DEFAULT 1,
            is_verified BOOLEAN DEFAULT 0,
            is_superuser BOOLEAN DEFAULT 0,
            last_login_at TEXT,
            last_login_ip TEXT,
            login_count INTEGER DEFAULT 0,
            failed_login_attempts INTEGER DEFAULT 0,
            locked_until TEXT,
            token_version INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT
        )
        ''')
        print("users 表创建成功")
    
    # 检查是否已有用户
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    
    if user_count == 0:
        print("创建测试用户...")
        # 生成 UUID
        import uuid
        user_id = str(uuid.uuid4())
        
        # 创建测试用户
        cursor.execute('''
        INSERT INTO users (id, email, username, hashed_password, full_name, avatar_url, role, status, is_active, is_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id,
            'teacher1@example.com',
            'teacher1',
            hash_password('password123'),
            '张老师',
            'https://neeko-copilot.bytedance.net/api/text2image?prompt=professional%20teacher%20portrait&size=200x200',
            'teacher',
            'active',
            1,
            1
        ))
        
        conn.commit()
        print("\n测试用户创建成功：")
        print("  用户名: teacher1")
        print("  密码: password123")
        print("  邮箱: teacher1@example.com")
    else:
        print(f"\n已有 {user_count} 个用户，跳过创建")
        # 显示现有用户
        cursor.execute("SELECT username, email, full_name FROM users")
        users = cursor.fetchall()
        print("现有用户:")
        for user in users:
            print(f"  - {user[0]} ({user[1]}) - {user[2]}")
    
    conn.close()


if __name__ == "__main__":
    create_test_user()
