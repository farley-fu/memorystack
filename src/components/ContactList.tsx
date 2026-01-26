// src/components/ContactList.tsx
import { forwardRef, useImperativeHandle, useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import ContactTimeline from './ContactTimeline';
import { SearchableDropdown } from './shared';
import { colors } from '../styles/theme';
import { useTranslation } from '../i18n';

export interface Contact {
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

interface ContactListProps {
  onEditContact?: (contact: Contact) => void;
}

export interface ContactListRef {
  refresh: () => Promise<void>;
}

const ContactList = forwardRef<ContactListRef, ContactListProps>(({ onEditContact }, ref) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingContact, setViewingContact] = useState<{id: number, name: string} | null>(null);
  const [highlightedContactId, setHighlightedContactId] = useState<number | null>(null);
  const contactRefs = useRef<Record<number, HTMLDivElement | null>>({});
  
  const { t } = useTranslation();

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const data: Contact[] = await invoke('get_contacts');
      setContacts(data);
    } catch (error) {
      console.error('获取联系人列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // 暴露refresh方法给父组件
  useImperativeHandle(ref, () => ({
    refresh: fetchContacts
  }));

  /** 处理搜索选择 - 定位到联系人 */
  const handleSearchSelect = (contact: Contact) => {
    setHighlightedContactId(contact.id);
    const el = contactRefs.current[contact.id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => setHighlightedContactId(null), 3000);
  };

  const formatTags = (tags: string | null) => {
    if (!tags) return [];
    return tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
  };

  const parsePhones = (phone: string | null): string[] => {
    if (!phone) return [];
    try {
      const parsed = JSON.parse(phone);
      return Array.isArray(parsed) ? parsed : [phone];
    } catch {
      return phone ? [phone] : [];
    }
  };

  const styles = {
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
    },
    title: {
      margin: 0,
      fontSize: '1.1em',
      color: '#374151',
    },
    refreshBtn: {
      padding: '6px 12px',
      background: '#f3f4f6',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '0.85em',
    },
    card: {
      border: '1px solid #e5e7eb',
      borderRadius: '10px',
      padding: '16px',
      background: 'white',
      marginBottom: '12px',
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '8px',
    },
    name: {
      margin: '0 0 2px 0',
      fontSize: '1.05em',
      color: '#1f2937',
    },
    subtitle: {
      margin: 0,
      color: '#6b7280',
      fontSize: '0.85em',
    },
    date: {
      fontSize: '0.75em',
      color: '#9ca3af',
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '8px',
      marginBottom: '10px',
    },
    infoItem: {
      fontSize: '0.85em',
      color: '#4b5563',
    },
    infoLabel: {
      color: '#9ca3af',
      marginRight: '4px',
    },
    tag: {
      display: 'inline-block',
      background: '#e0f2fe',
      color: '#0369a1',
      padding: '2px 8px',
      borderRadius: '12px',
      marginRight: '5px',
      marginBottom: '5px',
      fontSize: '0.75em',
    },
    notesBox: {
      marginTop: '10px',
      padding: '10px',
      background: '#f9fafb',
      borderRadius: '6px',
      fontSize: '0.85em',
      color: '#4b5563',
    },
    footer: {
      marginTop: '12px',
      paddingTop: '10px',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    footerInfo: {
      fontSize: '0.75em',
      color: '#9ca3af',
    },
    buttonGroup: {
      display: 'flex',
      gap: '8px',
    },
    timelineBtn: {
      padding: '6px 12px',
      background: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '0.85em',
      fontWeight: '500' as const,
    },
    editBtn: {
      padding: '6px 12px',
      background: '#f59e0b',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '0.85em',
      fontWeight: '500' as const,
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '40px',
      color: '#6b7280',
    },
  };

  return (
    <div>
      <div style={styles.header}>
        <h3 style={styles.title}>{t.contact.title}</h3>
        <button 
          onClick={fetchContacts} 
          disabled={isLoading}
          style={styles.refreshBtn}
        >
          {isLoading ? t.common.refreshing : t.common.refresh}
        </button>
      </div>

      {/* 搜索框 */}
      {contacts.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <SearchableDropdown
            items={contacts}
            onSelect={handleSearchSelect}
            placeholder={t.search.searchContact}
            displayField="name"
            searchFields={['name', 'title', 'company', 'tags']}
            renderItem={(contact) => (
              <div>
                <div style={{ fontWeight: 500 }}>{contact.name}</div>
                {(contact.title || contact.company) && (
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    {contact.title}{contact.title && contact.company && ' · '}{contact.company}
                  </div>
                )}
              </div>
            )}
            emptyMessage={t.search.noMatchContact}
          />
        </div>
      )}

      {isLoading ? (
        <p>{t.common.loading}</p>
      ) : contacts.length === 0 ? (
        <div style={styles.emptyState}>
          <p>{t.contact.noContacts}</p>
          <p>{t.contact.noContactsHint}</p>
        </div>
      ) : (
        <div>
          {contacts.map((contact) => {
            const phones = parsePhones(contact.phone);
            const tags = formatTags(contact.tags);
            
            return (
              <div 
                key={contact.id} 
                ref={(el) => { contactRefs.current[contact.id] = el; }}
                style={{
                  ...styles.card,
                  ...(highlightedContactId === contact.id ? {
                    boxShadow: `0 0 0 2px ${colors.primary.contact}, 0 4px 6px rgba(0,0,0,0.1)`,
                    background: '#ecfdf5',
                  } : {}),
                }}
              >
                <div style={styles.cardHeader}>
                  <div>
                    <h4 style={styles.name}>{contact.name}</h4>
                    {(contact.title || contact.company) && (
                      <p style={styles.subtitle}>
                        {contact.title}{contact.title && contact.company && ' · '}{contact.company}
                      </p>
                    )}
                  </div>
                  <span style={styles.date}>
                    {new Date(contact.updated_at).toLocaleDateString()}
                  </span>
                </div>

                {/* 联系信息 */}
                <div style={styles.infoGrid}>
                  {phones.length > 0 && (
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>{t.contact.phone}:</span>
                      {phones.join(' / ')}
                    </div>
                  )}
                  {contact.email && (
                    <div style={styles.infoItem}>
                      <span style={styles.infoLabel}>{t.contact.email}:</span>
                      {contact.email}
                    </div>
                  )}
                  {contact.address && (
                    <div style={{ ...styles.infoItem, gridColumn: 'span 2' }}>
                      <span style={styles.infoLabel}>{t.contact.address}:</span>
                      {contact.address}
                    </div>
                  )}
                </div>

                {/* 标签 */}
                {tags.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    {tags.map((tag) => (
                      <span key={tag} style={styles.tag}>{tag}</span>
                    ))}
                  </div>
                )}

                {/* 备注 */}
                {contact.notes && (
                  <div style={styles.notesBox}>
                    <strong>{t.contact.notes}:</strong>
                    <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>{contact.notes}</p>
                  </div>
                )}

                <div style={styles.footer}>
                  <div style={styles.footerInfo}>
                    <span>ID: {contact.id}</span>
                    <span style={{ marginLeft: '12px' }}>
                      {t.common.addedAt}: {new Date(contact.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={styles.buttonGroup}>
                    {onEditContact && (
                      <button
                        onClick={() => onEditContact(contact)}
                        style={styles.editBtn}
                      >
                        {t.common.edit}
                      </button>
                    )}
                    <button
                      onClick={() => setViewingContact({ id: contact.id, name: contact.name })}
                      style={styles.timelineBtn}
                    >
                      {t.contact.viewTimeline}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 联系人时间线模态框 */}
      {viewingContact && (
        <ContactTimeline
          contactId={viewingContact.id}
          contactName={viewingContact.name}
          isOpen={!!viewingContact}
          onClose={() => setViewingContact(null)}
        />
      )}
    </div>
  );
});

ContactList.displayName = 'ContactList';

export default ContactList;
