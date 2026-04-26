export interface PortfolioItem {
  id: string;
  student_id: string;
  type: 'work' | 'evaluation' | 'observation' | 'milestone';
  title: string;
  content?: string;
  attachments?: string;
  cognitive_score?: number;
  skill_score?: number;
  creativity_score?: number;
  cooperation_score?: number;
  attention_score?: number;
  created_at: string;
  updated_at: string;
}

export interface PortfolioItemCreate {
  student_id: string;
  type: 'work' | 'evaluation' | 'observation' | 'milestone';
  title: string;
  content?: string;
  attachments?: string;
  cognitive_score?: number;
  skill_score?: number;
  creativity_score?: number;
  cooperation_score?: number;
  attention_score?: number;
}

export interface PortfolioItemUpdate {
  student_id?: string;
  type?: 'work' | 'evaluation' | 'observation' | 'milestone';
  title?: string;
  content?: string;
  attachments?: string;
  cognitive_score?: number;
  skill_score?: number;
  creativity_score?: number;
  cooperation_score?: number;
  attention_score?: number;
}
