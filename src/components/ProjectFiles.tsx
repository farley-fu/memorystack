/**
 * @file ProjectFiles.tsx
 * @description 项目文件管理组件
 * 
 * 功能：上传、查看、删除项目文件
 */

// src/components/ProjectFiles.tsx
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { useToast } from './shared/ToastProvider';
import { useTranslation } from '../i18n';

interface ProjectFile {
  id: number;
  project_id: number;
  original_name: string;
  stored_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

interface ProjectFilesProps {
  projectId: number;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

function ProjectFiles({ projectId, projectName, isOpen, onClose }: ProjectFilesProps) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const { showToast } = useToast();

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const data: ProjectFile[] = await invoke('get_project_files', { projectId });
      setFiles(data);
    } catch (error) {
      console.error('获取文件列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen, projectId]);

  // 监听 Tauri 的拖放事件
  useEffect(() => {
    if (!isOpen) return;

    const unlistenDrop = listen<{ paths: string[] }>('tauri://drag-drop', async (event) => {
      console.log('拖放文件:', event.payload.paths);
      if (event.payload.paths && event.payload.paths.length > 0) {
        await uploadFiles(event.payload.paths);
      }
    });

    const unlistenEnter = listen('tauri://drag-enter', () => {
      setIsDragging(true);
    });

    const unlistenLeave = listen('tauri://drag-leave', () => {
      setIsDragging(false);
    });

    return () => {
      unlistenDrop.then(fn => fn());
      unlistenEnter.then(fn => fn());
      unlistenLeave.then(fn => fn());
    };
  }, [isOpen, projectId]);

  const handleSelectFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        title: '选择要上传的文件',
      });
      
      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        await uploadFiles(paths);
      }
    } catch (error) {
      console.error('选择文件失败:', error);
    }
  };

  const uploadFiles = async (filePaths: string[]) => {
    setUploading(true);
    setIsDragging(false);
    try {
      for (const filePath of filePaths) {
        console.log('正在上传:', filePath);
        await invoke('upload_file_to_project', {
          projectId,
          sourcePath: filePath,
          contactId: null,
        });
      }
      showToast({ type: 'success', message: t.file.uploadSuccess.replace('{count}', String(filePaths.length)) });
      await fetchFiles();
    } catch (error) {
      console.error('上传文件失败:', error);
      showToast({ type: 'error', message: `${t.file.uploadFailed}: ${error}` });
    } finally {
      setUploading(false);
    }
  };

  const handleOpenFile = async (filePath: string) => {
    try {
      await invoke('open_file', { filePath });
    } catch (error) {
      console.error('打开文件失败:', error);
      showToast({ type: 'error', message: `${t.file.openFailed}: ${error}` });
    }
  };

  const handleShowInFolder = async (filePath: string) => {
    try {
      await invoke('show_in_folder', { filePath });
    } catch (error) {
      console.error('打开目录失败:', error);
      showToast({ type: 'error', message: `${t.file.openFolderFailed}: ${error}` });
    }
  };

  const handleDeleteFile = async (fileId: number, fileName: string) => {
    if (!window.confirm(t.file.confirmDelete.replace('{name}', fileName))) {
      return;
    }
    try {
      await invoke('delete_project_file', { fileId });
      showToast({ type: 'success', message: t.file.deleteSuccess });
      await fetchFiles();
    } catch (error) {
      console.error('删除文件失败:', error);
      showToast({ type: 'error', message: `${t.file.deleteFailed}: ${error}` });
    }
  };

  const formatFileSize = (size: number | null): string => {
    if (!size) return '-';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    modal: {
      background: 'white',
      borderRadius: '12px',
      width: '90%',
      maxWidth: '700px',
      maxHeight: '80vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column' as const,
    },
    header: {
      padding: '16px 20px',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      margin: 0,
      fontSize: '1.1em',
      color: '#1f2937',
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      fontSize: '1.5em',
      cursor: 'pointer',
      color: '#6b7280',
    },
    content: {
      padding: '20px',
      overflowY: 'auto' as const,
      flex: 1,
    },
    dropZone: {
      border: `2px dashed ${isDragging ? '#3b82f6' : '#d1d5db'}`,
      borderRadius: '8px',
      padding: '30px',
      textAlign: 'center' as const,
      background: isDragging ? '#eff6ff' : '#f9fafb',
      marginBottom: '20px',
      transition: 'all 0.2s',
    },
    dropText: {
      color: '#6b7280',
      marginBottom: '10px',
    },
    selectBtn: {
      padding: '8px 16px',
      background: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '0.9em',
    },
    fileList: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '10px',
    },
    fileItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '12px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      background: 'white',
    },
    fileIcon: {
      width: '40px',
      height: '40px',
      background: '#f3f4f6',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: '12px',
      fontSize: '1.2em',
    },
    fileInfo: {
      flex: 1,
      minWidth: 0,
    },
    fileName: {
      margin: 0,
      fontSize: '0.95em',
      color: '#1f2937',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    fileMeta: {
      fontSize: '0.8em',
      color: '#9ca3af',
      marginTop: '2px',
    },
    fileActions: {
      display: 'flex',
      gap: '6px',
    },
    actionBtn: {
      padding: '4px 8px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '0.8em',
    },
    versionBadge: {
      background: '#dbeafe',
      color: '#1d4ed8',
      padding: '2px 6px',
      borderRadius: '4px',
      fontSize: '0.75em',
      marginLeft: '6px',
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '40px',
      color: '#9ca3af',
    },
  };

  const getFileIcon = (fileType: string | null): string => {
    if (!fileType) return '📄';
    const type = fileType.toLowerCase();
    if (['pdf'].includes(type)) return '📕';
    if (['doc', 'docx'].includes(type)) return '📘';
    if (['xls', 'xlsx'].includes(type)) return '📗';
    if (['ppt', 'pptx'].includes(type)) return '📙';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) return '🖼️';
    if (['mp4', 'mov', 'avi'].includes(type)) return '🎬';
    if (['mp3', 'wav', 'aac'].includes(type)) return '🎵';
    if (['zip', 'rar', '7z'].includes(type)) return '📦';
    return '📄';
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>📁 {projectName} - {t.file.title}</h3>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        
        <div style={styles.content}>
          {/* 拖拽上传区域 */}
          <div style={styles.dropZone}>
            <p style={styles.dropText}>
              {uploading ? t.file.uploading : (isDragging ? t.file.dragHint : t.file.dragHint)}
            </p>
            <button
              style={{
                ...styles.selectBtn,
                opacity: uploading ? 0.6 : 1,
                cursor: uploading ? 'not-allowed' : 'pointer',
              }}
              onClick={handleSelectFiles}
              disabled={uploading}
            >
              {t.file.uploadBtn}
            </button>
          </div>

          {/* 文件列表 */}
          {isLoading ? (
            <p>{t.common.loading}</p>
          ) : files.length === 0 ? (
            <div style={styles.emptyState}>
              <p>{t.file.noFiles}</p>
              <p>{t.file.noFilesHint}</p>
            </div>
          ) : (
            <div style={styles.fileList}>
              {files.map((file) => (
                <div key={file.id} style={styles.fileItem}>
                  <div style={styles.fileIcon}>
                    {getFileIcon(file.file_type)}
                  </div>
                  <div style={styles.fileInfo}>
                    <p style={styles.fileName}>
                      {file.original_name}
                      {file.version > 1 && (
                        <span style={styles.versionBadge}>v{file.version}</span>
                      )}
                    </p>
                    <div style={styles.fileMeta}>
                      {formatFileSize(file.file_size)} · {new Date(file.updated_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={styles.fileActions}>
                    <button
                      style={{ ...styles.actionBtn, background: '#dbeafe', color: '#1d4ed8' }}
                      onClick={() => handleOpenFile(file.file_path)}
                    >
                      {t.file.openFile}
                    </button>
                    <button
                      style={{ ...styles.actionBtn, background: '#f3f4f6', color: '#4b5563' }}
                      onClick={() => handleShowInFolder(file.file_path)}
                    >
                      {t.file.showInFolder}
                    </button>
                    <button
                      style={{ ...styles.actionBtn, background: '#fee2e2', color: '#dc2626' }}
                      onClick={() => handleDeleteFile(file.id, file.original_name)}
                    >
                      {t.file.deleteFile}
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

export default ProjectFiles;
