/**
 * @file ToastProvider.tsx
 * @description Toast 上下文提供者 - 全局管理 Toast 消息队列
 * 
 * 使用方式：
 * 1. 在 App.tsx 中包裹 ToastProvider
 * 2. 在任意子组件中使用 useToast() hook
 * 
 * @example
 * const { showToast } = useToast();
 * showToast({ type: 'success', message: '操作成功！' });
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Toast, { ToastItem, ToastType } from './Toast';

// ============================================================
// 类型定义
// ============================================================

interface ShowToastOptions {
  type: ToastType;
  message: string;
  /** 显示时长（毫秒），默认 3000ms，设为 0 则不自动关闭 */
  duration?: number;
}

interface ToastContextValue {
  /** 显示一条 Toast 消息 */
  showToast: (options: ShowToastOptions) => string;
  /** 手动关闭指定 Toast */
  removeToast: (id: string) => void;
  /** 清除所有 Toast */
  clearAllToasts: () => void;
}

// ============================================================
// Context 创建
// ============================================================

const ToastContext = createContext<ToastContextValue | null>(null);

// ============================================================
// Provider 组件
// ============================================================

interface ToastProviderProps {
  children: ReactNode;
  /** 最大同时显示数量，默认 3 */
  maxToasts?: number;
}

/**
 * Toast 提供者组件
 * 需要包裹在应用最外层以提供全局 Toast 功能
 */
export function ToastProvider({ children, maxToasts = 3 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /**
   * 生成唯一 ID
   */
  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  /**
   * 显示 Toast 消息
   */
  const showToast = useCallback(({ type, message, duration = 3000 }: ShowToastOptions): string => {
    const id = generateId();
    const newToast: ToastItem = { id, type, message, duration };

    setToasts((prev) => {
      // 如果超过最大数量，移除最早的
      const updated = [...prev, newToast];
      if (updated.length > maxToasts) {
        return updated.slice(-maxToasts);
      }
      return updated;
    });

    // 设置自动消失
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [generateId, maxToasts]);

  /**
   * 移除指定 Toast
   */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /**
   * 清除所有 Toast
   */
  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue: ToastContextValue = {
    showToast,
    removeToast,
    clearAllToasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Toast toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ============================================================
// Hook 导出
// ============================================================

/**
 * 获取 Toast 操作函数的 Hook
 * 
 * @returns Toast 操作函数：showToast, removeToast, clearAllToasts
 * @throws 如果未在 ToastProvider 内使用则抛出错误
 * 
 * @example
 * const { showToast } = useToast();
 * 
 * // 显示成功消息
 * showToast({ type: 'success', message: '保存成功！' });
 * 
 * // 显示错误消息
 * showToast({ type: 'error', message: '操作失败，请重试' });
 * 
 * // 显示不自动关闭的消息
 * const toastId = showToast({ type: 'info', message: '处理中...', duration: 0 });
 * // 稍后手动关闭
 * removeToast(toastId);
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast 必须在 ToastProvider 内使用');
  }
  return context;
}

export default ToastProvider;
