"""
导出服务
"""
from typing import Optional
from io import BytesIO
from html import escape


class ExportService:
    """
    导出服务类
    """
    
    def export_to_pdf(self, lesson_plan) -> bytes:
        """
        导出教案为PDF
        
        Args:
            lesson_plan: 教案对象
        
        Returns:
            PDF文件内容（字节流）
        """
        try:
            from weasyprint import HTML, CSS
        except ImportError:
            raise ImportError("PDF export not supported: WeasyPrint dependencies missing")
        
        # 构建HTML内容
        html_content = self._generate_html(lesson_plan)
        
        # 生成PDF
        css = CSS(string="""
            body {
                font-family: SimHei, Arial, sans-serif;
                margin: 20px;
            }
            h1 {
                color: #333;
                text-align: center;
                margin-bottom: 30px;
            }
            h2 {
                color: #555;
                margin-top: 20px;
                margin-bottom: 10px;
                border-bottom: 1px solid #ddd;
                padding-bottom: 5px;
            }
            p {
                line-height: 1.5;
                margin-bottom: 10px;
            }
            .section {
                margin-bottom: 20px;
            }
            .goal-level {
                margin-left: 20px;
                margin-bottom: 10px;
            }
            .goal-level h3 {
                color: #666;
                margin-bottom: 5px;
            }
        """)
        
        pdf_bytes = HTML(string=html_content).write_pdf(stylesheets=[css])
        return pdf_bytes
    
    def export_to_word(self, lesson_plan) -> bytes:
        """
        导出教案为Word
        
        Args:
            lesson_plan: 教案对象
        
        Returns:
            Word文件内容（字节流）
        """
        try:
            from docx import Document
            from docx.shared import Inches
        except ImportError:
            raise ImportError("Word export not supported: python-docx dependencies missing")
        
        doc = Document()
        
        # 添加标题
        doc.add_heading(lesson_plan.title, 0)
        
        # 添加基本信息
        doc.add_heading('基本信息', level=1)
        doc.add_paragraph(f'学科: {escape(lesson_plan.subject or "")}')
        doc.add_paragraph(f'年级: {escape(lesson_plan.grade or "")}')
        doc.add_paragraph(f'课时时长: {lesson_plan.duration}分钟')
        doc.add_paragraph(f'状态: {lesson_plan.status.value}')
        
        # 添加教学目标
        doc.add_heading('教学目标', level=1)
        if lesson_plan.teaching_goals_a:
            doc.add_heading('A层（基础）', level=2)
            doc.add_paragraph(escape(lesson_plan.teaching_goals_a or ''))
        if lesson_plan.teaching_goals_b:
            doc.add_heading('B层（提高）', level=2)
            doc.add_paragraph(escape(lesson_plan.teaching_goals_b or ''))
        if lesson_plan.teaching_goals_c:
            doc.add_heading('C层（拓展）', level=2)
            doc.add_paragraph(escape(lesson_plan.teaching_goals_c or ''))
        
        # 添加教学内容
        if lesson_plan.teaching_content:
            doc.add_heading('教学内容', level=1)
            doc.add_paragraph(escape(lesson_plan.teaching_content or ''))
        
        # 添加教学方法
        if lesson_plan.teaching_methods:
            doc.add_heading('教学方法', level=1)
            doc.add_paragraph(escape(lesson_plan.teaching_methods or ''))
        
        # 添加教学过程
        if lesson_plan.teaching_process:
            doc.add_heading('教学过程', level=1)
            doc.add_paragraph(escape(lesson_plan.teaching_process or ''))
        
        # 添加教学资源
        if lesson_plan.teaching_resources:
            doc.add_heading('教学资源', level=1)
            doc.add_paragraph(escape(lesson_plan.teaching_resources or ''))
        
        # 添加评价方式
        if lesson_plan.assessment:
            doc.add_heading('评价方式', level=1)
            doc.add_paragraph(escape(lesson_plan.assessment or ''))
        
        # 添加备注
        if lesson_plan.notes:
            doc.add_heading('备注', level=1)
            doc.add_paragraph(escape(lesson_plan.notes or ''))
        
        # 保存为字节流
        stream = BytesIO()
        doc.save(stream)
        stream.seek(0)
        return stream.getvalue()
    
    def _generate_html(self, lesson_plan) -> str:
        """
        生成HTML内容
        
        Args:
            lesson_plan: 教案对象
        
        Returns:
            HTML字符串
        """
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>{escape(lesson_plan.title or '')}</title>
        </head>
        <body>
            <h1>{escape(lesson_plan.title or '')}</h1>
            
            <div class="section">
                <h2>基本信息</h2>
                <p>学科: {escape(lesson_plan.subject or '')}</p>
                <p>年级: {escape(lesson_plan.grade or '')}</p>
                <p>课时时长: {lesson_plan.duration}分钟</p>
                <p>状态: {escape(str(lesson_plan.status.value))}</p>
            </div>
            
            <div class="section">
                <h2>教学目标</h2>
        """
        
        # 添加分层教学目标
        if lesson_plan.teaching_goals_a:
            html += f"""
                <div class="goal-level">
                    <h3>A层（基础）</h3>
                    <p>{escape(lesson_plan.teaching_goals_a or '')}</p>
                </div>
            """
        
        if lesson_plan.teaching_goals_b:
            html += f"""
                <div class="goal-level">
                    <h3>B层（提高）</h3>
                    <p>{escape(lesson_plan.teaching_goals_b or '')}</p>
                </div>
            """
        
        if lesson_plan.teaching_goals_c:
            html += f"""
                <div class="goal-level">
                    <h3>C层（拓展）</h3>
                    <p>{escape(lesson_plan.teaching_goals_c or '')}</p>
                </div>
            """
        
        # 添加其他内容
        sections = [
            ('教学内容', lesson_plan.teaching_content),
            ('教学方法', lesson_plan.teaching_methods),
            ('教学过程', lesson_plan.teaching_process),
            ('教学资源', lesson_plan.teaching_resources),
            ('评价方式', lesson_plan.assessment),
            ('备注', lesson_plan.notes)
        ]
        
        for section_name, content in sections:
            if content:
                html += f"""
            <div class="section">
                <h2>{section_name}</h2>
                <p>{escape(content or '')}</p>
            </div>
        """
        
        html += """
        </body>
        </html>
        """
        
        return html
    
    def export_student_portfolio_to_pdf(self, student, portfolios) -> bytes:
        """
        导出学生成长报告为PDF
        
        Args:
            student: 学生对象
            portfolios: 学生的成长档案列表
        
        Returns:
            PDF文件内容（字节流）
        """
        try:
            from weasyprint import HTML, CSS
        except ImportError:
            raise ImportError("PDF export not supported: WeasyPrint dependencies missing")
        
        # 构建HTML内容
        html_content = self._generate_portfolio_html(student, portfolios)
        
        # 生成PDF
        css = CSS(string="""
            body {
                font-family: SimHei, Arial, sans-serif;
                margin: 20px;
            }
            h1 {
                color: #333;
                text-align: center;
                margin-bottom: 30px;
            }
            h2 {
                color: #555;
                margin-top: 30px;
                margin-bottom: 15px;
                border-bottom: 1px solid #ddd;
                padding-bottom: 5px;
            }
            h3 {
                color: #666;
                margin-top: 20px;
                margin-bottom: 10px;
            }
            p {
                line-height: 1.5;
                margin-bottom: 10px;
            }
            .section {
                margin-bottom: 20px;
            }
            .student-info {
                background-color: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 30px;
            }
            .portfolio-item {
                border: 1px solid #ddd;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 15px;
            }
            .portfolio-title {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 5px;
            }
            .portfolio-meta {
                font-size: 14px;
                color: #666;
                margin-bottom: 10px;
            }
            .evaluation-scores {
                margin-top: 10px;
                padding: 10px;
                background-color: #f9f9f9;
                border-radius: 5px;
            }
            .score-item {
                display: inline-block;
                margin-right: 20px;
                margin-bottom: 5px;
            }
            .score-label {
                font-weight: bold;
                margin-right: 5px;
            }
        """)
        
        pdf_bytes = HTML(string=html_content).write_pdf(stylesheets=[css])
        return pdf_bytes
    
    def _generate_portfolio_html(self, student, portfolios) -> str:
        """
        生成学生成长报告的HTML内容
        
        Args:
            student: 学生对象
            portfolios: 学生的成长档案列表
        
        Returns:
            HTML字符串
        """
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>{escape(student.name or '')}的成长报告</title>
        </head>
        <body>
            <h1>{escape(student.name or '')}的成长报告</h1>
            
            <div class="student-info">
                <h2>学生基本信息</h2>
                <p>姓名: {escape(student.name or '')}</p>
                <p>性别: {escape(student.gender or '')}</p>
                <p>出生日期: {student.birth_date}</p>
                <p>年级: {escape(student.grade or '')}</p>
                <p>班级: {escape(student.class_name or '')}</p>
                <p>家长联系方式: {escape(student.parent_contact or '未提供')}</p>
            </div>
        """
        
        # 按类型分组成长档案
        portfolios_by_type = {}
        for portfolio in portfolios:
            if portfolio.type not in portfolios_by_type:
                portfolios_by_type[portfolio.type] = []
            portfolios_by_type[portfolio.type].append(portfolio)
        
        # 类型名称映射
        type_names = {
            'work': '作品',
            'evaluation': '评价',
            'observation': '观察',
            'milestone': '里程碑'
        }
        
        # 添加各类型的成长档案
        for type_key, type_portfolios in portfolios_by_type.items():
            type_name = type_names.get(type_key, type_key)
            html += f"""
            <div class="section">
                <h2>{escape(type_name)}</h2>
            """
            
            for portfolio in type_portfolios:
                html += f"""
                <div class="portfolio-item">
                    <div class="portfolio-title">{escape(portfolio.title or '')}</div>
                    <div class="portfolio-meta">创建时间: {portfolio.created_at.strftime('%Y-%m-%d %H:%M:%S')}</div>
                    {f'<p>{escape(portfolio.content or "")}</p>' if portfolio.content else ''}
                """
                
                # 添加评价分数
                if any([portfolio.cognitive_score, portfolio.skill_score, portfolio.creativity_score, portfolio.cooperation_score, portfolio.attention_score]):
                    html += f"""
                    <div class="evaluation-scores">
                        <h3>多维度评价</h3>
                    """
                    
                    scores = [
                        ('认知', portfolio.cognitive_score),
                        ('技能', portfolio.skill_score),
                        ('创意', portfolio.creativity_score),
                        ('合作', portfolio.cooperation_score),
                        ('注意力', portfolio.attention_score)
                    ]
                    
                    for score_name, score_value in scores:
                        if score_value is not None:
                            html += f"<div class='score-item'><span class='score-label'>{score_name}:</span>{score_value}</div>"
                    
                    html += "</div>"
                
                html += "</div>"
            
            html += "</div>"
        
        html += """
        </body>
        </html>
        """
        
        return html
