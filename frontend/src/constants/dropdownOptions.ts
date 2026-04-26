export interface DropdownGroupMeta {
  key: string
  label: string
  allowCustomValue?: boolean
}

export const DROPDOWN_GROUPS: DropdownGroupMeta[] = [
  { key: 'student_gender', label: '学生性别' },
  { key: 'student_grade', label: '学生年级' },
  { key: 'student_class', label: '学生班级' },
  { key: 'student_status', label: '学生状态' },
  { key: 'course_subject', label: '课程学科' },
  { key: 'course_grade', label: '课程年级' },
  { key: 'course_status', label: '课程状态' },
  { key: 'lesson_plan_subject', label: '教案学科' },
  { key: 'lesson_plan_grade', label: '教案年级' },
  { key: 'portfolio_record_type', label: '档案记录类型' },
  { key: 'resource_tag', label: '资源标签' },
]

export const DROPDOWN_GROUP_MAP = Object.fromEntries(
  DROPDOWN_GROUPS.map((group) => [group.key, group])
) as Record<string, DropdownGroupMeta>
