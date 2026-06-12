import os
from pathlib import Path
import re

# Ensure running from backend root
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent
os.chdir(BACKEND_ROOT)

# Mapping for app/services/ plural files
service_mappings = {
    'app/services/courses.py': 'app/services/course.py',
    'app/services/dropdown_options.py': 'app/services/dropdown_option.py',
    'app/services/lesson_plans.py': 'app/services/lesson_plan.py',
    'app/services/notifications.py': 'app/services/notification.py',
    'app/services/portfolios.py': 'app/services/portfolio.py',
    'app/services/reports.py': 'app/services/report.py',
    'app/services/resources.py': 'app/services/resource.py',
    'app/services/students.py': 'app/services/student.py',
    'app/services/tags.py': 'app/services/tag.py',
    'app/services/users.py': 'app/services/user.py',
}

# Mapping for tests/ subdirectories
test_mappings = {}

# api tests
for name in [
    'test_ai_api.py', 'test_auth_api.py', 'test_course_api.py',
    'test_dropdown_option_api.py', 'test_lesson_plan_api.py',
    'test_lesson_template_api.py', 'test_notification_api.py',
    'test_portfolio_api.py', 'test_resource_api.py',
    'test_student_api.py', 'test_tag_api.py', 'test_user_api.py',
]:
    src = f'tests/{name}'
    dst = f'tests/api/{name}'
    if Path(src).exists():
        test_mappings[dst] = src

# core tests
for name in [
    'test_api_handlers.py', 'test_config_validator.py', 'test_exceptions.py',
    'test_main_app.py', 'test_performance.py', 'test_query_filters.py',
    'test_rate_limiter.py', 'test_security.py', 'test_user_model.py',
]:
    src = f'tests/{name}'
    dst = f'tests/core/{name}'
    if Path(src).exists():
        test_mappings[dst] = src

# services tests
for name in [
    'test_ai_config_service.py', 'test_ai_service.py', 'test_ai_tool_executors.py',
    'test_course_service.py', 'test_dropdown_option_service.py',
    'test_export_service.py', 'test_lesson_plan_service.py',
    'test_notification_service.py', 'test_portfolio_service.py',
    'test_report.py', 'test_resource_service.py', 'test_storage_service.py',
    'test_student_service.py', 'test_tag_service.py',
]:
    src = f'tests/{name}'
    dst = f'tests/services/{name}'
    if Path(src).exists():
        test_mappings[dst] = src


def fix_imports(content: str, mappings: dict) -> str:
    for dst, src in mappings.items():
        src_mod = src.replace('/', '.').replace('\\', '.').replace('.py', '')
        dst_mod = dst.replace('/', '.').replace('\\', '.').replace('.py', '')
        # Replace imports like: from app.services.course import -> from app.services.courses import
        content = re.sub(
            rf'\bfrom\s+{re.escape(src_mod)}\s+import\b',
            f'from {dst_mod} import',
            content,
        )
        # Replace imports like: import app.services.course -> import app.services.courses
        content = re.sub(
            rf'\bimport\s+{re.escape(src_mod)}\b',
            f'import {dst_mod}',
            content,
        )
    return content


def restore_file(dst: str, src: str, mappings: dict) -> None:
    src_path = Path(src)
    dst_path = Path(dst)
    if not src_path.exists():
        print(f'Source not found: {src}')
        return
    content = src_path.read_text(encoding='utf-8')
    content = fix_imports(content, mappings)
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    dst_path.write_text(content, encoding='utf-8')
    print(f'Restored: {dst} <- {src}')


# Restore service files
for dst, src in service_mappings.items():
    restore_file(dst, src, service_mappings)

# Restore test files
for dst, src in test_mappings.items():
    restore_file(dst, src, service_mappings)
