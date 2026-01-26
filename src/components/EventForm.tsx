/**
 * @file EventForm.tsx
 * @description 事件记录表单组件
 * 
 * 功能：创建/编辑事件，关联项目和联系人
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from './shared/ToastProvider';
import { SearchableDropdown } from './shared';
import { useTranslation } from '../i18n';

interface Project {
  id: number;
  name: string;
}

interface Contact {
  id: number;
  name: string;
  title: string | null;
}

interface Event {
  id: number;
  title: string;
  description: string | null;
  event_date: string;
  project_id: number | null;
  event_type: string | null;
  reminder_time: string | null;
  reminder_triggered: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventWithDetails {
  event: Event;
  contacts: Contact[];
  project_name: string | null;
}

interface EventFormProps {
  onEventCreated: () => void;
  editingEvent?: EventWithDetails | null;
  onEditComplete?: () => void;
}

// 事件类型键名（用于 i18n）
const EVENT_TYPE_KEYS = [
  'meeting', 'phone', 'email', 'wechat', 'qq', 
  'dingtalk', 'feishu', 'sms', 'ticket', 'video',
  'milestone', 'personal', 'other'
] as const;

function EventForm({ onEventCreated, editingEvent, onEditComplete }: EventFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState('');
  const [projectId, setProjectId] = useState<number | ''>('');
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 提醒相关状态
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  const { showToast } = useToast();

  // 编辑模式
  const isEditMode = !!editingEvent;

  useEffect(() => {
    loadData();
    if (!isEditMode) {
      const today = new Date().toISOString().split('T')[0];
      setEventDate(today);
      setReminderTime(`${today}T09:00`);
    }
  }, []);

  // 当 editingEvent 变化时，填充表单
  useEffect(() => {
    if (editingEvent) {
      const e = editingEvent.event;
      setTitle(e.title);
      setDescription(e.description || '');
      setEventDate(e.event_date);
      setEventType(e.event_type || '');
      setProjectId(e.project_id || '');
      setSelectedContactIds(editingEvent.contacts.map(c => c.id));
      
      if (e.reminder_time) {
        setReminderEnabled(true);
        // 转换格式: "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM"
        const dt = e.reminder_time.replace(' ', 'T').slice(0, 16);
        setReminderTime(dt);
      } else {
        setReminderEnabled(false);
        const today = new Date().toISOString().split('T')[0];
        setReminderTime(`${today}T09:00`);
      }
    }
  }, [editingEvent]);

  const loadData = async () => {
    try {
      const [projectsData, contactsData] = await Promise.all([
        invoke<Project[]>('get_projects'),
        invoke<Contact[]>('get_contacts'),
      ]);
      setProjects(projectsData);
      setContacts(contactsData);
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  };

  const handleContactToggle = (contactId: number) => {
    setSelectedContactIds(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      showToast({ type: 'warning', message: t.event.titleRequired });
      return;
    }
    
    if (!eventDate) {
      showToast({ type: 'warning', message: t.event.dateRequired });
      return;
    }
    
    if (selectedContactIds.length === 0) {
      showToast({ type: 'warning', message: t.event.contactRequired });
      return;
    }

    setIsLoading(true);
    try {
      // 将 datetime-local 格式转换为 YYYY-MM-DD HH:MM:SS 格式
      let reminderTimeStr: string | null = null;
      if (reminderEnabled && reminderTime) {
        const dt = new Date(reminderTime);
        reminderTimeStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:00`;
      }
      
      if (isEditMode && editingEvent) {
        // 更新事件
        await invoke('update_event', {
          eventId: editingEvent.event.id,
          title: title.trim(),
          description: description.trim() || null,
          eventDate,
          projectId: projectId || null,
          eventType: eventType || null,
          contactIds: selectedContactIds,
          reminderTime: reminderTimeStr,
        });
        
        showToast({ type: 'success', message: t.event.updateSuccess });
        onEditComplete?.();
      } else {
        // 创建事件
        await invoke('create_event', {
          title: title.trim(),
          description: description.trim() || null,
          eventDate,
          projectId: projectId || null,
          eventType: eventType || null,
          contactIds: selectedContactIds,
          reminderTime: reminderTimeStr,
        });
        
        showToast({ type: 'success', message: t.event.createSuccess });
      }
      
      resetForm();
      onEventCreated();
    } catch (err) {
      console.error(isEditMode ? '更新事件失败:' : '创建事件失败:', err);
      showToast({ type: 'error', message: `${t.event.createFailed}: ${err}` });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setTitle('');
    setDescription('');
    setEventDate(today);
    setEventType('');
    setProjectId('');
    setSelectedContactIds([]);
    setReminderEnabled(false);
    setReminderTime(`${today}T09:00`);
  };

  const handleCancel = () => {
    resetForm();
    onEditComplete?.();
  };

  const canSubmit = title.trim() && eventDate && selectedContactIds.length > 0 && !isLoading;

  return (
    <form onSubmit={handleSubmit} style={{
      ...styles.form,
      backgroundColor: isEditMode ? '#fffbeb' : '#fff',
    }}>
      <h3 style={styles.title}>{isEditMode ? t.event.editTitle : t.event.createTitle}</h3>
      
      {/* 事件标题 */}
      <div style={styles.field}>
        <label style={styles.label}>{t.event.eventTitle} *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.event.eventTitlePlaceholder}
          style={styles.input}
          disabled={isLoading}
        />
      </div>

      {/* 日期和类型 - 两列 */}
      <div style={styles.twoCol}>
        <div style={styles.halfField}>
          <label style={styles.label}>{t.event.date} *</label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            style={styles.input}
            disabled={isLoading}
          />
        </div>
        <div style={styles.halfField}>
          <label style={styles.label}>{t.event.type}</label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            style={styles.select}
            disabled={isLoading}
          >
            <option value="">{t.event.selectType}</option>
            {EVENT_TYPE_KEYS.map(key => (
              <option key={key} value={t.event.types[key]}>{t.event.types[key]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 关联项目 */}
      <div style={styles.field}>
        <label style={styles.label}>{t.event.relatedProject}</label>
        <select
          value={projectId}
          onChange={(e) => setProjectId(Number(e.target.value) || '')}
          style={styles.select}
          disabled={isLoading}
        >
          <option value="">{t.event.noProject}</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* 设置提醒 */}
      <div style={styles.field}>
        <label style={styles.reminderLabel}>
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            disabled={isLoading}
            style={{ marginRight: '8px' }}
          />
          {t.event.setReminder}
        </label>
        {reminderEnabled && (
          <div style={styles.reminderInputWrapper}>
            <input
              type="datetime-local"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              style={styles.input}
              disabled={isLoading}
            />
            <span style={styles.reminderHint}>{t.event.reminderHint}</span>
          </div>
        )}
      </div>

      {/* 相关联系人 */}
      <div style={styles.field}>
        <label style={styles.label}>
          {t.event.relatedContacts} * 
          <span style={styles.hint}>（{t.event.selectedCount.replace('{count}', String(selectedContactIds.length))}）</span>
        </label>
        
        {/* 联系人搜索框 */}
        {contacts.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <SearchableDropdown
              items={contacts.filter(c => !selectedContactIds.includes(c.id))}
              onSelect={(contact) => {
                setSelectedContactIds(prev => [...prev, contact.id]);
              }}
              placeholder={t.search.searchContactQuick}
              displayField="name"
              searchFields={['name', 'title']}
              renderItem={(contact) => (
                <div>
                  <span style={{ fontWeight: 500 }}>{contact.name}</span>
                  {contact.title && (
                    <span style={{ color: '#6b7280', marginLeft: '6px' }}>
                      - {contact.title}
                    </span>
                  )}
                </div>
              )}
              emptyMessage={t.search.noMatchContact}
            />
          </div>
        )}
        
        {/* 已选联系人列表 */}
        <div style={styles.contactGrid}>
          {contacts.length === 0 ? (
            <p style={styles.emptyHint}>{t.event.noContactsAvailable}</p>
          ) : selectedContactIds.length === 0 ? (
            <p style={styles.emptyHint}>{t.event.searchContactHint}</p>
          ) : null}
          {contacts
            .filter(c => selectedContactIds.includes(c.id))
            .map(c => (
              <label key={c.id} style={{
                ...styles.contactItem,
                backgroundColor: '#dbeafe',
                borderColor: '#3b82f6',
              }}>
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => handleContactToggle(c.id)}
                  disabled={isLoading}
                  style={{ marginRight: '6px' }}
                />
                <span style={styles.contactName}>{c.name}</span>
                {c.title && <span style={styles.contactTitle}> - {c.title}</span>}
              </label>
            ))}
          {contacts
            .filter(c => !selectedContactIds.includes(c.id))
            .map(c => (
              <label key={c.id} style={{
                ...styles.contactItem,
                backgroundColor: '#fff',
                borderColor: '#e5e7eb',
              }}>
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => handleContactToggle(c.id)}
                  disabled={isLoading}
                  style={{ marginRight: '6px' }}
                />
                <span style={styles.contactName}>{c.name}</span>
                {c.title && <span style={styles.contactTitle}> - {c.title}</span>}
              </label>
            ))}
        </div>
      </div>

      {/* 事件描述 */}
      <div style={styles.field}>
        <label style={styles.label}>{t.event.description}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t.event.descriptionPlaceholder}
          style={styles.textarea}
          disabled={isLoading}
        />
      </div>

      <div style={styles.buttonRow}>
        {isEditMode && (
          <button
            type="button"
            onClick={handleCancel}
            style={styles.cancelBtn}
            disabled={isLoading}
          >
            {t.common.cancel}
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            ...styles.submitBtn,
            opacity: canSubmit ? 1 : 0.5,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            flex: isEditMode ? 1 : undefined,
            width: isEditMode ? undefined : '100%',
          }}
        >
          {isLoading 
            ? (isEditMode ? t.common.updating : t.common.saving)
            : (isEditMode ? t.common.update : t.event.saveBtn)
          }
        </button>
      </div>
    </form>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  form: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  field: {
    marginBottom: '14px',
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '14px',
  },
  halfField: {
    minWidth: 0,
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },
  hint: {
    fontWeight: 400,
    color: '#6b7280',
    marginLeft: '6px',
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
    padding: '8px 36px 8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
  },
  textarea: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    minHeight: '70px',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  contactGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '10px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
    maxHeight: '120px',
    overflowY: 'auto',
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: '4px',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'background-color 0.15s',
  },
  contactName: {
    fontWeight: 500,
    color: '#1a1a1a',
  },
  contactTitle: {
    color: '#6b7280',
    fontSize: '12px',
  },
  emptyHint: {
    margin: 0,
    color: '#9ca3af',
    fontSize: '13px',
  },
  reminderLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
  },
  reminderInputWrapper: {
    marginTop: '8px',
    paddingLeft: '24px',
  },
  reminderHint: {
    display: 'block',
    marginTop: '4px',
    fontSize: '12px',
    color: '#6b7280',
  },
  submitBtn: {
    padding: '10px',
    backgroundColor: '#8b5cf6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
  },
  buttonRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '4px',
  },
  cancelBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export default EventForm;
