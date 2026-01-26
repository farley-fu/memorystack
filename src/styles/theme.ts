/**
 * @file theme.ts
 * @description MindMirror 应用主题系统 - 统一的设计常量
 * 
 * 包含：颜色、间距、字体、圆角、阴影、动画时长等设计规范
 * 所有组件应使用这些常量以保持视觉一致性
 */

// ============================================================
// 颜色体系
// ============================================================

/** 品牌色 - 各功能模块的主题色 */
export const colors = {
  primary: {
    event: '#8b5cf6',      // 紫色 - 事件模块
    project: '#3b82f6',    // 蓝色 - 项目模块
    contact: '#10b981',    // 绿色 - 联系人模块
    activity: '#06b6d4',   // 青色 - 活动模块
    file: '#f59e0b',       // 橙色 - 文件模块
  },
  
  /** 语义色 - 状态反馈 */
  semantic: {
    success: '#10b981',    // 成功 - 绿色
    error: '#ef4444',      // 错误 - 红色
    warning: '#f59e0b',    // 警告 - 橙色
    info: '#6366f1',       // 信息 - 靛蓝色
  },
  
  /** 灰度色阶 - 从浅到深 */
  gray: {
    50: '#f9fafb',         // 最浅背景
    100: '#f3f4f6',        // 浅背景
    200: '#e5e7eb',        // 边框色
    300: '#d1d5db',        // 深边框
    400: '#9ca3af',        // 占位符文字
    500: '#6b7280',        // 次要文字
    600: '#4b5563',        // 正文文字
    700: '#374151',        // 标题文字
    800: '#1f2937',        // 深色文字
    900: '#111827',        // 最深文字
  },
  
  /** 背景色 */
  background: {
    primary: '#ffffff',    // 主背景
    secondary: '#f9fafb',  // 次要背景
    tertiary: '#f3f4f6',   // 第三背景
    overlay: 'rgba(0, 0, 0, 0.5)', // 遮罩层
  },
  
  /** 边框色 */
  border: {
    light: '#e5e7eb',      // 浅边框
    medium: '#d1d5db',     // 中等边框
    dark: '#9ca3af',       // 深边框
  },
} as const;

// ============================================================
// 间距系统 (基于 4px 网格)
// ============================================================

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '40px',
  '5xl': '48px',
} as const;

// ============================================================
// 字体系统
// ============================================================

export const typography = {
  /** 字体大小 */
  fontSize: {
    xs: '12px',
    sm: '13px',
    base: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '24px',
  },
  
  /** 字重 */
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  /** 行高 */
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ============================================================
// 圆角系统
// ============================================================

export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '10px',
  '2xl': '12px',
  '3xl': '16px',
  full: '9999px',  // 圆形
} as const;

// ============================================================
// 阴影系统
// ============================================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  lg: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  xl: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  '2xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
} as const;

// ============================================================
// 动画系统
// ============================================================

export const transitions = {
  fast: '150ms',
  base: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const;

// ============================================================
// z-index 层级
// ============================================================

export const zIndex = {
  dropdown: 100,
  sticky: 200,
  modal: 1000,
  toast: 1100,
  tooltip: 1200,
} as const;

// ============================================================
// 响应式断点
// ============================================================

export const breakpoints = {
  mobile: 600,
  tablet: 900,
  desktop: 1200,
  wide: 1400,
} as const;

// ============================================================
// 通用样式预设
// ============================================================

/** 输入框基础样式 */
export const inputStyles = {
  base: {
    width: '100%',
    padding: `${spacing.sm} ${spacing.md}`,
    border: `1px solid ${colors.border.medium}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
    outline: 'none',
    transition: `border-color ${transitions.fast}, box-shadow ${transitions.fast}`,
    boxSizing: 'border-box' as const,
  },
  focus: {
    borderColor: colors.primary.project,
    boxShadow: `0 0 0 3px rgba(59, 130, 246, 0.1)`,
  },
  error: {
    borderColor: colors.semantic.error,
    boxShadow: `0 0 0 3px rgba(239, 68, 68, 0.1)`,
  },
};

/** 按钮基础样式 */
export const buttonStyles = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: `${spacing.sm} ${spacing.lg}`,
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    transition: `all ${transitions.fast}`,
    outline: 'none',
  },
  disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

/** 卡片基础样式 */
export const cardStyles = {
  base: {
    background: colors.background.primary,
    border: `1px solid ${colors.border.light}`,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    transition: `all ${transitions.base}`,
  },
  hover: {
    boxShadow: shadows.md,
    transform: 'translateY(-2px)',
  },
};

/** 模态框基础样式 */
export const modalStyles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: colors.background.overlay,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: zIndex.modal,
    padding: spacing.lg,
  },
  container: {
    background: colors.background.primary,
    borderRadius: borderRadius['2xl'],
    width: '100%',
    maxHeight: '85vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: shadows['2xl'],
  },
  header: {
    padding: `${spacing.lg} ${spacing.xl}`,
    borderBottom: `1px solid ${colors.border.light}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    padding: spacing.xl,
    overflowY: 'auto' as const,
    flex: 1,
  },
};

/** 下拉框样式 */
export const selectStyles = {
  base: {
    width: '100%',
    padding: `${spacing.sm} 36px ${spacing.sm} ${spacing.md}`,
    border: `1px solid ${colors.border.medium}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
    backgroundColor: colors.background.primary,
    color: colors.gray[700],
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    transition: `border-color ${transitions.fast}, box-shadow ${transitions.fast}`,
    boxSizing: 'border-box' as const,
  },
  focus: {
    borderColor: colors.primary.project,
    boxShadow: `0 0 0 3px rgba(59, 130, 246, 0.1)`,
  },
};
