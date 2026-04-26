/**
 * 表单相关类型定义
 */

/**
 * 教案表单数据接口
 */
export interface LessonPlanFormData {
  title: string;
  subject: string;
  grade: string;
  duration: number;
  teaching_objectives?: string;
  teaching_content?: string;
  teaching_methods?: string;
  teaching_process?: string;
  teaching_resources?: string;
  notes?: string;
}

/**
 * 基本设置表单数据接口
 */
export interface BasicSettingsFormData {
  schoolName: string;
  contactEmail?: string;
  contactPhone?: string;
}

/**
 * 通知设置表单数据接口
 */
export interface NotificationSettingsFormData {
  emailNotification: boolean;
  systemNotification: boolean;
  smsNotification: boolean;
}

/**
 * 安全设置表单数据接口
 */
export interface SecuritySettingsFormData {
  strongPassword: boolean;
  twoFactorAuth: boolean;
  sessionTimeout: number;
}

/**
 * 完整设置表单数据接口
 */
export interface SettingsFormData extends BasicSettingsFormData, NotificationSettingsFormData, SecuritySettingsFormData {}
