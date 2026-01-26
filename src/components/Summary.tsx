/**
 * @file Summary.tsx
 * @description 总结组件 - 显示和生成工作总结
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from './shared/ToastProvider';
import { useTranslation } from '../i18n';

interface SummaryData {
  id: number;
  title: string;
  summary_type: string;
  start_date: string;
  end_date: string;
  content: string;
  statistics: string | null;
  is_auto_generated: boolean;
  created_at: string;
}

function Summary() {
  const [summaries, setSummaries] = useState<SummaryData[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 生成表单状态
  const [summaryType, setSummaryType] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const { showToast } = useToast();
  const { t } = useTranslation();

  // 获取总结类型标签
  const getSummaryTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'daily': t.summary.types.daily,
      'weekly': t.summary.types.weekly,
      'monthly': t.summary.types.monthly,
      'yearly': t.summary.types.yearly,
      'custom': t.summary.types.custom,
    };
    return labels[type] || type;
  };

  useEffect(() => {
    fetchSummaries();
    // 设置默认日期为昨天
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    setStartDate(dateStr);
    setEndDate(dateStr);
  }, []);

  const fetchSummaries = async () => {
    setIsLoading(true);
    try {
      const data = await invoke<SummaryData[]>('get_summaries');
      setSummaries(data);
    } catch (err) {
      console.error('获取总结列表失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypeChange = (type: string) => {
    setSummaryType(type);
    const today = new Date();
    
    if (type === 'daily') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];
      setStartDate(dateStr);
      setEndDate(dateStr);
    } else if (type === 'weekly') {
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      setStartDate(lastWeekStart.toISOString().split('T')[0]);
      setEndDate(lastWeekEnd.toISOString().split('T')[0]);
    } else if (type === 'monthly') {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(lastMonth.toISOString().split('T')[0]);
      setEndDate(lastMonthEnd.toISOString().split('T')[0]);
    } else if (type === 'yearly') {
      const lastYear = new Date(today.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
      setStartDate(lastYear.toISOString().split('T')[0]);
      setEndDate(lastYearEnd.toISOString().split('T')[0]);
    }
  };

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      showToast({ type: 'warning', message: '请选择日期范围' });
      return;
    }
    
    setIsGenerating(true);
    try {
      const summary = await invoke<SummaryData>('generate_summary', {
        summaryType,
        startDate,
        endDate,
      });
      showToast({ type: 'success', message: '总结生成成功！' });
      setSummaries(prev => [summary, ...prev]);
      setSelectedSummary(summary);
    } catch (err) {
      console.error('生成总结失败:', err);
      showToast({ type: 'error', message: `生成失败: ${err}` });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (summaryId: number) => {
    try {
      await invoke('delete_summary', { summaryId });
      setSummaries(prev => prev.filter(s => s.id !== summaryId));
      if (selectedSummary?.id === summaryId) {
        setSelectedSummary(null);
      }
      showToast({ type: 'success', message: '总结已删除' });
    } catch (err) {
      console.error('删除总结失败:', err);
      showToast({ type: 'error', message: `删除失败: ${err}` });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={styles.container}>
      {/* 左侧：生成表单和列表 */}
      <div style={styles.leftPanel}>
        {/* 生成表单 */}
        <div style={styles.generateForm}>
          <h3 style={styles.formTitle}>生成工作总结</h3>
          
          <div style={styles.formField}>
            <label style={styles.label}>总结类型</label>
            <select
              value={summaryType}
              onChange={(e) => handleTypeChange(e.target.value)}
              style={styles.select}
              disabled={isGenerating}
            >
              <option value="daily">日总结</option>
              <option value="weekly">周总结</option>
              <option value="monthly">月总结</option>
              <option value="yearly">年总结</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          
          <div style={styles.dateRow}>
            <div style={styles.dateField}>
              <label style={styles.label}>开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={styles.input}
                disabled={isGenerating}
              />
            </div>
            <div style={styles.dateField}>
              <label style={styles.label}>结束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={styles.input}
                disabled={isGenerating}
              />
            </div>
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              ...styles.generateBtn,
              opacity: isGenerating ? 0.6 : 1,
            }}
          >
            {isGenerating ? '生成中...' : '生成总结'}
          </button>
        </div>
        
        {/* 总结列表 */}
        <div style={styles.listSection}>
          <h3 style={styles.listTitle}>历史总结 ({summaries.length})</h3>
          
          {isLoading ? (
            <div style={styles.loading}>加载中...</div>
          ) : summaries.length === 0 ? (
            <div style={styles.empty}>暂无总结记录</div>
          ) : (
            <div style={styles.summaryList}>
              {summaries.map(s => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSummary(s)}
                  style={{
                    ...styles.summaryItem,
                    ...(selectedSummary?.id === s.id ? styles.selectedItem : {}),
                  }}
                >
                  <div style={styles.itemHeader}>
                    <span style={styles.typeTag}>{getSummaryTypeLabel(s.summary_type)}</span>
                    {s.is_auto_generated && <span style={styles.autoTag}>自动</span>}
                  </div>
                  <div style={styles.itemTitle}>{s.start_date} 至 {s.end_date}</div>
                  <div style={styles.itemMeta}>{formatDate(s.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* 右侧：总结详情 */}
      <div style={styles.rightPanel}>
        {selectedSummary ? (
          <>
            <div style={styles.detailHeader}>
              <h3 style={styles.detailTitle}>{selectedSummary.title}</h3>
              <button
                onClick={() => handleDelete(selectedSummary.id)}
                style={styles.deleteBtn}
              >
                删除
              </button>
            </div>
            <div style={styles.detailContent}>
              <pre style={styles.contentPre}>{selectedSummary.content}</pre>
            </div>
          </>
        ) : (
          <div style={styles.noSelection}>
            <p>选择左侧的总结查看详情</p>
            <p style={styles.noSelectionHint}>或生成新的工作总结</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    height: '100%',
    gap: '20px',
  },
  leftPanel: {
    width: '320px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  generateForm: {
    padding: '16px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  formTitle: {
    margin: '0 0 16px 0',
    fontSize: '15px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  formField: {
    marginBottom: '12px',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  dateRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '14px',
  },
  dateField: {
    flex: 1,
  },
  generateBtn: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  listSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  listTitle: {
    margin: '0 0 12px 0',
    fontSize: '15px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  loading: {
    padding: '20px',
    textAlign: 'center',
    color: '#6b7280',
  },
  empty: {
    padding: '20px',
    textAlign: 'center',
    color: '#9ca3af',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px dashed #d1d5db',
  },
  summaryList: {
    flex: 1,
    overflowY: 'auto',
  },
  summaryItem: {
    padding: '12px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  selectedItem: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  itemHeader: {
    display: 'flex',
    gap: '6px',
    marginBottom: '6px',
  },
  typeTag: {
    padding: '2px 8px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  autoTag: {
    padding: '2px 8px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  itemTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#1a1a1a',
    marginBottom: '4px',
  },
  itemMeta: {
    fontSize: '12px',
    color: '#6b7280',
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    minWidth: 0,
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
  },
  detailTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  deleteBtn: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: '1px solid #dc2626',
    color: '#dc2626',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  detailContent: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto',
  },
  contentPre: {
    margin: 0,
    fontFamily: 'inherit',
    fontSize: '14px',
    lineHeight: 1.6,
    color: '#374151',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  noSelection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#6b7280',
  },
  noSelectionHint: {
    margin: '8px 0 0 0',
    fontSize: '13px',
    color: '#9ca3af',
  },
};

export default Summary;
