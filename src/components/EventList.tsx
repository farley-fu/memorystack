import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { SearchableDropdown } from './shared';
import { colors } from '../styles/theme';
import { useTranslation } from '../i18n';

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

// 用于搜索的扁平化事件结构
interface FlatEvent {
  id: number;
  title: string;
  description: string | null;
  event_type: string | null;
  event_date: string;
  project_name: string | null;
}

export interface EventListRef {
  refresh: () => Promise<void>;
}

interface EventListProps {
  onEditEvent?: (event: EventWithDetails) => void;
}

const EventList = forwardRef<EventListRef, EventListProps>(({ onEditEvent }, ref) => {
  const { t, language } = useTranslation();
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [todayReminderIds, setTodayReminderIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [highlightedEventId, setHighlightedEventId] = useState<number | null>(null);
  const eventRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const [eventsData, reminderIds] = await Promise.all([
        invoke<EventWithDetails[]>('get_all_events'),
        invoke<number[]>('get_today_reminder_events'),
      ]);
      setEvents(eventsData);
      setTodayReminderIds(reminderIds);
    } catch (err) {
      console.error('获取事件列表失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useImperativeHandle(ref, () => ({
    refresh: fetchEvents
  }));

  // 扁平化事件用于搜索
  const flatEvents: FlatEvent[] = events.map(e => ({
    id: e.event.id,
    title: e.event.title,
    description: e.event.description,
    event_type: e.event.event_type,
    event_date: e.event.event_date,
    project_name: e.project_name,
  }));

  /** 处理搜索选择 - 定位到事件 */
  const handleSearchSelect = (flatEvent: FlatEvent) => {
    setHighlightedEventId(flatEvent.id);
    const el = eventRefs.current[flatEvent.id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => setHighlightedEventId(null), 3000);
  };

  const handleDelete = async (eventId: number) => {
    try {
      await invoke('delete_event', { eventId });
      await fetchEvents();
    } catch (err) {
      console.error('删除事件失败:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return <div style={styles.loading}>{t.common.loading}</div>;
  }

  if (events.length === 0) {
    return (
      <div style={styles.empty}>
        <p>{t.event.noEvents}</p>
        <p style={styles.emptyHint}>{t.event.noEventsHint}</p>
      </div>
    );
  }

  // 分离今日有提醒的事件和其他事件
  const todayReminderEvents = events.filter(e => todayReminderIds.includes(e.event.id));
  const otherEvents = events.filter(e => !todayReminderIds.includes(e.event.id));

  // 按日期分组（仅对非提醒事件）
  const groupedEvents: { [key: string]: EventWithDetails[] } = {};
  otherEvents.forEach(e => {
    const date = e.event.event_date;
    if (!groupedEvents[date]) {
      groupedEvents[date] = [];
    }
    groupedEvents[date].push(e);
  });

  // 格式化提醒时间
  const formatReminderTime = (reminderTime: string | null) => {
    if (!reminderTime) return '';
    const dt = new Date(reminderTime.replace(' ', 'T'));
    return dt.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>{t.event.title} ({events.length})</h3>
        <button onClick={fetchEvents} style={styles.refreshBtn}>{t.common.refresh}</button>
      </div>

      {/* 搜索框 */}
      {events.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <SearchableDropdown
            items={flatEvents}
            onSelect={handleSearchSelect}
            placeholder={t.search.searchEvent}
            displayField="title"
            searchFields={['title', 'description', 'event_type', 'project_name']}
            renderItem={(event) => (
              <div>
                <div style={{ fontWeight: 500 }}>{event.title}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                  {event.event_date} {event.event_type && `· ${event.event_type}`} {event.project_name && `· ${event.project_name}`}
                </div>
              </div>
            )}
            emptyMessage={t.search.noMatchEvent}
          />
        </div>
      )}

      <div style={styles.timeline}>
        {/* 今日提醒事件置顶显示 */}
        {todayReminderEvents.length > 0 && (
          <div style={styles.dayGroup}>
            <div style={styles.dateHeader}>
              <span style={styles.reminderBadge}>{t.event.todayReminders} ({todayReminderEvents.length})</span>
            </div>
            {todayReminderEvents.map(item => (
              <div 
                key={item.event.id} 
                ref={(el) => { eventRefs.current[item.event.id] = el; }}
                style={{
                  ...styles.eventCard,
                  ...styles.reminderCard,
                  ...(highlightedEventId === item.event.id ? {
                    boxShadow: `0 0 0 2px ${colors.primary.event}, 0 4px 6px rgba(0,0,0,0.1)`,
                  } : {}),
                }}
              >
                <div style={styles.eventHeader}>
                  <div style={styles.eventTitleRow}>
                    <span style={styles.reminderIcon}>🔔</span>
                    <span style={styles.eventTitle}>{item.event.title}</span>
                    {item.event.event_type && (
                      <span style={styles.eventType}>{item.event.event_type}</span>
                    )}
                    {item.event.reminder_time && (
                      <span style={styles.reminderTimeTag}>
                        {formatReminderTime(item.event.reminder_time)}
                      </span>
                    )}
                  </div>
                  <div style={styles.actionBtns}>
                    {onEditEvent && (
                      <button
                        onClick={() => onEditEvent(item)}
                        style={styles.editBtn}
                      >
                        {t.common.edit}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.event.id)}
                      style={styles.deleteBtn}
                    >
                      {t.common.delete}
                    </button>
                  </div>
                </div>
                
                <div style={styles.eventMeta}>
                  {item.project_name && (
                    <span style={styles.projectTag}>{item.project_name}</span>
                  )}
                  <span style={styles.contactList}>
                    {item.contacts.map(c => c.name).join('、')}
                  </span>
                </div>
                
                {item.event.description && (
                  <p style={styles.description}>{item.event.description}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 按日期分组的其他事件 */}
        {Object.entries(groupedEvents).map(([date, dayEvents]) => (
          <div key={date} style={styles.dayGroup}>
            <div style={styles.dateHeader}>
              <span style={styles.dateBadge}>{formatDate(date)}</span>
            </div>
            {dayEvents.map(item => (
              <div 
                key={item.event.id} 
                ref={(el) => { eventRefs.current[item.event.id] = el; }}
                style={{
                  ...styles.eventCard,
                  ...(highlightedEventId === item.event.id ? {
                    boxShadow: `0 0 0 2px ${colors.primary.event}, 0 4px 6px rgba(0,0,0,0.1)`,
                    background: '#faf5ff',
                  } : {}),
                }}
              >
                <div style={styles.eventHeader}>
                  <div style={styles.eventTitleRow}>
                    <span style={styles.eventTitle}>{item.event.title}</span>
                    {item.event.event_type && (
                      <span style={styles.eventType}>{item.event.event_type}</span>
                    )}
                    {item.event.reminder_time && (
                      <span style={styles.reminderTimeTag}>
                        🔔 {formatReminderTime(item.event.reminder_time)}
                      </span>
                    )}
                  </div>
                  <div style={styles.actionBtns}>
                    {onEditEvent && (
                      <button
                        onClick={() => onEditEvent(item)}
                        style={styles.editBtn}
                      >
                        {t.common.edit}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.event.id)}
                      style={styles.deleteBtn}
                    >
                      {t.common.delete}
                    </button>
                  </div>
                </div>
                
                <div style={styles.eventMeta}>
                  {item.project_name && (
                    <span style={styles.projectTag}>{item.project_name}</span>
                  )}
                  <span style={styles.contactList}>
                    {item.contacts.map(c => c.name).join('、')}
                  </span>
                </div>
                
                {item.event.description && (
                  <p style={styles.description}>{item.event.description}</p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
});

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  refreshBtn: {
    padding: '6px 12px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
  },
  empty: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px dashed #d1d5db',
  },
  emptyHint: {
    margin: '8px 0 0 0',
    fontSize: '13px',
    color: '#9ca3af',
  },
  timeline: {
    flex: 1,
    overflowY: 'auto',
  },
  dayGroup: {
    marginBottom: '20px',
  },
  dateHeader: {
    marginBottom: '10px',
  },
  dateBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#8b5cf6',
    color: '#fff',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 500,
  },
  reminderBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#f97316',
    color: '#fff',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 500,
  },
  eventCard: {
    padding: '14px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '10px',
    marginLeft: '16px',
    borderLeft: '3px solid #8b5cf6',
  },
  reminderCard: {
    borderLeftColor: '#f97316',
    backgroundColor: '#fff7ed',
  },
  reminderIcon: {
    fontSize: '14px',
  },
  reminderTimeTag: {
    padding: '2px 8px',
    backgroundColor: '#ffedd5',
    color: '#c2410c',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  eventTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  eventTitle: {
    fontWeight: 500,
    fontSize: '15px',
    color: '#1a1a1a',
  },
  eventType: {
    padding: '2px 8px',
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    borderRadius: '4px',
    fontSize: '12px',
  },
  deleteBtn: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#dc2626',
    fontSize: '12px',
    cursor: 'pointer',
  },
  editBtn: {
    padding: '4px 8px',
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    color: '#92400e',
    fontSize: '12px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  actionBtns: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  eventMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  projectTag: {
    padding: '2px 8px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  contactList: {
    fontSize: '13px',
    color: '#6b7280',
  },
  description: {
    margin: '8px 0 0 0',
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: 1.5,
    backgroundColor: '#f9fafb',
    padding: '10px',
    borderRadius: '4px',
  },
};

export default EventList;
