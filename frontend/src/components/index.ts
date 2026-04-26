/**
 * 组件库入口文件
 *
 * 统一导出所有组件及其类型定义，方便在项目中统一导入使用。
 *
 * @example
 * ```tsx
 * // 导入单个组件
 * import { CourseForm, CourseFormData } from '@/components';
 *
 * // 导入多个组件
 * import {
 *   CourseForm,
 *   StudentForm,
 *   ResourceCard,
 *   TagFilter
 * } from '@/components';
 * ```
 *
 * @module Components
 */

// ==================== Courses 课程管理组件 ====================

/**
 * 课程表单组件 - 用于创建和编辑课程信息
 * @see {@link ./Courses/CourseForm}
 */
export { default as CourseForm } from './Courses/CourseForm';
export type { CourseFormData } from './Courses/CourseForm';

// ==================== Students 学生管理组件 ====================

/**
 * 学生表单组件 - 用于创建和编辑学生信息
 * @see {@link ./Students/StudentForm}
 */
export { default as StudentForm } from './Students/StudentForm';
export type { StudentFormData } from './Students/StudentForm';

// ==================== Portfolio 学生档案组件 ====================

/**
 * 能力雷达图组件 - 展示学生能力发展的可视化图表
 * @see {@link ./Portfolio/AbilityRadar}
 */
export { default as AbilityRadar } from './Portfolio/AbilityRadar';
export type { AbilityData } from './Portfolio/AbilityRadar';

/**
 * 时间轴项目组件 - 展示档案时间轴中的单个记录项
 * @see {@link ./Portfolio/TimelineItem}
 */
export { default as TimelineItem } from './Portfolio/TimelineItem';
export type { TimelineItemProps } from './Portfolio/TimelineItem';

/**
 * 学生卡片组件 - 展示学生基本信息
 * @see {@link ./Portfolio/StudentCard}
 */
export { default as StudentCard } from './Portfolio/StudentCard';
export type { StudentCardProps } from './Portfolio/StudentCard';

/**
 * 评价表单组件 - 用于对学生作品进行多维度评价
 * @see {@link ./Portfolio/EvaluationForm}
 */
export { default as EvaluationForm } from './Portfolio/EvaluationForm';
export type {
  EvaluationDimension,
  EvaluationFormProps,
} from './Portfolio/EvaluationForm';

// ==================== ResourceCenter 资源中心组件 ====================

/**
 * 文件上传组件 - 支持拖拽和点击选择文件上传
 * @see {@link ./ResourceCenter/FileUpload}
 */
export { default as FileUpload } from './ResourceCenter/FileUpload';
export type { FileUploadProps } from './ResourceCenter/FileUpload';

/**
 * 资源卡片组件 - 展示资源的基本信息
 * @see {@link ./ResourceCenter/ResourceCard}
 */
export { default as ResourceCard } from './ResourceCenter/ResourceCard';
export type { ResourceCardProps } from './ResourceCenter/ResourceCard';

/**
 * 资源预览组件 - 支持多种文件类型的在线预览
 * @see {@link ./ResourceCenter/ResourcePreview}
 */
export { default as ResourcePreview } from './ResourceCenter/ResourcePreview';
export type { ResourcePreviewProps } from './ResourceCenter/ResourcePreview';

/**
 * 标签筛选组件 - 用于资源的标签筛选功能
 * @see {@link ./ResourceCenter/TagFilter}
 */
export { default as TagFilter } from './ResourceCenter/TagFilter';
export type {
  ExtendedTag,
  TagFilterProps,
} from './ResourceCenter/TagFilter';

// ==================== Theme 主题配色组件 ====================

/**
 * 主题设置组件 - 完整的配色自定义功能入口
 * @see {@link ./Theme/ThemeSettings}
 */
export { default as ThemeSettings } from './Theme/ThemeSettings';

/**
 * 颜色选择器组件 - 支持HEX/RGB格式的颜色选择
 * @see {@link ./Theme/ColorPicker}
 */
export { default as ColorPicker } from './Theme/ColorPicker';

/**
 * 颜色变量编辑器组件 - 编辑CSS颜色变量
 * @see {@link ./Theme/ColorVariableEditor}
 */
export { default as ColorVariableEditor } from './Theme/ColorVariableEditor';

/**
 * 预设主题卡片组件 - 展示预设配色方案
 * @see {@link ./Theme/PresetThemeCard}
 */
export { default as PresetThemeCard } from './Theme/PresetThemeCard';

/**
 * 主题预览组件 - 实时预览配色效果
 * @see {@link ./Theme/ThemePreview}
 */
export { default as ThemePreview } from './Theme/ThemePreview';

/**
 * 历史控制组件 - 撤销/重做功能
 * @see {@link ./Theme/HistoryControls}
 */
export { default as HistoryControls } from './Theme/HistoryControls';

/**
 * 对比度警告组件 - WCAG可访问性检查
 * @see {@link ./Theme/ContrastWarning}
 */
export { default as ContrastWarning } from './Theme/ContrastWarning';
