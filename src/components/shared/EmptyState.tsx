/**
 * @file EmptyState.tsx
 * @description 空状态组件 - 当列表/内容为空时显示的友好提示
 * 
 * 功能特性：
 * 1. 统一的空状态视觉设计
 * 2. 支持自定义图标、标题、描述
 * 3. 可选的操作按钮
 */

import { colors, borderRadius, spacing, typography } from '../../styles/theme';
import { ReactNode } from 'react';

interface EmptyStateProps {
  /** 图标（emoji 或 React 节点） */
  icon?: string | ReactNode;
  /** 主标题 */
  title: string;
  /** 描述文字 */
  description?: string;
  /** 操作按钮配置 */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * 空状态组件
 * 
 * @example
 * <EmptyState
 *   icon="📝"
 *   title="暂无事件记录"
 *   description="使用左侧表单记录第一个事件"
 *   action={{ label: '创建事件', onClick: () => {} }}
 * />
 */
function EmptyState({ icon, title, description, action, style }: EmptyStateProps) {
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: `${spacing['3xl']} ${spacing.xl}`,
      textAlign: 'center' as const,
      background: colors.gray[50],
      borderRadius: borderRadius.lg,
      border: `1px dashed ${colors.gray[300]}`,
      ...style,
    },
    icon: {
      fontSize: '48px',
      marginBottom: spacing.lg,
      lineHeight: 1,
    },
    title: {
      margin: 0,
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.gray[700],
      marginBottom: spacing.sm,
    },
    description: {
      margin: 0,
      fontSize: typography.fontSize.base,
      color: colors.gray[500],
      maxWidth: '300px',
      lineHeight: typography.lineHeight.relaxed,
    },
    button: {
      marginTop: spacing.xl,
      padding: `${spacing.sm} ${spacing.lg}`,
      background: colors.primary.project,
      color: 'white',
      border: 'none',
      borderRadius: borderRadius.md,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
  };

  return (
    <div style={styles.container}>
      {icon && (
        <div style={styles.icon}>
          {typeof icon === 'string' ? icon : icon}
        </div>
      )}
      <h3 style={styles.title}>{title}</h3>
      {description && <p style={styles.description}>{description}</p>}
      {action && (
        <button
          style={styles.button}
          onClick={action.onClick}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
