"""
报告服务
提供教学数据分析相关的统计功能
"""
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.student import Student
from app.models.lesson_plan import LessonPlan, LessonPlanStatus
from app.models.portfolio import Portfolio
from app.models.resource import Resource


class ReportService:
    """报告服务类"""

    @staticmethod
    async def get_dashboard_stats(db: AsyncSession, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        获取仪表盘统计数据

        Args:
            db: 数据库会话
            user_id: 用户ID（单教师模式下用于过滤数据）

        Returns:
            仪表盘统计数据
        """
        # 构建基础查询条件
        course_filters = [Course.is_deleted == False]
        student_filters = [Student.is_deleted == False]
        lesson_plan_filters = [LessonPlan.is_deleted == False]
        resource_filters = [Resource.is_deleted == False]

        if user_id is not None:
            course_filters.append(Course.user_id == user_id)
            student_filters.append(Student.user_id == user_id)
            lesson_plan_filters.append(LessonPlan.user_id == user_id)
            resource_filters.append(Resource.user_id == user_id)

        # 获取总课程数
        total_courses_result = await db.execute(
            select(func.count()).select_from(Course).where(*course_filters)
        )
        total_courses = total_courses_result.scalar() or 0

        # 获取总学生数
        total_students_result = await db.execute(
            select(func.count()).select_from(Student).where(*student_filters)
        )
        total_students = total_students_result.scalar() or 0

        # 计算本月新增课程数
        current_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_courses_result = await db.execute(
            select(func.count()).select_from(Course).where(
                *course_filters,
                Course.created_at >= current_month_start
            )
        )
        monthly_courses = monthly_courses_result.scalar() or 0

        # 计算本月新增学生数
        monthly_students_result = await db.execute(
            select(func.count()).select_from(Student).where(
                *student_filters,
                Student.created_at >= current_month_start
            )
        )
        monthly_students = monthly_students_result.scalar() or 0

        # 计算本月新增教案数（只统计已发布的教案）
        monthly_lesson_plans_result = await db.execute(
            select(func.count()).select_from(LessonPlan).where(
                *lesson_plan_filters,
                LessonPlan.status == LessonPlanStatus.PUBLISHED,
                LessonPlan.created_at >= current_month_start
            )
        )
        monthly_lesson_plans = monthly_lesson_plans_result.scalar() or 0

        # 获取总资源数
        total_resources_result = await db.execute(
            select(func.count()).select_from(Resource).where(*resource_filters)
        )
        total_resources = total_resources_result.scalar() or 0

        # 计算趋势数据 - 与上月相比的增长率
        # 获取上月时间范围
        current_date = datetime.now()
        if current_date.month == 1:
            last_month_start = current_date.replace(year=current_date.year - 1, month=12, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            last_month_start = current_date.replace(month=current_date.month - 1, day=1, hour=0, minute=0, second=0, microsecond=0)

        # 上上月（用于计算上月的趋势）
        if last_month_start.month == 1:
            two_months_ago_start = last_month_start.replace(year=last_month_start.year - 1, month=12, day=1)
        else:
            two_months_ago_start = last_month_start.replace(month=last_month_start.month - 1, day=1)

        # 计算上月新增课程数
        last_month_courses_result = await db.execute(
            select(func.count()).select_from(Course).where(
                *course_filters,
                Course.created_at >= last_month_start,
                Course.created_at < current_month_start
            )
        )
        last_month_courses = last_month_courses_result.scalar() or 0

        # 计算上上月新增课程数
        two_months_ago_courses_result = await db.execute(
            select(func.count()).select_from(Course).where(
                *course_filters,
                Course.created_at >= two_months_ago_start,
                Course.created_at < last_month_start
            )
        )
        two_months_ago_courses = two_months_ago_courses_result.scalar() or 0

        # 计算课程增长率
        if two_months_ago_courses > 0:
            course_growth = ((last_month_courses - two_months_ago_courses) / two_months_ago_courses * 100)
            course_trend = f"{'+' if course_growth >= 0 else ''}{round(course_growth)}%"
        elif last_month_courses > 0:
            course_trend = "+100%"
        else:
            course_trend = "+0%"

        # 计算上月新增学生数
        last_month_students_result = await db.execute(
            select(func.count()).select_from(Student).where(
                *student_filters,
                Student.created_at >= last_month_start,
                Student.created_at < current_month_start
            )
        )
        last_month_students = last_month_students_result.scalar() or 0

        # 计算上上月新增学生数
        two_months_ago_students_result = await db.execute(
            select(func.count()).select_from(Student).where(
                *student_filters,
                Student.created_at >= two_months_ago_start,
                Student.created_at < last_month_start
            )
        )
        two_months_ago_students = two_months_ago_students_result.scalar() or 0

        # 计算学生增长率
        if two_months_ago_students > 0:
            student_growth = ((last_month_students - two_months_ago_students) / two_months_ago_students * 100)
            student_trend = f"{'+' if student_growth >= 0 else ''}{round(student_growth)}%"
        elif last_month_students > 0:
            student_trend = "+100%"
        else:
            student_trend = "+0%"

        # 最近活动 - 从最近创建的课程、学生、教案中获取
        recent_activities = []

        # 获取最近创建的课程
        recent_courses_query = (
            select(Course)
            .where(*course_filters)
            .order_by(Course.created_at.desc())
            .limit(3)
        )
        recent_courses_result = await db.execute(recent_courses_query)
        recent_courses = recent_courses_result.scalars().all()

        for course in recent_courses:
            time_diff = current_date - course.created_at
            if time_diff.days == 0:
                if time_diff.seconds < 3600:
                    time_str = f"{time_diff.seconds // 60}分钟前"
                else:
                    time_str = f"{time_diff.seconds // 3600}小时前"
            else:
                time_str = f"{time_diff.days}天前"

            recent_activities.append({
                "id": f"course_{course.id}",
                "title": "新增课程",
                "description": f"创建了课程《{course.name}》",
                "icon": "BookOutlined",
                "time": time_str,
                "desc": course.subject,
                "color": "#c9a87c"
            })

        # 获取最近创建的学生
        recent_students_query = (
            select(Student)
            .where(*student_filters)
            .order_by(Student.created_at.desc())
            .limit(2)
        )
        recent_students_result = await db.execute(recent_students_query)
        recent_students = recent_students_result.scalars().all()

        for student in recent_students:
            time_diff = current_date - student.created_at
            if time_diff.days == 0:
                if time_diff.seconds < 3600:
                    time_str = f"{time_diff.seconds // 60}分钟前"
                else:
                    time_str = f"{time_diff.seconds // 3600}小时前"
            else:
                time_str = f"{time_diff.days}天前"

            recent_activities.append({
                "id": f"student_{student.id}",
                "title": "新增学生",
                "description": f"添加了学生 {student.name}",
                "icon": "UserOutlined",
                "time": time_str,
                "desc": f"{student.grade} {student.class_name}",
                "color": "#6b9b7a"
            })

        # 按时间排序
        recent_activities.sort(key=lambda x: x["time"], reverse=True)
        recent_activities = recent_activities[:5]  # 只保留最近5条

        return {
            "totalCourses": total_courses,
            "courseTrend": course_trend,
            "totalStudents": total_students,
            "studentTrend": student_trend,
            "monthlyCourses": monthly_courses,
            "monthlyStudents": monthly_students,
            "monthlyLessonPlans": monthly_lesson_plans,
            "totalResources": total_resources,
            "aiAssistants": monthly_courses + monthly_students,  # AI助手使用次数 = 本月新增课程数 + 本月新增学生数（作为辅助教学活动的估算）
            "recentActivities": recent_activities
        }

    @staticmethod
    async def get_course_statistics(db: AsyncSession, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        获取课程统计报告

        Args:
            db: 数据库会话
            user_id: 用户ID（单教师模式下用于过滤数据）

        Returns:
            课程统计数据
        """
        # 构建基础查询条件
        course_filters = [Course.is_deleted == False]
        if user_id is not None:
            course_filters.append(Course.user_id == user_id)

        # 按学科统计课程数量
        subject_stats_result = await db.execute(
            select(
                Course.subject,
                func.count().label('count')
            ).where(
                *course_filters
            ).group_by(Course.subject)
        )
        subject_stats = subject_stats_result.all()

        # 计算总数
        total_courses = sum(stat.count for stat in subject_stats)

        # 构建分类统计
        colors = ['#c9a87c', '#6b9b7a', '#7a9ab8', '#d4a574', '#9b8b7a', '#b8a07a', '#7ab8a0']
        category_stats = []
        for i, stat in enumerate(subject_stats):
            percent = round((stat.count / total_courses * 100) if total_courses > 0 else 0, 0)
            category_stats.append({
                "name": stat.subject,
                "value": stat.count,
                "percent": percent,
                "color": colors[i % len(colors)]
            })

        # 按状态统计课程
        status_stats_result = await db.execute(
            select(
                Course.status,
                func.count().label('count')
            ).where(
                *course_filters
            ).group_by(Course.status)
        )
        status_stats = status_stats_result.all()

        status_distribution = []
        status_map = {
            'active': '进行中',
            'inactive': '已结课',
            'draft': '草稿'
        }
        for stat in status_stats:
            percent = round((stat.count / total_courses * 100) if total_courses > 0 else 0, 0)
            status_distribution.append({
                "status": status_map.get(stat.status, stat.status),
                "count": stat.count,
                "percent": percent
            })

        # 暂时注释掉 LessonPlan 相关代码
        # 热门课程 - 根据关联的教案数量排序（反映课程活跃度）
        # 构建查询条件
        # hot_courses_filters = [Course.is_deleted == False]
        # lesson_plan_filters = [LessonPlan.is_deleted == False]
        # if user_id is not None:
        #     hot_courses_filters.append(Course.user_id == user_id)
        #     lesson_plan_filters.append(LessonPlan.user_id == user_id)

        # # 查询课程及其关联的教案数量
        # hot_courses_result = await db.execute(
        #     select(
        #         Course.id,
        #         Course.name,
        #         func.count(LessonPlan.id).label('lesson_count')
        #     )
        #     .outerjoin(LessonPlan, LessonPlan.course_id == Course.id)
        #     .where(
        #         *hot_courses_filters,
        #         LessonPlan.is_deleted == False if user_id is None else (LessonPlan.user_id == user_id)
        #     )
        #     .group_by(Course.id)
        #     .order_by(func.count(LessonPlan.id).desc())
        #     .limit(5)
        # )

        # hot_courses_data = hot_courses_result.all()

        # 构建热门课程列表
        hot_courses = []
        # 暂时使用简单的课程查询
        hot_courses_query = (
            select(Course)
            .where(*course_filters)
            .order_by(Course.created_at.desc())
            .limit(5)
        )
        hot_courses_result = await db.execute(hot_courses_query)
        hot_courses_data = hot_courses_result.scalars().all()

        for course in hot_courses_data:
            # 计算学生参与数（基于成长档案中关联该课程的学生数）
            portfolio_filters = [
                Portfolio.course_id == course.id,
                Portfolio.is_deleted == False
            ]
            if user_id is not None:
                portfolio_filters.append(Portfolio.user_id == user_id)

            student_count_result = await db.execute(
                select(func.count(func.distinct(Portfolio.student_id)))
                .where(*portfolio_filters)
            )
            student_count = student_count_result.scalar() or 0

            hot_courses.append({
                "id": course.id,
                "name": course.name,
                "studentCount": student_count or 10,  # 学生数或估算值
                "completionRate": 0  # 暂时设为0
            })

        return {
            "categoryStats": category_stats,
            "hotCourses": hot_courses,
            "statusDistribution": status_distribution
        }

    @staticmethod
    async def get_student_statistics(db: AsyncSession, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        获取学生统计报告

        Args:
            db: 数据库会话
            user_id: 用户ID（单教师模式下用于过滤数据）

        Returns:
            学生统计数据
        """
        # 构建基础查询条件
        student_filters = [Student.is_deleted == False]
        portfolio_filters = [Portfolio.is_deleted == False]
        if user_id is not None:
            student_filters.append(Student.user_id == user_id)
            portfolio_filters.append(Portfolio.user_id == user_id)

        # 按年级统计学生数量
        grade_stats_result = await db.execute(
            select(
                Student.grade,
                func.count().label('count')
            ).where(
                *student_filters
            ).group_by(Student.grade)
            .order_by(Student.grade)
        )
        grade_stats = grade_stats_result.all()

        # 计算总数
        total_students = sum(stat.count for stat in grade_stats)

        # 构建年级分布
        colors = ['#c9a87c', '#6b9b7a', '#7a9ab8', '#d4a574', '#9b8b7a', '#b8a07a']
        grade_distribution = []
        for i, stat in enumerate(grade_stats):
            percent = round((stat.count / total_students * 100) if total_students > 0 else 0, 0)
            grade_distribution.append({
                "grade": stat.grade,
                "count": stat.count,
                "percent": percent,
                "color": colors[i % len(colors)]
            })

        # 按性别统计
        gender_stats_result = await db.execute(
            select(
                Student.gender,
                func.count().label('count')
            ).where(
                *student_filters
            ).group_by(Student.gender)
        )
        gender_stats = gender_stats_result.all()

        gender_distribution = []
        for stat in gender_stats:
            percent = round((stat.count / total_students * 100) if total_students > 0 else 0, 0)
            gender_distribution.append({
                "gender": stat.gender,
                "count": stat.count,
                "percent": percent
            })

        # 学习进度分布（从成长档案统计认知维度评分）
        progress_ranges = [
            ("优秀(90-100%)", 90, 100),
            ("良好(80-89%)", 80, 89),
            ("中等(60-79%)", 60, 79),
            ("需努力(<60%)", 0, 59)
        ]

        progress_distribution = []
        for range_name, min_val, max_val in progress_ranges:
            count_result = await db.execute(
                select(func.count()).select_from(Portfolio).where(
                    *portfolio_filters,
                    Portfolio.cognitive_score >= min_val,
                    Portfolio.cognitive_score <= max_val
                )
            )
            count = count_result.scalar() or 0
            percent = round((count / total_students * 100) if total_students > 0 else 0, 0)
            progress_distribution.append({
                "range": range_name,
                "count": count,
                "percent": percent
            })

        return {
            "gradeDistribution": grade_distribution,
            "genderDistribution": gender_distribution,
            "progressDistribution": progress_distribution
        }

    @staticmethod
    async def get_monthly_trends(db: AsyncSession, months: int = 6, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        获取月度教学趋势数据

        Args:
            db: 数据库会话
            months: 查询的月数
            user_id: 用户ID（单教师模式下用于过滤数据）

        Returns:
            月度趋势数据列表
        """
        trends = []
        current_date = datetime.now()

        # 构建基础查询条件
        course_filters = [Course.is_deleted == False]
        student_filters = [Student.is_deleted == False]
        lesson_plan_filters = [LessonPlan.is_deleted == False]

        if user_id is not None:
            course_filters.append(Course.user_id == user_id)
            student_filters.append(Student.user_id == user_id)
            lesson_plan_filters.append(LessonPlan.user_id == user_id)

        for i in range(months - 1, -1, -1):
            month_date = current_date - timedelta(days=i * 30)
            month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)

            # 该月新增课程数
            courses_result = await db.execute(
                select(func.count()).select_from(Course).where(
                    *course_filters,
                    Course.created_at >= month_start,
                    Course.created_at <= month_end
                )
            )
            courses_count = courses_result.scalar() or 0

            # 该月新增学生数
            students_result = await db.execute(
                select(func.count()).select_from(Student).where(
                    *student_filters,
                    Student.created_at >= month_start,
                    Student.created_at <= month_end
                )
            )
            students_count = students_result.scalar() or 0

            # 该月新增教案数
            lesson_plans_result = await db.execute(
                select(func.count()).select_from(LessonPlan).where(
                    *lesson_plan_filters,
                    LessonPlan.created_at >= month_start,
                    LessonPlan.created_at <= month_end
                )
            )
            lesson_plans_count = lesson_plans_result.scalar() or 0

            trends.append({
                "month": month_date.strftime("%Y年%m月"),
                "newCourses": courses_count,
                "newStudents": students_count,
                "newLessonPlans": lesson_plans_count
            })

        return trends
