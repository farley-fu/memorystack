/**
 * @file FileSearch.tsx
 * @description 全局文件搜索组件
 * 
 * 功能：搜索所有项目中的文件
 */

// src/components/FileSearch.tsx
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
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

interface ProjectFileWithProject {
  file: ProjectFile;
  project_name: string;
}

function FileSearch() {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<ProjectFileWithProject[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const { showToast } = useToast();

  const handleSearch = async () => {
    if (!keyword.trim()) {
      showToast({ type: 'warning', message: t.search.keywordRequired });
      return;
    }
    
    setIsSearching(true);
    setHasSearched(true);
    try {
      const data: ProjectFileWithProject[] = await invoke('search_files', { keyword: keyword.trim() });
      setResults(data);
      if (data.length === 0) {
        showToast({ type: 'info', message: t.search.noResults });
      }
    } catch (error) {
      console.error('搜索文件失败:', error);
      showToast({ type: 'error', message: `${t.search.searchFailed}: ${error}` });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
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

  const formatFileSize = (size: number | null): string => {
    if (!size) return '-';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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

  // 高亮匹配文字
  const highlightText = (text: string, keyword: string) => {
    if (!keyword.trim()) return text;
    const regex = new RegExp(`(${keyword})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} style={{ background: '#fef08a', padding: 0 }}>{part}</mark> : part
    );
  };

  const styles = {
    container: {
      padding: '16px',
      background: '#f9fafb',
      borderRadius: '10px',
      border: '1px solid #e5e7eb',
      marginBottom: '20px',
    },
    title: {
      margin: '0 0 12px 0',
      fontSize: '1em',
      color: '#374151',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    searchBox: {
      display: 'flex',
      gap: '8px',
    },
    input: {
      flex: 1,
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '0.95em',
    },
    searchBtn: {
      padding: '8px 16px',
      background: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '0.9em',
      fontWeight: '500' as const,
    },
    results: {
      marginTop: '16px',
    },
    resultCount: {
      fontSize: '0.85em',
      color: '#6b7280',
      marginBottom: '10px',
    },
    fileList: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
    },
    fileItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '10px 12px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      background: 'white',
    },
    fileIcon: {
      width: '36px',
      height: '36px',
      background: '#f3f4f6',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: '10px',
      fontSize: '1.1em',
    },
    fileInfo: {
      flex: 1,
      minWidth: 0,
    },
    fileName: {
      margin: 0,
      fontSize: '0.9em',
      color: '#1f2937',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    fileMeta: {
      fontSize: '0.75em',
      color: '#9ca3af',
      marginTop: '2px',
    },
    projectBadge: {
      background: '#dbeafe',
      color: '#1d4ed8',
      padding: '1px 6px',
      borderRadius: '4px',
      fontSize: '0.75em',
      marginRight: '6px',
    },
    fileActions: {
      display: 'flex',
      gap: '4px',
    },
    actionBtn: {
      padding: '4px 8px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '0.75em',
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '20px',
      color: '#9ca3af',
      fontSize: '0.9em',
    },
  };

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>
        🔍 {t.search.title}
      </h4>
      <div style={styles.searchBox}>
        <input
          type="text"
          placeholder={t.search.placeholder}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyPress={handleKeyPress}
          style={styles.input}
        />
        <button
          onClick={handleSearch}
          disabled={isSearching || !keyword.trim()}
          style={{
            ...styles.searchBtn,
            opacity: isSearching || !keyword.trim() ? 0.6 : 1,
            cursor: isSearching || !keyword.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {isSearching ? t.search.searching : t.search.searchBtn}
        </button>
      </div>

      {hasSearched && (
        <div style={styles.results}>
          <div style={styles.resultCount}>
            {t.search.totalRecords.replace('{count}', String(results.length))}
          </div>
          
          {results.length === 0 ? (
            <div style={styles.emptyState}>
              {t.search.noResults}
            </div>
          ) : (
            <div style={styles.fileList}>
              {results.map((item) => (
                <div key={item.file.id} style={styles.fileItem}>
                  <div style={styles.fileIcon}>
                    {getFileIcon(item.file.file_type)}
                  </div>
                  <div style={styles.fileInfo}>
                    <p style={styles.fileName}>
                      {highlightText(item.file.original_name, keyword)}
                    </p>
                    <div style={styles.fileMeta}>
                      <span style={styles.projectBadge}>{item.project_name}</span>
                      {formatFileSize(item.file.file_size)} · {new Date(item.file.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={styles.fileActions}>
                    <button
                      style={{ ...styles.actionBtn, background: '#dbeafe', color: '#1d4ed8' }}
                      onClick={() => handleOpenFile(item.file.file_path)}
                    >
                      {t.file.openFile}
                    </button>
                    <button
                      style={{ ...styles.actionBtn, background: '#f3f4f6', color: '#4b5563' }}
                      onClick={() => handleShowInFolder(item.file.file_path)}
                    >
                      {t.file.showInFolder}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FileSearch;
