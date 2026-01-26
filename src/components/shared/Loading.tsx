/**
 * @file Loading.tsx
 * @description 加载状态组件 - 提供多种加载动画效果
 * 
 * 包含三种变体：
 * 1. SkeletonLoading - 骨架屏加载（用于列表）
 * 2. InlineLoading - 内联旋转加载（用于按钮/刷新）
 * 3. ProgressBar - 进度条（用于导出等操作）
 */

import { colors, borderRadius, spacing, typography } from '../../styles/theme';

// ============================================================
// 骨架屏加载组件
// ============================================================

interface SkeletonLoadingProps {
  /** 骨架行数 */
  count?: number;
  /** 骨架类型 */
  type?: 'card' | 'list' | 'text';
  /** 自定义高度 */
  height?: string;
}

/**
 * 骨架屏加载组件
 * 
 * @example
 * <SkeletonLoading count={3} type="card" />
 */
export function SkeletonLoading({ count = 3, type = 'card', height }: SkeletonLoadingProps) {
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: spacing.md,
    },
    skeleton: {
      background: `linear-gradient(90deg, ${colors.gray[100]} 25%, ${colors.gray[200]} 50%, ${colors.gray[100]} 75%)`,
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      borderRadius: borderRadius.lg,
    },
    card: {
      height: height || '120px',
      padding: spacing.lg,
    },
    list: {
      height: height || '60px',
    },
    text: {
      height: height || '16px',
      width: '80%',
    },
  };

  const getSkeletonStyle = () => {
    switch (type) {
      case 'card': return { ...styles.skeleton, ...styles.card };
      case 'list': return { ...styles.skeleton, ...styles.list };
      case 'text': return { ...styles.skeleton, ...styles.text };
      default: return styles.skeleton;
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}
      </style>
      <div style={styles.container}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} style={getSkeletonStyle()} />
        ))}
      </div>
    </>
  );
}

// ============================================================
// 内联旋转加载组件
// ============================================================

interface InlineLoadingProps {
  /** 加载提示文字 */
  text?: string;
  /** 尺寸 */
  size?: 'small' | 'medium' | 'large';
  /** 颜色 */
  color?: string;
}

/**
 * 内联旋转加载组件
 * 
 * @example
 * <InlineLoading text="加载中..." />
 */
export function InlineLoading({ text, size = 'medium', color }: InlineLoadingProps) {
  const sizeMap = {
    small: '14px',
    medium: '20px',
    large: '28px',
  };

  const spinnerSize = sizeMap[size];
  const spinnerColor = color || colors.primary.project;

  const styles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.lg,
    },
    spinner: {
      width: spinnerSize,
      height: spinnerSize,
      border: `2px solid ${colors.gray[200]}`,
      borderTopColor: spinnerColor,
      borderRadius: borderRadius.full,
      animation: 'spin 0.8s linear infinite',
    },
    text: {
      fontSize: typography.fontSize.base,
      color: colors.gray[500],
    },
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={styles.container}>
        <div style={styles.spinner} />
        {text && <span style={styles.text}>{text}</span>}
      </div>
    </>
  );
}

// ============================================================
// 进度条组件
// ============================================================

interface ProgressBarProps {
  /** 进度百分比（0-100），不传则显示不确定进度动画 */
  progress?: number;
  /** 颜色 */
  color?: string;
  /** 是否显示 */
  visible?: boolean;
  /** 高度 */
  height?: string;
}

/**
 * 进度条组件
 * 
 * @example
 * // 不确定进度（流动动画）
 * <ProgressBar visible={isLoading} />
 * 
 * // 确定进度
 * <ProgressBar progress={50} />
 */
export function ProgressBar({ 
  progress, 
  color, 
  visible = true, 
  height = '4px' 
}: ProgressBarProps) {
  const barColor = color || colors.semantic.info;
  const isIndeterminate = progress === undefined;

  const styles = {
    container: {
      width: '100%',
      height,
      background: colors.gray[200],
      borderRadius: borderRadius.full,
      overflow: 'hidden',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s',
    },
    bar: {
      height: '100%',
      background: barColor,
      borderRadius: borderRadius.full,
      transition: 'width 0.3s ease',
      width: isIndeterminate ? '30%' : `${progress}%`,
      animation: isIndeterminate ? 'indeterminate 1.5s infinite ease-in-out' : 'none',
    },
  };

  if (!visible) return null;

  return (
    <>
      <style>
        {`
          @keyframes indeterminate {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(400%);
            }
          }
        `}
      </style>
      <div style={styles.container}>
        <div style={styles.bar} />
      </div>
    </>
  );
}

// ============================================================
// 全屏加载组件
// ============================================================

interface FullPageLoadingProps {
  /** 加载提示文字 */
  text?: string;
  /** 是否显示 */
  visible?: boolean;
}

/**
 * 全屏加载组件（带遮罩）
 * 
 * @example
 * <FullPageLoading visible={isLoading} text="正在处理..." />
 */
export function FullPageLoading({ text = '加载中...', visible = true }: FullPageLoadingProps) {
  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(255, 255, 255, 0.9)',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.lg,
      zIndex: 999,
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: `3px solid ${colors.gray[200]}`,
      borderTopColor: colors.primary.project,
      borderRadius: borderRadius.full,
      animation: 'spin 0.8s linear infinite',
    },
    text: {
      fontSize: typography.fontSize.base,
      color: colors.gray[600],
    },
  };

  if (!visible) return null;

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={styles.overlay}>
        <div style={styles.spinner} />
        <span style={styles.text}>{text}</span>
      </div>
    </>
  );
}

export default {
  SkeletonLoading,
  InlineLoading,
  ProgressBar,
  FullPageLoading,
};
