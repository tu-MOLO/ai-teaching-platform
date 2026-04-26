export interface Student {
  id: string;
  name: string;
  gender: string;
  birth_date: string;
  grade: string;
  class_name: string;
  avatar?: string;
  parent_contact?: string;
  is_active?: boolean;
  enrollment_date?: string;
  age?: number;
  progress?: number;
  created_at: string;
  updated_at: string;
}

export interface StudentCreate {
  name: string;
  gender: string;
  birth_date: string;
  grade: string;
  class_name: string;
  avatar?: string;
  parent_contact?: string;
  is_active?: boolean;
  enrollment_date?: string;
}

export interface StudentUpdate {
  name?: string;
  gender?: string;
  birth_date?: string;
  grade?: string;
  class_name?: string;
  avatar?: string;
  parent_contact?: string;
  is_active?: boolean;
  enrollment_date?: string;
}
