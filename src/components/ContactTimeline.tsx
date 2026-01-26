import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
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
}

interface EventWithDetails {
  event: Event;
  contacts: Contact[];
  project_name: string | null;
}

interface ContactTimelineProps {
  contactId: number;
  contactName: string;
  isOpen: boolean;
  onClose: () => void;
}

function ContactTimeline({ contactId, contactName, isOpen, onClose }: ContactTimelineProps) {
  const { t, language } = useTranslation();
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && contactId) {
      loadTimeline();
    }
  }, [isOpen, contactId]);

  const loadTimeline = async () => {
    setIsLoading(true);
    try {
      const data = await invoke<EventWithDetails[]>('get_contact_timeline', { contactId });
      setEvents(data);
    } catch (err) {
      console.error('加载时间线失败:', err);
    } finally {
      setIsLoading(false);
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

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{contactName}</h2>
            <p style={styles.subtitle}>{t.timeline.contactTitle}</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        <div style={styles.content}>
          {isLoading ? (
            <div style={styles.loading}>{t.common.loading}</div>
          ) : events.length === 0 ? (
            <div style={styles.empty}>
              <p>{t.timeline.noContactEvents}</p>
              <p style={styles.emptyHint}>{t.timeline.noContactEventsHint}</p>
            </div>
          ) : (
            <div style={styles.timeline}>
              {events.map(item => (
                <div key={item.event.id} style={styles.eventCard}>
                  <div style={styles.dateCol}>
                    <span style={styles.dateBadge}>{formatDate(item.event.event_date)}</span>
                  </div>
                  <div style={styles.eventContent}>
                    <div style={styles.eventHeader}>
                      <span style={styles.eventTitle}>{item.event.title}</span>
                      {item.event.event_type && (
                        <span style={styles.eventType}>{item.event.event_type}</span>
                      )}
                    </div>
                    {item.project_name && (
                      <span style={styles.projectTag}>{item.project_name}</span>
                    )}
                    {item.contacts.length > 1 && (
                      <div style={styles.otherContacts}>
                        {t.timeline.otherParticipants}: {item.contacts.filter(c => c.id !== contactId).map(c => c.name).join('、')}
                      </div>
                    )}
                    {item.event.description && (
                      <p style={styles.description}>{item.event.description}</p>
                    )}
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

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px 24px',
    borderBottom: '1px solid #eee',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#6b7280',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
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
  },
  emptyHint: {
    margin: '8px 0 0 0',
    fontSize: '13px',
    color: '#9ca3af',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  eventCard: {
    display: 'flex',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    borderLeft: '3px solid #10b981',
  },
  dateCol: {
    flexShrink: 0,
  },
  dateBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: '#10b981',
    color: '#fff',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  eventContent: {
    flex: 1,
    minWidth: 0,
  },
  eventHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
    flexWrap: 'wrap',
  },
  eventTitle: {
    fontWeight: 500,
    fontSize: '15px',
    color: '#1a1a1a',
  },
  eventType: {
    padding: '2px 8px',
    backgroundColor: '#e5e7eb',
    color: '#4b5563',
    borderRadius: '4px',
    fontSize: '12px',
  },
  projectTag: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    marginBottom: '6px',
  },
  otherContacts: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '6px',
  },
  description: {
    margin: '8px 0 0 0',
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: 1.5,
    backgroundColor: '#fff',
    padding: '10px',
    borderRadius: '4px',
  },
};

export default ContactTimeline;
