/**
 * @file ProjectActivities.tsx
 * @description 项目活动管理组件 - 创建、管理、导出项目活动
 * 
 * 主要功能：
 * 1. 活动 CRUD 操作（创建、激活、暂停、完成、删除）
 * 2. 活动状态流转（待分配 → 未激活 → 进行中 → 已暂停/已完成）
 * 3. 活动负责人分配
 * 4. 导出甘特图 Excel
 * 
 * 状态说明：
 * - 待分配：未指定负责人
 * - 未激活：已分配负责人但未开始
 * - 进行中：已激活正在执行
 * - 已暂停：暂时中止
 * - 已完成：已完成
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import * as XLSX from 'xlsx';
import { useToast } from './shared/ToastProvider';
import { SkeletonLoading, ProgressBar } from './shared/Loading';
import EmptyState from './shared/EmptyState';
import { colors, spacing, typography, borderRadius, shadows, modalStyles } from '../styles/theme';
import { useTranslation } from '../i18n';

// ============================================================
// 类型定义
// ============================================================

interface Contact {
  id: number;
  name: string;
  title: string | null;
  company: string | null;
}

interface ProjectActivity {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  estimated_completion_date: string | null;
  status: string;
  activated_at: string | null;
  paused_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ActivityWithDetails {
  activity: ProjectActivity;
  assignees: Contact[];
}

interface ProjectActivitiesProps {
  projectId: number;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================
// 主组件
// ============================================================

function ProjectActivities({ projectId, projectName, isOpen, onClose }: ProjectActivitiesProps) {
  const { t } = useTranslation();
  
  // 状态颜色配置（使用翻译后的状态名称）
  const STATUS_COLORS: Record<string, string> = {
    [t.activity.status.pending]: colors.gray[400],
    [t.activity.status.inactive]: colors.semantic.warning,
    [t.activity.status.inProgress]: colors.semantic.success,
    [t.activity.status.paused]: colors.semantic.error,
    [t.activity.status.completed]: colors.semantic.info,
  };
  
  // 状态管理
  const [activities, setActivities] = useState<ActivityWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 表单状态
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEstimatedDate, setFormEstimatedDate] = useState('');
  const [formContactIds, setFormContactIds] = useState<number[]>([]);

  // Toast hook
  const { showToast } = useToast();

  // ============================================================
  // 数据获取
  // ============================================================

  /** 获取活动列表 */
  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const data: ActivityWithDetails[] = await invoke('get_project_activities', { projectId });
      setActivities(data);
    } catch (error) {
      console.error('获取活动列表失败:', error);
      showToast({ type: 'error', message: t.activity.createFailed });
    } finally {
      setIsLoading(false);
    }
  };

  /** 获取项目联系人列表（活动负责人必须是项目联系人） */
  const fetchContacts = async () => {
    try {
      // 获取已绑定到项目的联系人，而非所有联系人
      const data: [Contact, string | null, string | null][] = await invoke('get_project_contacts', { projectId });
      // 从返回数据中提取 Contact 对象
      const contacts = data.map(([contact]) => contact);
      setAvailableContacts(contacts);
    } catch (error) {
      console.error('获取项目联系人失败:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchActivities();
      fetchContacts();
    }
  }, [isOpen, projectId]);

  // ============================================================
  // 活动操作
  // ============================================================

  /** 创建活动 */
  const handleCreateActivity = async () => {
    if (!formName.trim()) {
      showToast({ type: 'warning', message: t.activity.nameRequired });
      return;
    }

    setIsSubmitting(true);
    try {
      await invoke('create_activity', {
        projectId,
        name: formName,
        description: formDescription || null,
        estimatedCompletionDate: formEstimatedDate || null,
        contactIds: formContactIds,
      });
      
      // 重置表单
      setFormName('');
      setFormDescription('');
      setFormEstimatedDate('');
      setFormContactIds([]);
      setShowForm(false);
      
      showToast({ type: 'success', message: t.activity.createSuccess });
      await fetchActivities();
    } catch (error) {
      console.error('创建活动失败:', error);
      showToast({ type: 'error', message: `${t.activity.createFailed}: ${error}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  /** 激活活动 */
  const handleActivate = async (activityId: number) => {
    try {
      await invoke('activate_activity', { activityId });
      showToast({ type: 'success', message: t.activity.activated });
      await fetchActivities();
    } catch (error) {
      console.error('激活活动失败:', error);
      showToast({ type: 'error', message: `${t.activity.activateFailed}: ${error}` });
    }
  };

  /** 暂停活动 */
  const handlePause = async (activityId: number) => {
    try {
      await invoke('pause_activity', { activityId });
      showToast({ type: 'warning', message: t.activity.paused });
      await fetchActivities();
    } catch (error) {
      console.error('暂停活动失败:', error);
      showToast({ type: 'error', message: `${t.activity.pauseFailed}: ${error}` });
    }
  };

  /** 完成活动 */
  const handleComplete = async (activityId: number) => {
    try {
      await invoke('complete_activity', { activityId });
      showToast({ type: 'success', message: t.activity.completed });
      await fetchActivities();
    } catch (error) {
      console.error('完成活动失败:', error);
      showToast({ type: 'error', message: `${t.activity.completeFailed}: ${error}` });
    }
  };

  /** 删除活动 */
  const handleDelete = async (activityId: number, activityName: string) => {
    if (!window.confirm(t.activity.confirmDelete.replace('{name}', activityName))) {
      return;
    }
    try {
      await invoke('delete_activity', { activityId });
      showToast({ type: 'success', message: t.activity.deleted });
      await fetchActivities();
    } catch (error) {
      console.error('删除活动失败:', error);
      showToast({ type: 'error', message: `${t.activity.deleteFailed}: ${error}` });
    }
  };

  /** 切换联系人选择 */
  const toggleContact = (contactId: number) => {
    setFormContactIds(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  // ============================================================
  // 导出甘特图
  // ============================================================

  /**
   * 导出项目活动为甘特图 Excel
   * 
   * @description 将活动数据转换为带时间线的 Excel 文件
   * 包含活动基本信息和日期范围内的进度标记
   */
  const handleExportGantt = async () => {
    if (activities.length === 0) {
      showToast({ type: 'warning', message: t.activity.exportNoData });
      return;
    }

    setIsExporting(true);
    showToast({ type: 'info', message: t.activity.generatingGantt, duration: 0 });

    try {
      // 模拟异步处理（给用户视觉反馈）
      await new Promise(resolve => setTimeout(resolve, 500));

      // 获取日期范围
      const dates: Date[] = [];
      activities.forEach(({ activity }) => {
        dates.push(new Date(activity.created_at));
        if (activity.estimated_completion_date) {
          dates.push(new Date(activity.estimated_completion_date));
        }
        if (activity.completed_at) {
          dates.push(new Date(activity.completed_at));
        }
      });

      // 计算日期范围，前后各扩展7天
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      minDate.setDate(minDate.getDate() - 7);
      maxDate.setDate(maxDate.getDate() + 7);

      // 生成日期列表
      const dateColumns: Date[] = [];
      const currentDate = new Date(minDate);
      while (currentDate <= maxDate) {
        dateColumns.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // 构建表头
      const headerRow = [
        '活动名称', '状态', '负责人', '创建时间', '预计完成', '激活时间', '完成时间',
        ...dateColumns.map(d => `${d.getMonth() + 1}/${d.getDate()}`)
      ];

      // 构建数据行
      const dataRows = activities.map(({ activity, assignees }) => {
        const startDate = new Date(activity.created_at);
        const endDate = activity.completed_at 
          ? new Date(activity.completed_at)
          : activity.estimated_completion_date 
            ? new Date(activity.estimated_completion_date)
            : new Date();

        const row: (string | number)[] = [
          activity.name,
          activity.status,
          assignees.map(a => a.name).join(', ') || '-',
          new Date(activity.created_at).toLocaleDateString(),
          activity.estimated_completion_date || '-',
          activity.activated_at ? new Date(activity.activated_at).toLocaleDateString() : '-',
          activity.completed_at ? new Date(activity.completed_at).toLocaleDateString() : '-',
        ];

        // 甘特图标记
        dateColumns.forEach(date => {
          const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const startOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          const endOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

          if (dateOnly >= startOnly && dateOnly <= endOnly) {
            switch (activity.status) {
              case '待分配':
              case '未激活': row.push('■'); break;
              case '进行中': row.push('●'); break;
              case '已暂停': row.push('◆'); break;
              case '已完成': row.push('★'); break;
              default: row.push('');
            }
          } else {
            row.push('');
          }
        });

        return row;
      });

      // 创建工作簿
      const wb = XLSX.utils.book_new();
      const legendRow = ['图例说明:', '■ 待分配/未激活', '● 进行中', '◆ 已暂停', '★ 已完成'];
      const wsData = [legendRow, [], headerRow, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // 设置列宽
      ws['!cols'] = [
        { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 12 },
        ...dateColumns.map(() => ({ wch: 5 }))
      ];

      XLSX.utils.book_append_sheet(wb, ws, '项目甘特图');

      // 导出文件
      const fileName = `${projectName}_甘特图_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      showToast({ type: 'success', message: `${t.activity.exportSuccess} ${fileName}` });
    } catch (error) {
      console.error('导出甘特图失败:', error);
      showToast({ type: 'error', message: `${t.activity.exportFailed}: ${error}` });
    } finally {
      setIsExporting(false);
    }
  };

  // ============================================================
  // 辅助函数
  // ============================================================

  /** 获取状态对应的操作按钮 */
  const getStatusActions = (activity: ProjectActivity) => {
    const { status, id } = activity;
    
    if (status === t.activity.status.pending) {
      return <span style={{ fontSize: typography.fontSize.sm, color: colors.gray[400] }}>{t.activity.assignFirst}</span>;
    }
    
    if (status === t.activity.status.inactive) {
      return (
        <button onClick={() => handleActivate(id)} style={{ ...styles.actionBtn, ...styles.actionBtnSuccess }}>
          {t.activity.actions.activate}
        </button>
      );
    }
    
    if (status === t.activity.status.inProgress) {
      return (
        <>
          <button onClick={() => handlePause(id)} style={{ ...styles.actionBtn, ...styles.actionBtnDanger }}>
            {t.activity.actions.pause}
          </button>
          <button onClick={() => handleComplete(id)} style={{ ...styles.actionBtn, ...styles.actionBtnPrimary }}>
            {t.activity.actions.complete}
          </button>
        </>
      );
    }
    
    if (status === t.activity.status.paused) {
      return (
        <button onClick={() => handleActivate(id)} style={{ ...styles.actionBtn, ...styles.actionBtnSuccess }}>
          {t.activity.actions.reactivate}
        </button>
      );
    }
    
    if (status === t.activity.status.completed) {
      return <span style={{ fontSize: typography.fontSize.sm, color: colors.semantic.info }}>{t.activity.status.completed}</span>;
    }
    
    return null;
  };

  // ============================================================
  // 样式定义
  // ============================================================

  const styles = {
    overlay: modalStyles.overlay,
    modal: {
      ...modalStyles.container,
      maxWidth: '900px',
    },
    header: {
      ...modalStyles.header,
      background: colors.gray[50],
    },
    title: {
      margin: 0,
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.gray[800],
      display: 'flex',
      alignItems: 'center',
      gap: spacing.sm,
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      fontSize: typography.fontSize['2xl'],
      cursor: 'pointer',
      color: colors.gray[400],
      padding: spacing.xs,
      borderRadius: borderRadius.md,
      transition: 'all 0.2s',
    },
    content: modalStyles.content,
    toolbar: {
      display: 'flex',
      gap: spacing.md,
      marginBottom: spacing.lg,
      flexWrap: 'wrap' as const,
    },
    primaryBtn: {
      padding: `${spacing.sm} ${spacing.lg}`,
      background: colors.primary.project,
      color: 'white',
      border: 'none',
      borderRadius: borderRadius.md,
      cursor: 'pointer',
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      display: 'flex',
      alignItems: 'center',
      gap: spacing.sm,
      transition: 'all 0.2s',
    },
    exportBtn: {
      padding: `${spacing.sm} ${spacing.lg}`,
      background: isExporting ? colors.gray[400] : colors.semantic.success,
      color: 'white',
      border: 'none',
      borderRadius: borderRadius.md,
      cursor: isExporting ? 'not-allowed' : 'pointer',
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      display: 'flex',
      alignItems: 'center',
      gap: spacing.sm,
      transition: 'all 0.2s',
    },
    form: {
      background: colors.gray[50],
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.xl,
      border: `1px solid ${colors.border.light}`,
    },
    formField: {
      marginBottom: spacing.md,
    },
    label: {
      display: 'block',
      marginBottom: spacing.xs,
      fontSize: typography.fontSize.sm,
      color: colors.gray[600],
      fontWeight: typography.fontWeight.medium,
    },
    input: {
      width: '100%',
      padding: `${spacing.sm} ${spacing.md}`,
      border: `1px solid ${colors.border.medium}`,
      borderRadius: borderRadius.md,
      fontSize: typography.fontSize.base,
      boxSizing: 'border-box' as const,
      transition: 'border-color 0.2s',
    },
    textarea: {
      width: '100%',
      padding: `${spacing.sm} ${spacing.md}`,
      border: `1px solid ${colors.border.medium}`,
      borderRadius: borderRadius.md,
      fontSize: typography.fontSize.base,
      minHeight: '80px',
      resize: 'vertical' as const,
      boxSizing: 'border-box' as const,
    },
    contactGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    contactItem: {
      display: 'flex',
      alignItems: 'center',
      padding: `${spacing.sm} ${spacing.md}`,
      background: 'white',
      border: `1px solid ${colors.border.light}`,
      borderRadius: borderRadius.md,
      cursor: 'pointer',
      fontSize: typography.fontSize.sm,
      transition: 'all 0.2s',
    },
    contactItemSelected: {
      background: '#dbeafe',
      borderColor: colors.primary.project,
    },
    formActions: {
      display: 'flex',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    activityList: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: spacing.md,
    },
    activityCard: {
      border: `1px solid ${colors.border.light}`,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      background: 'white',
      transition: 'all 0.2s',
    },
    activityHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    activityName: {
      margin: 0,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      color: colors.gray[800],
    },
    statusBadge: {
      padding: `${spacing.xs} ${spacing.sm}`,
      borderRadius: borderRadius.sm,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      color: 'white',
    },
    activityMeta: {
      fontSize: typography.fontSize.sm,
      color: colors.gray[500],
      marginBottom: spacing.sm,
      lineHeight: typography.lineHeight.relaxed,
    },
    assignees: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: spacing.xs,
    },
    assigneeBadge: {
      background: '#e0f2fe',
      color: '#0369a1',
      padding: `${spacing.xs} ${spacing.sm}`,
      borderRadius: borderRadius.sm,
      fontSize: typography.fontSize.xs,
    },
    activityActions: {
      display: 'flex',
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTop: `1px solid ${colors.gray[100]}`,
    },
    actionBtn: {
      padding: `${spacing.xs} ${spacing.md}`,
      border: 'none',
      borderRadius: borderRadius.sm,
      cursor: 'pointer',
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      transition: 'all 0.2s',
    },
    actionBtnSuccess: {
      background: colors.semantic.success,
      color: 'white',
    },
    actionBtnDanger: {
      background: colors.semantic.error,
      color: 'white',
    },
    actionBtnPrimary: {
      background: colors.semantic.info,
      color: 'white',
    },
    actionBtnDelete: {
      background: '#fee2e2',
      color: colors.semantic.error,
    },
  };

  // ============================================================
  // 渲染
  // ============================================================

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div style={styles.header}>
          <h3 style={styles.title}>
            <span>📋</span>
            {projectName} - {t.activity.title}
          </h3>
          <button 
            style={styles.closeBtn} 
            onClick={onClose}
            onMouseEnter={(e) => e.currentTarget.style.color = colors.gray[600]}
            onMouseLeave={(e) => e.currentTarget.style.color = colors.gray[400]}
          >
            ×
          </button>
        </div>
        
        {/* 导出进度条 */}
        <ProgressBar visible={isExporting} color={colors.semantic.success} />
        
        {/* 内容区 */}
        <div style={styles.content}>
          {/* 工具栏 */}
          <div style={styles.toolbar}>
            {!showForm && (
              <button 
                style={styles.primaryBtn} 
                onClick={() => setShowForm(true)}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = shadows.md}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                {t.activity.createBtn}
              </button>
            )}
            {activities.length > 0 && (
              <button 
                style={styles.exportBtn}
                onClick={handleExportGantt}
                disabled={isExporting}
                onMouseEnter={(e) => {
                  if (!isExporting) e.currentTarget.style.boxShadow = shadows.md;
                }}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                {isExporting ? t.common.exporting : `📊 ${t.activity.exportGantt}`}
              </button>
            )}
          </div>

          {/* 创建表单 */}
          {showForm && (
            <div style={styles.form}>
              <div style={styles.formField}>
                <label style={styles.label}>{t.activity.name} <span style={{ color: colors.semantic.error }}>*</span></label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t.activity.namePlaceholder}
                  style={styles.input}
                />
              </div>

              <div style={styles.formField}>
                <label style={styles.label}>{t.activity.description}</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={t.activity.descriptionPlaceholder}
                  style={styles.textarea}
                />
              </div>

              <div style={styles.formField}>
                <label style={styles.label}>{t.activity.estimatedDate}</label>
                <input
                  type="date"
                  value={formEstimatedDate}
                  onChange={(e) => setFormEstimatedDate(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.formField}>
                <label style={styles.label}>{t.activity.assignees}</label>
                {availableContacts.length === 0 ? (
                  <p style={{ fontSize: typography.fontSize.sm, color: colors.gray[400] }}>
                    {t.activity.noContactsAvailable}
                  </p>
                ) : (
                  <div style={styles.contactGrid}>
                    {availableContacts.map(contact => (
                      <div
                        key={contact.id}
                        style={{
                          ...styles.contactItem,
                          ...(formContactIds.includes(contact.id) ? styles.contactItemSelected : {})
                        }}
                        onClick={() => toggleContact(contact.id)}
                      >
                        <input
                          type="checkbox"
                          checked={formContactIds.includes(contact.id)}
                          readOnly
                          style={{ marginRight: spacing.sm }}
                        />
                        {contact.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.formActions}>
                <button
                  onClick={handleCreateActivity}
                  disabled={isSubmitting}
                  style={{ 
                    ...styles.actionBtn, 
                    ...styles.actionBtnSuccess,
                    opacity: isSubmitting ? 0.6 : 1,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmitting ? t.common.saving : t.common.create}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setFormName('');
                    setFormDescription('');
                    setFormEstimatedDate('');
                    setFormContactIds([]);
                  }}
                  style={{ ...styles.actionBtn, background: colors.gray[100], color: colors.gray[600] }}
                >
                  {t.common.cancel}
                </button>
              </div>
            </div>
          )}

          {/* 活动列表 */}
          {isLoading ? (
            <SkeletonLoading count={3} type="card" />
          ) : activities.length === 0 ? (
            <EmptyState
              icon="📋"
              title={t.activity.noActivities}
              description={t.activity.noActivitiesHint}
              action={!showForm ? { label: t.activity.createBtn, onClick: () => setShowForm(true) } : undefined}
            />
          ) : (
            <div style={styles.activityList}>
              {activities.map(({ activity, assignees }) => (
                <div 
                  key={activity.id} 
                  style={styles.activityCard}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = shadows.md;
                    e.currentTarget.style.borderColor = colors.border.medium;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = colors.border.light;
                  }}
                >
                  <div style={styles.activityHeader}>
                    <h4 style={styles.activityName}>{activity.name}</h4>
                    <span style={{ 
                      ...styles.statusBadge, 
                      background: STATUS_COLORS[activity.status] || colors.gray[500] 
                    }}>
                      {activity.status}
                    </span>
                  </div>

                  {activity.description && (
                    <p style={{ margin: `0 0 ${spacing.sm} 0`, fontSize: typography.fontSize.sm, color: colors.gray[600] }}>
                      {activity.description}
                    </p>
                  )}

                  <div style={styles.activityMeta}>
                    {t.project.createdAt}: {new Date(activity.created_at).toLocaleDateString()}
                    {activity.estimated_completion_date && (
                      <> · {t.activity.estimatedDate}: {activity.estimated_completion_date}</>
                    )}
                    {activity.activated_at && (
                      <> · {t.activity.activated}: {new Date(activity.activated_at).toLocaleString()}</>
                    )}
                    {activity.completed_at && (
                      <> · {t.activity.completed}: {new Date(activity.completed_at).toLocaleString()}</>
                    )}
                  </div>

                  {assignees.length > 0 && (
                    <div style={{ marginBottom: spacing.sm }}>
                      <span style={{ fontSize: typography.fontSize.sm, color: colors.gray[500] }}>{t.activity.assignees}: </span>
                      <div style={styles.assignees}>
                        {assignees.map(contact => (
                          <span key={contact.id} style={styles.assigneeBadge}>
                            {contact.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={styles.activityActions}>
                    {getStatusActions(activity)}
                    <button
                      onClick={() => handleDelete(activity.id, activity.name)}
                      style={{ ...styles.actionBtn, ...styles.actionBtnDelete }}
                    >
                      {t.common.delete}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectActivities;
