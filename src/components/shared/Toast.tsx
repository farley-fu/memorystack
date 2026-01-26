/**
 * @file Toast.tsx
 * @description Toast 通知组件 - 用于显示操作反馈消息
 * 
 * 功能特性：
 * 1. 支持四种类型：success、error、warning、info
 * 2. 自动消失（可配置时长）
 * 3. 支持多条消息堆叠显示
 * 4. 从顶部滑入的动画效果
 * 5. 支持手动关闭
 */

import { colors, borderRadius, shadows, spacing, typography, zIndex, transitions } from '../../styles/theme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

/**
 * 获取 Toast 类型对应的图标
 */
const getIcon = (type: ToastType): string => {
  switch (type) {
    case 'success': return '✓';
    case 'error': return '✕';
    case 'warning': return '⚠';
    case 'info': return 'ℹ';
    default: return 'ℹ';
  }
};

/**
 * 获取 Toast 类型对应的颜色配置
 */
const getTypeColors = (type: ToastType) => {
  switch (type) {
    case 'success':
      return {
        background: '#ecfdf5',
        border: '#a7f3d0',
        icon: colors.semantic.success,
        text: '#065f46',
      };
    case 'error':
      return {
        background: '#fef2f2',
        border: '#fecaca',
        icon: colors.semantic.error,
        text: '#991b1b',
      };
    case 'warning':
      return {
        background: '#fffbeb',
        border: '#fde68a',
        icon: colors.semantic.warning,
        text: '#92400e',
      };
    case 'info':
      return {
        background: '#eef2ff',
        border: '#c7d2fe',
        icon: colors.semantic.info,
        text: '#3730a3',
      };
  }
};

/**
 * Toast 容器组件 - 渲染所有 Toast 消息
 */
function Toast({ toasts, onRemove }: ToastProps) {
  const styles = {
    container: {
      position: 'fixed' as const,
      top: spacing.xl,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: zIndex.toast,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: spacing.sm,
      maxWidth: '400px',
      width: '90%',
    },
    toast: (type: ToastType) => {
      const typeColors = getTypeColors(type);
      return {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
        padding: `${spacing.md} ${spacing.lg}`,
        background: typeColors.background,
        border: `1px solid ${typeColors.border}`,
        borderRadius: borderRadius.lg,
        boxShadow: shadows.lg,
        animation: 'slideIn 0.3s ease-out',
      };
    },
    icon: (type: ToastType) => {
      const typeColors = getTypeColors(type);
      return {
        flexShrink: 0,
        width: '20px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.full,
        background: typeColors.icon,
        color: 'white',
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.bold,
      };
    },
    message: (type: ToastType) => {
      const typeColors = getTypeColors(type);
      return {
        flex: 1,
        fontSize: typography.fontSize.base,
        color: typeColors.text,
        lineHeight: typography.lineHeight.normal,
      };
    },
    closeButton: {
      flexShrink: 0,
      background: 'none',
      border: 'none',
      padding: spacing.xs,
      cursor: 'pointer',
      color: colors.gray[400],
      fontSize: typography.fontSize.lg,
      lineHeight: 1,
      transition: `color ${transitions.fast}`,
    },
  };

  if (toasts.length === 0) return null;

  return (
    <>
      {/* CSS 动画 */}
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes slideOut {
            from {
              opacity: 1;
              transform: translateY(0);
            }
            to {
              opacity: 0;
              transform: translateY(-20px);
            }
          }
        `}
      </style>
      <div style={styles.container}>
        {toasts.map((toast) => (
          <div key={toast.id} style={styles.toast(toast.type)}>
            <span style={styles.icon(toast.type)}>{getIcon(toast.type)}</span>
            <span style={styles.message(toast.type)}>{toast.message}</span>
            <button
              style={styles.closeButton}
              onClick={() => onRemove(toast.id)}
              onMouseEnter={(e) => (e.currentTarget.style.color = colors.gray[600])}
              onMouseLeave={(e) => (e.currentTarget.style.color = colors.gray[400])}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

export default Toast;
