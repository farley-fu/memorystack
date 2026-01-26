/**
 * @file index.ts
 * @description 国际化上下文 Provider - 管理语言切换和翻译
 */

import { createContext, useContext, useState, ReactNode } from 'react';
import { zh, Translations } from './zh';
import { en } from './en';

// 支持的语言类型
export type Language = 'zh' | 'en';

// 语言配置
export const LANGUAGES: { code: Language; label: string; nativeLabel: string }[] = [
  { code: 'zh', label: 'Chinese', nativeLabel: '中文' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
];

// 翻译映射
const translations: Record<Language, Translations> = { zh, en };

// 本地存储 key
const STORAGE_KEY = 'memorystack_language';

// Context 类型
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

// 创建 Context
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Provider 组件
interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  // 从本地存储获取语言设置，默认中文
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'zh' || saved === 'en') ? saved : 'zh';
  });

  // 切换语言并保存到本地存储
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  // 当前语言的翻译
  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook: 使用翻译
export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}

// 导出翻译类型
export type { Translations };
