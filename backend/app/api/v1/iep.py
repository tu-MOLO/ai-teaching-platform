"""
个别化教育计划（IEP）与发展领域评估模板 API
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.core.exceptions import NotFoundException
from app.core.security import get_current_user_id_with_version_check
from app.models.iep import IEPStatus
from app.schemas.base import DataResponse, ListResponse
from app.schemas.iep import (
    AssessmentTemplateCreate,
    AssessmentTemplateResponse,
    AssessmentTemplateUpdate,
    IEPCreate,
    IEPResponse,
    IEPSummaryResponse,
    IEPUpdate,
)
from app.services.export import ExportService
from app.services.iep import AssessmentTemplateService, IEPService
from app.services.iep_ai import IEPAIService

DBSession = Annotated[AsyncSession, Depends(get_async_session)]
CurrentUser = Annotated[str, Depends(get_current_user_id_with_version_check)]


# ============================================================
# 评估模板
# ============================================================

templates_router = APIRouter(tags=["IEP评估模板"])


@templates_router.get("", response_model=ListResponse[AssessmentTemplateResponse])
async def list_templates(db: DBSession, user_id: CurrentUser):
    service = AssessmentTemplateService(db)
    items = await service.list_templates(user_id)
    return ListResponse(data=items, total=len(items), page=1, page_size=len(items) or 1, pages=1)


@templates_router.get("/default", response_model=DataResponse[AssessmentTemplateResponse])
async def get_default_template(db: DBSession, user_id: CurrentUser):
    service = AssessmentTemplateService(db)
    template = await service.get_or_create_default(user_id)
    return DataResponse(data=template)


@templates_router.post(
    "",
    response_model=DataResponse[AssessmentTemplateResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_template(data: AssessmentTemplateCreate, db: DBSession, user_id: CurrentUser):
    service = AssessmentTemplateService(db)
    template = await service.create(user_id, data)
    return DataResponse(data=template)


@templates_router.get("/{template_id}", response_model=DataResponse[AssessmentTemplateResponse])
async def get_template(template_id: str, db: DBSession, user_id: CurrentUser):
    service = AssessmentTemplateService(db)
    template = await service.get(template_id, user_id)
    if not template:
        raise NotFoundException("评估模板", template_id)
    return DataResponse(data=template)


@templates_router.put("/{template_id}", response_model=DataResponse[AssessmentTemplateResponse])
async def update_template(
    template_id: str,
    data: AssessmentTemplateUpdate,
    db: DBSession,
    user_id: CurrentUser,
):
    service = AssessmentTemplateService(db)
    template = await service.update(template_id, user_id, data)
    if not template:
        raise NotFoundException("评估模板", template_id)
    return DataResponse(data=template)


@templates_router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(template_id: str, db: DBSession, user_id: CurrentUser):
    service = AssessmentTemplateService(db)
    if not await service.delete(template_id, user_id):
        raise NotFoundException("评估模板", template_id)


@templates_router.post(
    "/{template_id}/reset", response_model=DataResponse[AssessmentTemplateResponse]
)
async def reset_template(template_id: str, db: DBSession, user_id: CurrentUser):
    service = AssessmentTemplateService(db)
    template = await service.reset_to_default(template_id, user_id)
    if not template:
        raise NotFoundException("评估模板", template_id)
    return DataResponse(data=template)


# ============================================================
# IEP 计划
# ============================================================

iep_router = APIRouter(tags=["个别化教育计划IEP"])


@iep_router.post("", response_model=DataResponse[IEPResponse], status_code=status.HTTP_201_CREATED)
async def create_iep(data: IEPCreate, db: DBSession, user_id: CurrentUser):
    service = IEPService(db)
    iep = await service.create(user_id, data)
    return DataResponse(data=iep)


@iep_router.get("", response_model=ListResponse[IEPSummaryResponse])
async def list_ieps(
    db: DBSession,
    user_id: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    student_id: Optional[str] = Query(None, description="按学生筛选"),
    status_filter: Optional[IEPStatus] = Query(None, description="按状态筛选"),
    term: Optional[str] = Query(None, description="按学期筛选"),
    search: Optional[str] = Query(None, description="学期关键词"),
):
    service = IEPService(db)
    skip = (page - 1) * page_size
    items = await service.get_list(
        user_id,
        skip=skip,
        limit=page_size,
        student_id=student_id,
        status_filter=status_filter,
        term=term,
        search=search,
    )
    total = await service.count(
        user_id,
        student_id=student_id,
        status_filter=status_filter,
        term=term,
        search=search,
    )
    pages = (total + page_size - 1) // page_size
    return ListResponse(data=items, total=total, page=page, page_size=page_size, pages=pages)


@iep_router.get("/{iep_id}", response_model=DataResponse[IEPResponse])
async def get_iep(iep_id: str, db: DBSession, user_id: CurrentUser):
    service = IEPService(db)
    iep = await service.get_by_id(iep_id, user_id)
    if not iep:
        raise NotFoundException("IEP", iep_id)
    return DataResponse(data=iep)


@iep_router.put("/{iep_id}", response_model=DataResponse[IEPResponse])
async def update_iep(iep_id: str, data: IEPUpdate, db: DBSession, user_id: CurrentUser):
    service = IEPService(db)
    iep = await service.update(iep_id, user_id, data)
    if not iep:
        raise NotFoundException("IEP", iep_id)
    return DataResponse(data=iep)


@iep_router.delete("/{iep_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_iep(iep_id: str, db: DBSession, user_id: CurrentUser):
    service = IEPService(db)
    if not await service.delete(iep_id, user_id):
        raise NotFoundException("IEP", iep_id)


@iep_router.post("/{iep_id}/submit", response_model=DataResponse[IEPResponse])
async def submit_iep(iep_id: str, db: DBSession, user_id: CurrentUser):
    service = IEPService(db)
    iep = await service.submit(iep_id, user_id)
    if not iep:
        raise NotFoundException("IEP", iep_id)
    return DataResponse(data=iep)


@iep_router.post("/{iep_id}/back-to-draft", response_model=DataResponse[IEPResponse])
async def back_iep_to_draft(iep_id: str, db: DBSession, user_id: CurrentUser):
    service = IEPService(db)
    iep = await service.back_to_draft(iep_id, user_id)
    if not iep:
        raise NotFoundException("IEP", iep_id)
    return DataResponse(data=iep)


@iep_router.post("/{iep_id}/lock", response_model=DataResponse[IEPResponse])
async def lock_iep(iep_id: str, db: DBSession, user_id: CurrentUser):
    service = IEPService(db)
    iep = await service.lock(iep_id, user_id)
    if not iep:
        raise NotFoundException("IEP", iep_id)
    return DataResponse(data=iep)


@iep_router.post("/{iep_id}/revise", response_model=DataResponse[IEPResponse])
async def revise_iep(iep_id: str, db: DBSession, user_id: CurrentUser):
    service = IEPService(db)
    iep = await service.revise(iep_id, user_id)
    if not iep:
        raise NotFoundException("IEP", iep_id)
    return DataResponse(data=iep)


@iep_router.get("/{iep_id}/export")
async def export_iep(iep_id: str, db: DBSession, user_id: CurrentUser):
    """导出 IEP 为 PDF（建议在定稿后导出）。"""
    service = IEPService(db)
    iep = await service.get_by_id(iep_id, user_id)
    if not iep:
        raise NotFoundException("IEP", iep_id)
    pdf_bytes = ExportService().export_iep_to_pdf(iep)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": (f'attachment; filename="iep-{iep_id}.pdf"')},
    )


@iep_router.post("/{iep_id}/generate-draft", response_model=DataResponse[dict])
async def generate_iep_draft(iep_id: str, db: DBSession, user_id: CurrentUser):
    """AI 依据教师评估起草 IEP 目标与措施草稿（不自动写入，需教师逐条采纳）。"""
    parsed, log_id = await IEPAIService(db).generate_draft(iep_id, user_id)
    return DataResponse(data={**parsed, "generation_log_id": log_id})


@iep_router.post("/{iep_id}/generate-report", response_model=DataResponse[dict])
async def generate_iep_report(iep_id: str, db: DBSession, user_id: CurrentUser):
    """AI 生成学期成长报告草稿（结论须带证据，教师审定后给家长）。"""
    parsed, log_id = await IEPAIService(db).generate_report(iep_id, user_id)
    return DataResponse(data={**parsed, "generation_log_id": log_id})


@iep_router.get("/{iep_id}/compare", response_model=DataResponse[dict])
async def compare_iep_versions(iep_id: str, db: DBSession, user_id: CurrentUser):
    """期初/期末（上一版本 vs 当前版本）六领域整体级别对比。"""
    data = await IEPService(db).get_comparison(iep_id, user_id)
    if data is None:
        raise NotFoundException("IEP", iep_id)
    return DataResponse(data=data)
