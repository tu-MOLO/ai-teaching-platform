"""
API V1路由注册模块
聚合所有V1版本的API路由
"""
from fastapi import APIRouter

from app.api.v1 import auth, tags, resources, lesson_templates, lesson_plans, students, portfolios, courses, reports, notifications, users, dropdown_options

# 创建V1版本的路由器
api_router = APIRouter()

# 注册认证路由
api_router.include_router(auth.router)

# 注册用户管理路由
api_router.include_router(users.router, prefix="/users", tags=["用户"])

# 注册标签路由
api_router.include_router(tags.router, prefix="/tags", tags=["标签"])

# 注册资源路由
api_router.include_router(resources.router, prefix="/resources", tags=["资源"])

# 注册教案模板路由
api_router.include_router(lesson_templates.router, prefix="/lesson-templates", tags=["教案模板"])

# 注册教案路由
api_router.include_router(lesson_plans.router, prefix="/lesson-plans", tags=["教案"])

# 注册学生路由
api_router.include_router(students.router, prefix="/students", tags=["学生"])

# 注册成长档案路由
api_router.include_router(portfolios.router, prefix="/portfolios", tags=["成长档案"])

# 注册课程路由
api_router.include_router(courses.router, prefix="/courses", tags=["课程"])

# 注册报告路由
api_router.include_router(reports.router, prefix="/reports", tags=["报告"])

# 注册通知路由
api_router.include_router(notifications.router, prefix="/notifications", tags=["通知"])

# 注册可配置下拉选项路由
api_router.include_router(dropdown_options.router)
# api_router.include_router(materials.router, prefix="/materials", tags=["教学资料"])
# api_router.include_router(assignments.router, prefix="/assignments", tags=["作业"])
# api_router.include_router(quizzes.router, prefix="/quizzes", tags=["测验"])
# api_router.include_router(ai.router, prefix="/ai", tags=["AI功能"])
