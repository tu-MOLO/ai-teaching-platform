from datetime import datetime
from types import SimpleNamespace

from app.services.export import ExportService


def _make_lesson_plan(**overrides) -> SimpleNamespace:
    defaults = dict(
        title="测试教案",
        subject="数学",
        grade="三年级",
        duration=45,
        status=SimpleNamespace(value="draft"),
        teaching_goals_a="基础目标",
        teaching_goals_b="提高目标",
        teaching_goals_c="拓展目标",
        teaching_objectives="总体教学目标",
        teaching_content="教学内容文本",
        teaching_methods="教学方法文本",
        teaching_process="教学过程文本",
        teaching_resources="教学资源文本",
        assessment="评价方式文本",
        notes="备注文本",
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_student(**overrides) -> SimpleNamespace:
    defaults = dict(
        name="张三",
        gender="male",
        birth_date="2015-05-10",
        grade="三年级",
        class_name="1班",
        parent_contact="13800138000",
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_portfolio(**overrides) -> SimpleNamespace:
    defaults = dict(
        type="work",
        title="作品一",
        content="作品内容",
        created_at=datetime(2024, 6, 15, 10, 30, 0),
        cognitive_score=None,
        skill_score=None,
        creativity_score=None,
        cooperation_score=None,
        attention_score=None,
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


class TestExportToWord:
    def test_generates_valid_docx_bytes(self):
        service = ExportService()
        lp = _make_lesson_plan()
        result = service.export_to_word(lp)
        assert isinstance(result, bytes)
        assert len(result) > 0
        assert result[:2] == b"PK"

    def test_docx_contains_title(self):
        from docx import Document
        from io import BytesIO

        service = ExportService()
        lp = _make_lesson_plan(title="特殊教案标题")
        result = service.export_to_word(lp)
        doc = Document(BytesIO(result))
        assert doc.paragraphs[0].text == "特殊教案标题"

    def test_docx_with_none_optional_fields(self):
        service = ExportService()
        lp = _make_lesson_plan(
            teaching_content=None,
            teaching_methods=None,
            teaching_process=None,
            teaching_resources=None,
            assessment=None,
            notes=None,
        )
        result = service.export_to_word(lp)
        assert isinstance(result, bytes)
        assert len(result) > 0


class TestGenerateHtml:
    def test_generates_html_with_all_sections(self):
        service = ExportService()
        lp = _make_lesson_plan()
        html = service._generate_html(lp)
        assert "<!DOCTYPE html>" in html
        assert "测试教案" in html
        assert "数学" in html
        assert "三年级" in html
        assert "45分钟" in html
        assert "draft" in html
        assert "A层（基础）" in html
        assert "B层（提高）" in html
        assert "C层（拓展）" in html
        assert "教学内容" in html
        assert "教学方法" in html
        assert "教学过程" in html
        assert "教学资源" in html
        assert "评价方式" in html
        assert "备注" in html

    def test_handles_none_fields(self):
        service = ExportService()
        lp = _make_lesson_plan(
            teaching_goals_a=None,
            teaching_goals_b=None,
            teaching_goals_c=None,
            teaching_content=None,
            teaching_methods=None,
            teaching_process=None,
            teaching_resources=None,
            assessment=None,
            notes=None,
        )
        html = service._generate_html(lp)
        assert "A层" not in html
        assert "B层" not in html
        assert "C层" not in html
        assert "教学内容" not in html
        assert "教学方法" not in html
        assert "教学过程" not in html

    def test_html_escapes_special_chars(self):
        service = ExportService()
        lp = _make_lesson_plan(title="<script>alert('xss')</script>")
        html = service._generate_html(lp)
        assert "<script>" not in html
        assert "&lt;script&gt;" in html

    def test_html_contains_status_value(self):
        service = ExportService()
        lp = _make_lesson_plan(status=SimpleNamespace(value="published"))
        html = service._generate_html(lp)
        assert "published" in html


class TestBuildLessonPlanLines:
    def test_generates_text_lines(self):
        service = ExportService()
        lp = _make_lesson_plan()
        lines = service._build_lesson_plan_lines(lp)
        assert isinstance(lines, list)
        assert any("测试教案" in line for line in lines)
        assert any("数学" in line for line in lines)
        assert any("三年级" in line for line in lines)
        assert any("45" in line for line in lines)
        assert any("教学目标" in line for line in lines)
        assert any("教学内容" in line for line in lines)
        assert any("教学方法" in line for line in lines)
        assert any("教学过程" in line for line in lines)
        assert any("教学资源" in line for line in lines)
        assert any("备注" in line for line in lines)

    def test_none_fields_show_default(self):
        service = ExportService()
        lp = _make_lesson_plan(
            teaching_objectives=None,
            teaching_content=None,
            teaching_methods=None,
        )
        lines = service._build_lesson_plan_lines(lp)
        assert any("无" in line for line in lines)

    def test_status_uses_value_attribute(self):
        service = ExportService()
        lp = _make_lesson_plan(status=SimpleNamespace(value="published"))
        lines = service._build_lesson_plan_lines(lp)
        assert any("published" in line for line in lines)


class TestBuildPortfolioReportLines:
    def test_generates_text_lines_for_portfolio(self):
        service = ExportService()
        student = _make_student()
        portfolio = _make_portfolio()
        lines = service._build_portfolio_report_lines(student, [portfolio])
        assert any("张三" in line for line in lines)
        assert any("作品一" in line for line in lines)
        assert any("作品" in line for line in lines)

    def test_empty_portfolios(self):
        service = ExportService()
        student = _make_student()
        lines = service._build_portfolio_report_lines(student, [])
        assert any("暂无成长记录" in line for line in lines)

    def test_includes_scores(self):
        service = ExportService()
        student = _make_student()
        portfolio = _make_portfolio(
            cognitive_score=85,
            skill_score=90,
        )
        lines = service._build_portfolio_report_lines(student, [portfolio])
        joined = " ".join(lines)
        assert "认知" in joined
        assert "技能" in joined

    def test_student_info_in_lines(self):
        service = ExportService()
        student = _make_student()
        lines = service._build_portfolio_report_lines(student, [])
        joined = " ".join(lines)
        assert "张三" in joined
        assert "male" in joined
        assert "三年级" in joined
        assert "1班" in joined


class TestGeneratePortfolioHtml:
    def test_generates_html_with_student_info(self):
        service = ExportService()
        student = _make_student()
        html = service._generate_portfolio_html(student, [])
        assert "张三" in html
        assert "male" in html
        assert "三年级" in html
        assert "1班" in html
        assert "13800138000" in html

    def test_groups_portfolios_by_type(self):
        service = ExportService()
        student = _make_student()
        portfolios = [
            _make_portfolio(type="work", title="作品A"),
            _make_portfolio(type="evaluation", title="评价B"),
            _make_portfolio(type="work", title="作品C"),
        ]
        html = service._generate_portfolio_html(student, portfolios)
        assert "作品" in html
        assert "评价" in html
        assert "作品A" in html
        assert "评价B" in html
        assert "作品C" in html

    def test_includes_evaluation_scores(self):
        service = ExportService()
        student = _make_student()
        portfolio = _make_portfolio(
            cognitive_score=85,
            skill_score=90,
            creativity_score=78,
            cooperation_score=88,
            attention_score=92,
        )
        html = service._generate_portfolio_html(student, [portfolio])
        assert "多维度评价" in html
        assert "认知" in html
        assert "技能" in html
        assert "创意" in html
        assert "合作" in html
        assert "注意力" in html

    def test_no_scores_no_evaluation_section(self):
        service = ExportService()
        student = _make_student()
        portfolio = _make_portfolio()
        html = service._generate_portfolio_html(student, [portfolio])
        assert "多维度评价" not in html

    def test_content_rendered_when_present(self):
        service = ExportService()
        student = _make_student()
        portfolio = _make_portfolio(content="这是作品内容")
        html = service._generate_portfolio_html(student, [portfolio])
        assert "这是作品内容" in html

    def test_content_absent_no_paragraph(self):
        service = ExportService()
        student = _make_student()
        portfolio = _make_portfolio(content=None)
        html = service._generate_portfolio_html(student, [portfolio])
        assert "<p></p>" not in html.replace("\n", "").replace(" ", "")

    def test_type_name_mapping(self):
        service = ExportService()
        student = _make_student()
        portfolios = [
            _make_portfolio(type="milestone", title="里程碑项"),
            _make_portfolio(type="observation", title="观察项"),
        ]
        html = service._generate_portfolio_html(student, portfolios)
        assert "里程碑" in html
        assert "观察" in html

    def test_unknown_type_uses_raw_key(self):
        service = ExportService()
        student = _make_student()
        portfolio = _make_portfolio(type="custom_type", title="自定义项")
        html = service._generate_portfolio_html(student, [portfolio])
        assert "custom_type" in html

    def test_parent_contact_default(self):
        service = ExportService()
        student = _make_student(parent_contact=None)
        html = service._generate_portfolio_html(student, [])
        assert "未提供" in html
