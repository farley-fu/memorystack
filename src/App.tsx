/**
 * @file App.tsx
 * @description MindMirror 应用主入口 - 整合项目、联系人、事件三大模块
 * 
 * 主要功能：
 * 1. 标签页导航切换
 * 2. 各模块的表单和列表展示
 * 3. 全局文件搜索
 * 4. 活动数据导出
 * 5. 编辑功能支持
 */

import { useState, useRef } from 'react'; 
import { invoke } from '@tauri-apps/api/core';
import { ToastProvider, useToast } from './components/shared/ToastProvider';
import { ProgressBar } from './components/shared/Loading';
import { LanguageProvider, useTranslation, LANGUAGES } from './i18n';
import ProjectForm from './components/ProjectForm';
import ProjectList, { ProjectListRef } from './components/ProjectList'; 
import ContactForm from './components/ContactForm';
import ContactList, { ContactListRef } from './components/ContactList';
import EventForm, { EventWithDetails } from './components/EventForm';
import EventList, { EventListRef } from './components/EventList';
import FileSearch from './components/FileSearch';
import Summary from './components/Summary';
import { colors, spacing, typography, borderRadius, shadows } from './styles/theme';
import './App.css';

type TabType = 'projects' | 'contacts' | 'events' | 'summary';

// 定义编辑实体类型
interface Contact {
  id: number;
  name: string;
  title: string | null;
  notes: string | null;
  tags: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  company: string | null;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 标签页颜色配置
 */
const TAB_COLORS = {
  events: colors.primary.event,
  projects: colors.primary.project,
  contacts: colors.primary.contact,
  summary: '#10b981',  // 绿色
} as const;

/**
 * 应用主内容组件
 */
function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('events');
  const [isExporting, setIsExporting] = useState(false);
  const projectListRef = useRef<ProjectListRef>(null);
  const contactListRef = useRef<ContactListRef>(null);
  const eventListRef = useRef<EventListRef>(null);
  
  // 编辑状态
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventWithDetails | null>(null);
  
  const { showToast } = useToast();
  const { language, setLanguage, t } = useTranslation();

  // 标签页标签（从翻译获取）
  const TAB_LABELS: Record<TabType, string> = {
    events: t.nav.events,
    projects: t.nav.projects,
    contacts: t.nav.contacts,
    summary: t.nav.summary || '总结',
  };

  // 回调函数：刷新列表
  const handleProjectCreated = () => {
    projectListRef.current?.refresh();
    setEditingProject(null);
  };
  const handleContactCreated = () => {
    contactListRef.current?.refresh();
    setEditingContact(null);
  };
  const handleEventCreated = () => {
    eventListRef.current?.refresh();
    setEditingEvent(null);
  };

  // 编辑完成回调
  const handleContactEditComplete = () => {
    setEditingContact(null);
    contactListRef.current?.refresh();
  };
  const handleProjectEditComplete = () => {
    setEditingProject(null);
    projectListRef.current?.refresh();
  };
  const handleEventEditComplete = () => {
    setEditingEvent(null);
    eventListRef.current?.refresh();
  };

  /**
   * 导出所有活动数据
   */
  const handleExportActivities = async () => {
    setIsExporting(true);
    showToast({ type: 'info', message: t.common.exporting, duration: 0 });
    
    try {
      const data = await invoke('export_activities');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const fileName = `activities_${new Date().toISOString().split('T')[0]}.json`;
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      
      showToast({ type: 'success', message: `${t.common.success}! ${fileName}` });
    } catch (error) {
      console.error('导出失败:', error);
      showToast({ type: 'error', message: `${t.common.error}: ${error}` });
    } finally {
      setIsExporting(false);
    }
  };

  // 样式定义
  const styles = {
    container: {
      maxWidth: 'min(1200px, 95vw)',
      margin: '0 auto',
      padding: spacing.xl,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column' as const,
    },
    header: {
      marginBottom: spacing['3xl'],
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerLeft: {
      flex: 1,
    },
    title: {
      marginBottom: spacing.sm,
      fontSize: typography.fontSize['2xl'],
      fontWeight: typography.fontWeight.bold,
      color: colors.gray[800],
    },
    subtitle: {
      color: colors.gray[500],
      fontSize: typography.fontSize.base,
      margin: 0,
    },
    languageSwitch: {
      display: 'flex',
      gap: spacing.xs,
      background: colors.gray[100],
      borderRadius: borderRadius.md,
      padding: '2px',
    },
    languageBtn: (isActive: boolean) => ({
      padding: `${spacing.xs} ${spacing.md}`,
      background: isActive ? 'white' : 'transparent',
      color: isActive ? colors.gray[800] : colors.gray[500],
      border: 'none',
      borderRadius: borderRadius.sm,
      cursor: 'pointer',
      fontSize: typography.fontSize.sm,
      fontWeight: isActive ? typography.fontWeight.medium : typography.fontWeight.normal,
      transition: 'all 0.2s',
      boxShadow: isActive ? shadows.sm : 'none',
    }),
    tabNav: {
      display: 'flex',
      borderBottom: `2px solid ${colors.border.light}`,
      marginBottom: spacing['3xl'],
      gap: spacing.xs,
    },
    tabButton: (isActive: boolean, tabColor: string) => ({
      padding: `${spacing.md} ${spacing.xl}`,
      background: isActive ? tabColor : 'transparent',
      color: isActive ? 'white' : colors.gray[600],
      border: 'none',
      borderTopLeftRadius: borderRadius.md,
      borderTopRightRadius: borderRadius.md,
      cursor: 'pointer',
      fontWeight: typography.fontWeight.semibold,
      fontSize: typography.fontSize.base,
      transition: 'all 0.2s',
      position: 'relative' as const,
    }),
    content: {
      display: 'grid',
      gridTemplateColumns: '1fr 2fr',
      gap: spacing['3xl'],
      alignItems: 'start',
      flex: 1,
    },
    sectionTitle: {
      margin: `0 0 ${spacing.lg} 0`,
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.gray[700],
    },
    exportButton: {
      width: '100%',
      padding: spacing.md,
      background: isExporting ? colors.gray[400] : colors.semantic.info,
      color: 'white',
      border: 'none',
      borderRadius: borderRadius.md,
      cursor: isExporting ? 'not-allowed' : 'pointer',
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      transition: 'all 0.2s',
    },
    footer: {
      marginTop: spacing['4xl'],
      paddingTop: spacing.xl,
      borderTop: `1px solid ${colors.border.light}`,
      textAlign: 'center' as const,
      color: colors.gray[400],
      fontSize: typography.fontSize.sm,
    },
  };

  return (
    <div style={styles.container}>
      {/* 页面头部 */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>{t.app.title}</h1>
          {/* <p style={styles.subtitle}>{t.app.subtitle}</p> */}
        </div>
        {/* 语言切换 */}
        <div style={styles.languageSwitch}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              style={styles.languageBtn(language === lang.code)}
            >
              {lang.nativeLabel}
            </button>
          ))}
        </div>
      </header>

      {/* 标签页导航 */}
      <nav style={styles.tabNav}>
        {(Object.keys(TAB_COLORS) as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={styles.tabButton(activeTab === tab, TAB_COLORS[tab])}
            onMouseEnter={(e) => {
              if (activeTab !== tab) {
                e.currentTarget.style.background = colors.gray[100];
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </nav>

      {/* 导出进度条 */}
      <ProgressBar visible={isExporting} color={colors.semantic.info} />

      {/* 事件标签页 */}
      {activeTab === 'events' && (
        <div style={styles.content}>
          <div>
            <EventForm 
              onEventCreated={handleEventCreated}
              editingEvent={editingEvent}
              onEditComplete={handleEventEditComplete}
            />
            <div style={{ marginTop: spacing.xl }}>
              <FileSearch />
            </div>
            <div style={{ marginTop: spacing.xl }}>
              <button
                onClick={handleExportActivities}
                disabled={isExporting}
                style={styles.exportButton}
                onMouseEnter={(e) => {
                  if (!isExporting) {
                    e.currentTarget.style.boxShadow = shadows.md;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                {isExporting ? t.common.exporting : t.event.exportAll}
              </button>
            </div>
          </div>
          <div>
            <EventList 
              ref={eventListRef}
              onEditEvent={setEditingEvent}
            />
          </div>
        </div>
      )}

      {/* 项目标签页 */}
      {activeTab === 'projects' && (
        <div style={styles.content}>
          <div>
            <h2 style={styles.sectionTitle}>
              {editingProject ? t.project.editTitle : t.project.createTitle}
            </h2>
            <ProjectForm 
              onProjectCreated={handleProjectCreated}
              editingProject={editingProject}
              onEditComplete={handleProjectEditComplete}
            />
          </div>
          <div>
            <h2 style={styles.sectionTitle}>{t.project.title}</h2>
            <ProjectList 
              ref={projectListRef}
              onEditProject={setEditingProject}
            />
          </div>
        </div>
      )}

      {/* 联系人标签页 */}
      {activeTab === 'contacts' && (
        <div style={styles.content}>
          <div>
            <h2 style={styles.sectionTitle}>
              {editingContact ? t.contact.editTitle : t.contact.createTitle}
            </h2>
            <ContactForm 
              onContactCreated={handleContactCreated}
              editingContact={editingContact}
              onEditComplete={handleContactEditComplete}
            />
          </div>
          <div>
            <h2 style={styles.sectionTitle}>{t.contact.title}</h2>
            <ContactList 
              ref={contactListRef}
              onEditContact={setEditingContact}
            />
          </div>
        </div>
      )}

      {/* 总结标签页 */}
      {activeTab === 'summary' && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <Summary />
        </div>
      )}

      {/* 页面底部 */}
      <footer style={styles.footer}>
        <p>{t.app.footer}</p>
      </footer>
    </div>
  );
}

/**
 * 应用根组件 - 包裹 LanguageProvider 和 ToastProvider
 */
function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </LanguageProvider>
  );
}

export default App;
