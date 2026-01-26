/**
 * @file ProjectForm.tsx
 * @description 项目创建/编辑表单组件
 * 
 * 功能：创建或编辑项目，包含项目名称和描述字段
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from './shared/ToastProvider';
import { useTranslation } from '../i18n';
import { colors, spacing, typography, borderRadius, shadows } from '../styles/theme';

interface Project {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectFormProps {
  onProjectCreated: () => void;
  editingProject?: Project | null;
  onEditComplete?: () => void;
}

function ProjectForm({ onProjectCreated, editingProject, onEditComplete }: ProjectFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { showToast } = useToast();
  const { t } = useTranslation();
  
  const isEditMode = !!editingProject;

  // 当编辑项目变化时，填充表单
  useEffect(() => {
    if (editingProject) {
      setName(editingProject.name || '');
      setDescription(editingProject.description || '');
    }
  }, [editingProject]);

  const resetForm = () => {
    setName('');
    setDescription('');
  };

  const handleCancel = () => {
    resetForm();
    onEditComplete?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      showToast({ type: 'warning', message: t.project.namePlaceholder });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && editingProject) {
        await invoke('update_project', { 
          projectId: editingProject.id,
          name: name.trim(), 
          description: description.trim() || null 
        });
        showToast({ type: 'success', message: t.project.updateSuccess });
        resetForm();
        onEditComplete?.();
      } else {
        await invoke('create_project', { 
          name: name.trim(), 
          description: description.trim() || null 
        });
        showToast({ type: 'success', message: t.project.createSuccess });
        resetForm();
        onProjectCreated();
      }
    } catch (error) {
      console.error(isEditMode ? '更新项目失败:' : '创建项目失败:', error);
      showToast({ type: 'error', message: `${t.project.createFailed}: ${error}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = {
    form: {
      padding: spacing.xl,
      border: `1px solid ${colors.border.light}`,
      borderRadius: borderRadius.lg,
      background: isEditMode ? '#fffbeb' : colors.background.primary,
    },
    field: {
      marginBottom: spacing.lg,
    },
    label: {
      display: 'block',
      marginBottom: spacing.xs,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.gray[700],
    },
    required: {
      color: colors.semantic.error,
      marginLeft: spacing.xs,
    },
    input: {
      width: '100%',
      padding: `${spacing.sm} ${spacing.md}`,
      border: `1px solid ${colors.border.medium}`,
      borderRadius: borderRadius.md,
      fontSize: typography.fontSize.base,
      boxSizing: 'border-box' as const,
      transition: 'border-color 0.2s, box-shadow 0.2s',
      outline: 'none',
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
      fontFamily: 'inherit',
    },
    buttonRow: {
      display: 'flex',
      gap: spacing.md,
    },
    submitBtn: {
      flex: 1,
      padding: `${spacing.md} ${spacing.xl}`,
      background: isSubmitting ? colors.gray[400] : (isEditMode ? '#f59e0b' : colors.primary.project),
      color: 'white',
      border: 'none',
      borderRadius: borderRadius.md,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      cursor: isSubmitting ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s',
    },
    cancelBtn: {
      padding: `${spacing.md} ${spacing.xl}`,
      background: colors.gray[100],
      color: colors.gray[700],
      border: `1px solid ${colors.border.medium}`,
      borderRadius: borderRadius.md,
      fontSize: typography.fontSize.base,
      cursor: 'pointer',
    },
  };
 
  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.field}>
        <label style={styles.label}>
          {t.project.name}
          <span style={styles.required}>*</span>
        </label>
        <input
          type="text"
          placeholder={t.project.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = colors.primary.project;
            e.currentTarget.style.boxShadow = `0 0 0 3px rgba(59, 130, 246, 0.1)`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = colors.border.medium;
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      <div style={styles.field}>
        <label style={styles.label}>{t.project.description}</label>
        <textarea
          placeholder={t.project.descriptionPlaceholder}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={styles.textarea}
        />
      </div>

      <div style={styles.buttonRow}>
        {isEditMode && (
          <button
            type="button"
            onClick={handleCancel}
            style={styles.cancelBtn}
          >
            {t.common.cancel}
          </button>
        )}
        <button 
          type="submit" 
          disabled={isSubmitting}
          style={styles.submitBtn}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.boxShadow = shadows.md;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'none';
          }}
        >
          {isSubmitting 
            ? t.common.saving 
            : (isEditMode ? t.common.update : t.project.createBtn)
          }
        </button>
      </div>
    </form>
  );
}

export default ProjectForm;
