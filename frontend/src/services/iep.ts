import api from './api';
import { toItem, toListResponse } from './response';

/**
 * 个别化教育计划（IEP）与发展领域评估模板 类型与 API
 */

export type IEPStatusValue = 'draft' | 'review' | 'locked';
export type GoalStatusValue = 'not_started' | 'in_progress' | 'achieved' | 'maintain';

// ---------------- 评估模板 ----------------

export interface AssessmentItem {
  id?: string;
  name: string;
  observation?: string | null;
  level_anchors?: Record<string, string> | null;
  sort_order: number;
}

export interface AssessmentDomain {
  id?: string;
  code?: string | null;
  name: string;
  sort_order: number;
  items: AssessmentItem[];
}

export interface AssessmentTemplate {
  id: string;
  name: string;
  is_default: boolean;
  domains: AssessmentDomain[];
  created_at: string;
  updated_at: string;
}

export type TemplateCreatePayload = Pick<
  AssessmentTemplate,
  'name' | 'is_default' | 'domains'
>;
export type TemplateUpdatePayload = Partial<
  Pick<AssessmentTemplate, 'name' | 'is_default' | 'domains'>
>;

// ---------------- IEP 评估快照 ----------------

export interface SnapshotItem {
  id?: string;
  item_name: string;
  level: number | null;
  note?: string | null;
  sort_order: number;
}

export interface DomainAssessment {
  id?: string;
  domain_code?: string | null;
  domain_name: string;
  overall_level: number | null;
  summary?: string | null;
  sort_order: number;
  items: SnapshotItem[];
}

// ---------------- IEP 目标 ----------------

export interface ShortTermGoal {
  id?: string;
  condition?: string | null;
  behavior: string;
  criterion?: string | null;
  support_level: number | null;
  status: GoalStatusValue;
  teaching_methods?: string[] | null;
  materials?: string[] | null;
  sort_order: number;
}

export interface LongTermGoal {
  id?: string;
  domain_code?: string | null;
  domain_name?: string | null;
  goal: string;
  sort_order: number;
  short_term_goals: ShortTermGoal[];
}

export interface IEPSupports {
  teaching: string[];
  rehab: string[];
  family: string[];
}

export interface IEP {
  id: string;
  student_id: string;
  student_name?: string | null;
  term: string;
  status: IEPStatusValue;
  parent_id?: string | null;
  revision_no: number;
  student_profile?: string | null;
  supports?: IEPSupports | null;
  evaluation_plan?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  domain_assessments: DomainAssessment[];
  long_term_goals: LongTermGoal[];
  created_at: string;
  updated_at: string;
}

export interface IEPSummary {
  id: string;
  student_id: string;
  student_name?: string | null;
  term: string;
  status: IEPStatusValue;
  revision_no: number;
  parent_id?: string | null;
  long_term_goal_count: number;
  short_term_goal_count: number;
  created_at: string;
  updated_at: string;
}

export interface IEPListResponse {
  data: IEPSummary[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface IEPQueryParams {
  page?: number;
  page_size?: number;
  student_id?: string;
  status?: IEPStatusValue;
  term?: string;
  search?: string;
}

export type IEPCreatePayload = Pick<IEP, 'student_id' | 'term'> &
  Partial<
    Pick<
      IEP,
      | 'student_profile'
      | 'supports'
      | 'evaluation_plan'
      | 'domain_assessments'
      | 'long_term_goals'
    >
  >;

export type IEPUpdatePayload = Partial<
  Pick<
    IEP,
    | 'term'
    | 'student_profile'
    | 'supports'
    | 'evaluation_plan'
    | 'domain_assessments'
    | 'long_term_goals'
  >
>;

// ============================================================
// 评估模板 API
// ============================================================

export const listTemplates = async (): Promise<AssessmentTemplate[]> => {
  const resp = await api.get('/iep-templates');
  return toItem<AssessmentTemplate[]>(
    (resp as unknown as { data: AssessmentTemplate[] }).data
  );
};

export const getDefaultTemplate = async (): Promise<AssessmentTemplate> => {
  const resp = await api.get('/iep-templates/default');
  return toItem<AssessmentTemplate>(resp);
};

export const createTemplate = async (
  data: TemplateCreatePayload
): Promise<AssessmentTemplate> => {
  const resp = await api.post('/iep-templates', data);
  return toItem<AssessmentTemplate>(resp);
};

export const getTemplate = async (id: string): Promise<AssessmentTemplate> => {
  const resp = await api.get(`/iep-templates/${id}`);
  return toItem<AssessmentTemplate>(resp);
};

export const updateTemplate = async (
  id: string,
  data: TemplateUpdatePayload
): Promise<AssessmentTemplate> => {
  const resp = await api.put(`/iep-templates/${id}`, data);
  return toItem<AssessmentTemplate>(resp);
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await api.delete(`/iep-templates/${id}`);
};

export const resetTemplate = async (id: string): Promise<AssessmentTemplate> => {
  const resp = await api.post(`/iep-templates/${id}/reset`);
  return toItem<AssessmentTemplate>(resp);
};

// ============================================================
// IEP API
// ============================================================

export const listIEPs = async (
  params?: IEPQueryParams
): Promise<IEPListResponse> => {
  const apiParams: Record<string, unknown> = { ...params };
  if (params?.status) {
    apiParams.status_filter = params.status;
    delete apiParams.status;
  }
  const resp = await api.get('/ieps', { params: apiParams });
  return toListResponse<IEPSummary>(resp);
};

export const getIEP = async (id: string): Promise<IEP> => {
  const resp = await api.get(`/ieps/${id}`);
  return toItem<IEP>(resp);
};

export const createIEP = async (data: IEPCreatePayload): Promise<IEP> => {
  const resp = await api.post('/ieps', data);
  return toItem<IEP>(resp);
};

export const updateIEP = async (
  id: string,
  data: IEPUpdatePayload
): Promise<IEP> => {
  const resp = await api.put(`/ieps/${id}`, data);
  return toItem<IEP>(resp);
};

export const deleteIEP = async (id: string): Promise<void> => {
  await api.delete(`/ieps/${id}`);
};

export const submitIEP = async (id: string): Promise<IEP> => {
  const resp = await api.post(`/ieps/${id}/submit`);
  return toItem<IEP>(resp);
};

export const backIEPToDraft = async (id: string): Promise<IEP> => {
  const resp = await api.post(`/ieps/${id}/back-to-draft`);
  return toItem<IEP>(resp);
};

export const lockIEP = async (id: string): Promise<IEP> => {
  const resp = await api.post(`/ieps/${id}/lock`);
  return toItem<IEP>(resp);
};

export const reviseIEP = async (id: string): Promise<IEP> => {
  const resp = await api.post(`/ieps/${id}/revise`);
  return toItem<IEP>(resp);
};

// ============================================================
// AI 文书（草稿，教师人在回路审定）
// ============================================================

export interface AIDomainSummary {
  domain?: string;
  current_level?: string;
  priority?: string;
}

export interface AIShortTermGoal {
  condition?: string;
  behavior?: string;
  criterion?: string;
  support_level?: number;
  teaching_methods?: string[];
  materials?: string[];
  evaluation?: string;
}

export interface AILongTermGoal {
  domain?: string;
  goal?: string;
  short_term_goals?: AIShortTermGoal[];
}

export interface AISupports {
  teaching?: string[];
  rehab?: string[];
  family?: string[];
}

export interface IEPDraftAI {
  domain_summaries?: AIDomainSummary[];
  long_term_goals?: AILongTermGoal[];
  supports?: AISupports;
  evaluation_plan?: string;
  missing_info?: string[];
  ai_disclaimer?: string;
  generation_log_id?: string;
}

export interface AIDomainProgress {
  domain?: string;
  start_level?: number;
  end_level?: number;
  description?: string;
  evidence_refs?: string[];
}

export interface AIGoalsSummary {
  achieved?: string[];
  in_progress?: string[];
  next_term_focus?: string[];
}

export interface GrowthReportAI {
  overview?: string;
  domain_progress?: AIDomainProgress[];
  goals_summary?: AIGoalsSummary;
  highlights?: string[];
  family_suggestions?: string[];
  needs_review?: string[];
  ai_disclaimer?: string;
  generation_log_id?: string;
}

export const generateIEPDraft = async (id: string): Promise<IEPDraftAI> => {
  const resp = await api.post(`/ieps/${id}/generate-draft`);
  return toItem<IEPDraftAI>(resp);
};

export const generateGrowthReport = async (
  id: string
): Promise<GrowthReportAI> => {
  const resp = await api.post(`/ieps/${id}/generate-report`);
  return toItem<GrowthReportAI>(resp);
};

export interface IEPCompareLevel {
  domain_code?: string;
  domain_name: string;
  overall_level: number | null;
}

export interface IEPCompare {
  previous_term: string | null;
  current_term: string;
  previous: IEPCompareLevel[];
  current: IEPCompareLevel[];
}

export const getIEPCompare = async (id: string): Promise<IEPCompare> => {
  const resp = await api.get(`/ieps/${id}/compare`);
  return toItem<IEPCompare>(resp);
};
