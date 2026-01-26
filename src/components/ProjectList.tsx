/**
 * @file ProjectList.tsx
 * @description 项目列表组件 - 展示所有项目并提供管理入口
 * 
 * 主要功能：
 * 1. 获取并展示项目列表
 * 2. 提供时间线、活动、文件、联系人管理入口
 * 3. 支持刷新列表
 * 4. 支持编辑项目
 */

import { forwardRef, useImperativeHandle, useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from './shared/ToastProvider';
import { SkeletonLoading } from './shared/Loading';
import EmptyState from './shared/EmptyState';
import { SearchableDropdown } from './shared';
import ProjectContactManager from './ProjectContactManager';
import ProjectTimeline from './ProjectTimeline';
import ProjectFiles from './ProjectFiles';
import ProjectActivities from './ProjectActivities';
import { useTranslation } from '../i18n';
import { colors, spacing, typography, borderRadius, shadows, cardStyles } from '../styles/theme';

// ============================================================
// 类型定义
// ============================================================

export interface Project {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectListProps {
  onEditProject?: (project: Project) => void;
}

export interface ProjectListRef {
  refresh: () => Promise<void>;
}

// ============================================================
// 主组件
// ============================================================

const ProjectList = forwardRef<ProjectListRef, ProjectListProps>(({ onEditProject }, ref) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [managingProject, setManagingProject] = useState<{id: number, name: string} | null>(null);
  const [viewingProject, setViewingProject] = useState<{id: number, name: string} | null>(null);
  const [filesProject, setFilesProject] = useState<{id: number, name: string} | null>(null);
  const [activitiesProject, setActivitiesProject] = useState<{id: number, name: string} | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [highlightedProjectId, setHighlightedProjectId] = useState<number | null>(null);
  const projectRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const { showToast } = useToast();
  const { t } = useTranslation();

  // 按钮配置
  const ACTION_BUTTONS = [
    { key: 'timeline', label: t.project.timeline, color: colors.primary.event, icon: '📅' },
    { key: 'activities', label: t.project.activities, color: colors.primary.activity, icon: '⚡' },
    { key: 'files', label: t.project.files, color: colors.primary.file, icon: '📁' },
    { key: 'contacts', label: t.project.contacts, color: colors.primary.project, icon: '👥' },
  ] as const;

  /** 获取项目列表 */
  const fetchProjects = async () => {
    if (!isLoading) setIsRefreshing(true);
    try {
      const data: Project[] = await invoke('get_projects');
      setProjects(data);
    } catch (error) {
      console.error('获取项目列表失败:', error);
      showToast({ type: 'error', message: t.project.createFailed });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // 暴露 refresh 方法给父组件
  useImperativeHandle(ref, () => ({
    refresh: fetchProjects
  }));

  /** 处理搜索选择 - 定位到项目 */
  const handleSearchSelect = (project: Project) => {
    setHighlightedProjectId(project.id);
    // 滚动到对应项目
    const el = projectRefs.current[project.id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // 3秒后取消高亮
    setTimeout(() => setHighlightedProjectId(null), 3000);
  };

  /** 处理按钮点击 */
  const handleActionClick = (action: string, project: Project) => {
    const target = { id: project.id, name: project.name };
    switch (action) {
      case 'timeline': setViewingProject(target); break;
      case 'activities': setActivitiesProject(target); break;
      case 'files': setFilesProject(target); break;
      case 'contacts': setManagingProject(target); break;
    }
  };

  // ============================================================
  // 样式定义
  // ============================================================

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: spacing.lg,
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      margin: 0,
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.gray[700],
    },
    refreshBtn: {
      padding: `${spacing.sm} ${spacing.md}`,
      background: colors.gray[100],
      border: `1px solid ${colors.border.medium}`,
      borderRadius: borderRadius.md,
      cursor: isRefreshing ? 'not-allowed' : 'pointer',
      fontSize: typography.fontSize.sm,
      color: colors.gray[600],
      display: 'flex',
      alignItems: 'center',
      gap: spacing.sm,
      transition: 'all 0.2s',
    },
    projectList: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: spacing.md,
    },
    projectCard: (isHovered: boolean, isHighlighted: boolean) => ({
      ...cardStyles.base,
      ...(isHovered ? cardStyles.hover : {}),
      cursor: 'default',
      ...(isHighlighted ? {
        boxShadow: `0 0 0 2px ${colors.primary.project}, ${shadows.lg}`,
        background: '#eff6ff',
      } : {}),
    }),
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    projectInfo: {
      flex: 1,
      minWidth: 0,
    },
    projectName: {
      margin: `0 0 ${spacing.xs} 0`,
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.gray[800],
    },
    projectDesc: {
      margin: 0,
      color: colors.gray[600],
      fontSize: typography.fontSize.base,
      lineHeight: typography.lineHeight.relaxed,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical' as const,
    },
    updateTime: {
      fontSize: typography.fontSize.sm,
      color: colors.gray[400],
      whiteSpace: 'nowrap' as const,
      marginLeft: spacing.lg,
    },
    cardFooter: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTop: `1px solid ${colors.gray[100]}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap' as const,
      gap: spacing.md,
    },
    cardMeta: {
      fontSize: typography.fontSize.sm,
      color: colors.gray[400],
    },
    actionButtons: {
      display: 'flex',
      gap: spacing.sm,
      flexWrap: 'wrap' as const,
    },
    actionBtn: (color: string) => ({
      padding: `${spacing.sm} ${spacing.md}`,
      background: color,
      color: 'white',
      border: 'none',
      borderRadius: borderRadius.md,
      cursor: 'pointer',
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      display: 'flex',
      alignItems: 'center',
      gap: spacing.xs,
      transition: 'all 0.2s',
    }),
    editBtn: {
      padding: `${spacing.sm} ${spacing.md}`,
      background: '#f59e0b',
      color: 'white',
      border: 'none',
      borderRadius: borderRadius.md,
      cursor: 'pointer',
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      display: 'flex',
      alignItems: 'center',
      gap: spacing.xs,
      transition: 'all 0.2s',
    },
  };

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <div style={styles.container}>
      {/* 头部 */}
      <div style={styles.header}>
        <h3 style={styles.title}>{t.project.title}</h3>
        <button 
          onClick={fetchProjects} 
          disabled={isRefreshing}
          style={styles.refreshBtn}
          onMouseEnter={(e) => {
            if (!isRefreshing) e.currentTarget.style.background = colors.gray[200];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.gray[100];
          }}
        >
          {isRefreshing ? (
            <>
              <span style={{ 
                display: 'inline-block',
                width: '12px',
                height: '12px',
                border: `2px solid ${colors.gray[300]}`,
                borderTopColor: colors.gray[600],
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              {t.project.refreshing}
            </>
          ) : t.project.refreshList}
        </button>
      </div>

      {/* 搜索框 */}
      {projects.length > 0 && (
        <SearchableDropdown
          items={projects}
          onSelect={handleSearchSelect}
          placeholder={t.search.searchProject}
          displayField="name"
          searchFields={['name', 'description']}
          renderItem={(project) => (
            <div>
              <div style={{ fontWeight: 500 }}>{project.name}</div>
              {project.description && (
                <div style={{ fontSize: '12px', color: colors.gray[500], marginTop: '2px' }}>
                  {project.description.substring(0, 50)}...
                </div>
              )}
            </div>
          )}
          emptyMessage={t.search.noMatchProject}
        />
      )}

      {/* 添加旋转动画 */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* 列表内容 */}
      {isLoading ? (
        <SkeletonLoading count={3} type="card" />
      ) : projects.length === 0 ? (
        <EmptyState
          icon="📁"
          title={t.project.noProjects}
          description={t.project.noProjectsHint}
        />
      ) : (
        <div style={styles.projectList}>
          {projects.map((project) => (
            <div 
              key={project.id}
              ref={(el) => { projectRefs.current[project.id] = el; }}
              style={styles.projectCard(hoveredCard === project.id, highlightedProjectId === project.id)}
              onMouseEnter={() => setHoveredCard(project.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div style={styles.cardHeader}>
                <div style={styles.projectInfo}>
                  <h4 style={styles.projectName}>{project.name}</h4>
                  {project.description && (
                    <p style={styles.projectDesc}>{project.description}</p>
                  )}
                </div>
                <span style={styles.updateTime}>
                  {t.project.updatedAt} {new Date(project.updated_at).toLocaleDateString()}
                </span>
              </div>

              <div style={styles.cardFooter}>
                <div style={styles.cardMeta}>
                  <span>ID: {project.id}</span>
                  <span style={{ marginLeft: spacing.lg }}>
                    {t.project.createdAt} {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div style={styles.actionButtons}>
                  {onEditProject && (
                    <button
                      onClick={() => onEditProject(project)}
                      style={styles.editBtn}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = shadows.md;
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <span>✏️</span>
                      {t.common.edit}
                    </button>
                  )}
                  {ACTION_BUTTONS.map(({ key, label, color, icon }) => (
                    <button
                      key={key}
                      onClick={() => handleActionClick(key, project)}
                      style={styles.actionBtn(color)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = shadows.md;
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <span>{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 模态框 */}
      {managingProject && (
        <ProjectContactManager
          projectId={managingProject.id}
          projectName={managingProject.name}
          isOpen={!!managingProject}
          onClose={() => setManagingProject(null)}
        />
      )}

      {viewingProject && (
        <ProjectTimeline
          projectId={viewingProject.id}
          projectName={viewingProject.name}
          isOpen={!!viewingProject}
          onClose={() => setViewingProject(null)}
        />
      )}

      {filesProject && (
        <ProjectFiles
          projectId={filesProject.id}
          projectName={filesProject.name}
          isOpen={!!filesProject}
          onClose={() => setFilesProject(null)}
        />
      )}

      {activitiesProject && (
        <ProjectActivities
          projectId={activitiesProject.id}
          projectName={activitiesProject.name}
          isOpen={!!activitiesProject}
          onClose={() => setActivitiesProject(null)}
        />
      )}
    </div>
  );
});

ProjectList.displayName = 'ProjectList';

export default ProjectList;
