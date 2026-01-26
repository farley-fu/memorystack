// src/components/ProjectContactManager.tsx
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from '../i18n';

interface Contact {
  id: number;
  name: string;
  title: string | null;
  tags: string | null;
}

interface LinkedContact {
  contact: Contact;
  role: string | null;
  project_notes: string | null;
}

interface ProjectContactManagerProps {
  projectId: number;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

function ProjectContactManager({ projectId, projectName, isOpen, onClose }: ProjectContactManagerProps) {
  const { t } = useTranslation();
  const [linkedContacts, setLinkedContacts] = useState<LinkedContact[]>([]);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<number | ''>('');
  const [role, setRole] = useState('');
  const [projectNotes, setProjectNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  const loadProjectContacts = async () => {
    if (!projectId) return;
    
    setIsInitialLoading(true);
    setError(null);
    
    try {
      const rawData: any[] = await invoke('get_project_contacts', { projectId });
      
      if (!rawData || !Array.isArray(rawData)) {
        setError(t.projectContact.dataError);
        return;
      }
      
      const formattedContacts: LinkedContact[] = rawData
        .filter(item => Array.isArray(item) && item.length >= 3)
        .map(([contactData, roleValue, notesValue]) => ({
          contact: {
            id: contactData?.id || 0,
            name: contactData?.name || t.projectContact.unknownContact,
            title: contactData?.title || null,
            tags: contactData?.tags || null,
          },
          role: roleValue || null,
          project_notes: notesValue || null,
        }));
      
      setLinkedContacts(formattedContacts);
      await loadAvailableContacts(formattedContacts);
      
    } catch (err) {
      setError(`${t.projectContact.loadFailed}: ${err}`);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const loadAvailableContacts = async (currentLinkedContacts: LinkedContact[] = linkedContacts) => {
    try {
      const allContacts: any[] = await invoke('get_contacts');
      const formattedContacts: Contact[] = allContacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        title: contact.title || null,
        tags: contact.tags || null,
      }));
      
      const linkedIds = new Set(currentLinkedContacts.map(lc => lc.contact.id));
      setAvailableContacts(formattedContacts.filter(c => !linkedIds.has(c.id)));
    } catch (err) {
      console.error('加载联系人失败:', err);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      loadProjectContacts();
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    if (isOpen && projectId) {
      loadAvailableContacts(linkedContacts);
    }
  }, [linkedContacts, isOpen, projectId]);

  const handleLinkContact = async () => {
    if (!selectedContactId) return;

    const selectedContact = availableContacts.find(c => c.id === selectedContactId);
    if (!selectedContact) return;

    const newLinkedContact: LinkedContact = {
      contact: selectedContact,
      role: role.trim() || null,
      project_notes: projectNotes.trim() || null,
    };

    const oldLinkedContacts = [...linkedContacts];
    const oldAvailableContacts = [...availableContacts];
    
    setLinkedContacts(prev => [newLinkedContact, ...prev]);
    setAvailableContacts(prev => prev.filter(c => c.id !== selectedContactId));
    setSelectedContactId('');
    setRole('');
    setProjectNotes('');
    setShowOptions(false);
    setIsLoading(true);
    setError(null);

    try {
      await invoke('link_contact_project', {
        projectId,
        contactId: selectedContactId,
        role: role.trim() || null,
        notes: projectNotes.trim() || null,
      });
    } catch (err) {
      setError(`${t.projectContact.linkFailed}: ${err}`);
      setLinkedContacts(oldLinkedContacts);
      setAvailableContacts(oldAvailableContacts);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlinkContact = async (contactId: number) => {
    if (isLoading || isInitialLoading) return;

    const contactToUnlink = linkedContacts.find(lc => lc.contact.id === contactId);
    if (!contactToUnlink) return;

    const oldLinkedContacts = [...linkedContacts];
    const oldAvailableContacts = [...availableContacts];
    
    setLinkedContacts(prev => prev.filter(lc => lc.contact.id !== contactId));
    setAvailableContacts(prev => [...prev, contactToUnlink.contact]);
    setIsLoading(true);
    setError(null);

    try {
      await invoke('unlink_contact_project', { projectId, contactId });
    } catch (err) {
      setLinkedContacts(oldLinkedContacts);
      setAvailableContacts(oldAvailableContacts);
      setError(`${t.projectContact.unlinkFailed}: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>{projectName}</h2>
            <p style={styles.subtitle}>{t.projectContact.manageTitle}</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        {/* 错误提示 */}
        {error && <div style={styles.error}>{error}</div>}

        {/* 添加联系人 */}
        <div style={styles.addSection}>
          <div style={styles.addRow}>
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(Number(e.target.value) || '')}
              style={styles.select}
              disabled={isLoading || isInitialLoading || availableContacts.length === 0}
            >
              <option value="">{t.projectContact.selectContact}</option>
              {availableContacts.map(contact => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}{contact.title ? ` - ${contact.title}` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={handleLinkContact}
              disabled={!selectedContactId || isLoading}
              style={{
                ...styles.addBtn,
                opacity: (!selectedContactId || isLoading) ? 0.5 : 1,
              }}
            >
              {t.projectContact.addBtn}
            </button>
          </div>
          
          {selectedContactId && (
            <div style={styles.optionsToggle}>
              <button 
                onClick={() => setShowOptions(!showOptions)}
                style={styles.toggleBtn}
              >
                {showOptions ? t.projectContact.collapseOptions : t.projectContact.addOptions}
              </button>
            </div>
          )}
          
          {showOptions && selectedContactId && (
            <div style={styles.optionsPanel}>
              <input
                type="text"
                placeholder={t.projectContact.rolePlaceholder}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={styles.input}
              />
              <textarea
                placeholder={t.projectContact.notesPlaceholder}
                value={projectNotes}
                onChange={(e) => setProjectNotes(e.target.value)}
                style={styles.textarea}
              />
            </div>
          )}
          
          {availableContacts.length === 0 && !isInitialLoading && (
            <p style={styles.hint}>{t.projectContact.noAvailable}</p>
          )}
        </div>

        {/* 已关联联系人列表 */}
        <div style={styles.listSection}>
          <div style={styles.listHeader}>
            <span style={styles.listTitle}>
              {t.projectContact.linkedCount} ({linkedContacts.length})
            </span>
          </div>
          
          {isInitialLoading ? (
            <div style={styles.loading}>{t.common.loading}</div>
          ) : linkedContacts.length === 0 ? (
            <div style={styles.empty}>
              <p>{t.projectContact.noLinked}</p>
            </div>
          ) : (
            <div style={styles.list}>
              {linkedContacts.map(item => (
                <div key={item.contact.id} style={styles.card}>
                  <div style={styles.cardMain}>
                    <div style={styles.cardInfo}>
                      <span style={styles.cardName}>{item.contact.name}</span>
                      {item.contact.title && (
                        <span style={styles.cardTitle}>{item.contact.title}</span>
                      )}
                      {item.role && (
                        <span style={styles.cardRole}>{item.role}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleUnlinkContact(item.contact.id)}
                      disabled={isLoading}
                      style={styles.removeBtn}
                    >
                      {t.projectContact.remove}
                    </button>
                  </div>
                  {item.project_notes && (
                    <p style={styles.cardNotes}>{item.project_notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 样式定义
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
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflowY: 'auto',
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
    color: '#666',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#999',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  error: {
    margin: '16px 24px 0',
    padding: '10px 14px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '6px',
    fontSize: '13px',
  },
  addSection: {
    padding: '16px 24px',
    borderBottom: '1px solid #eee',
  },
  addRow: {
    display: 'flex',
    gap: '10px',
  },
  select: {
    flex: 1,
    padding: '10px 36px 10px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
  },
  addBtn: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  optionsToggle: {
    marginTop: '10px',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    fontSize: '13px',
    cursor: 'pointer',
    padding: 0,
  },
  optionsPanel: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    minHeight: '60px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  hint: {
    margin: '10px 0 0 0',
    fontSize: '13px',
    color: '#999',
  },
  listSection: {
    padding: '16px 24px 24px',
  },
  listHeader: {
    marginBottom: '12px',
  },
  listTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  loading: {
    padding: '30px',
    textAlign: 'center',
    color: '#999',
    fontSize: '14px',
  },
  empty: {
    padding: '30px',
    textAlign: 'center',
    color: '#999',
    fontSize: '14px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  card: {
    padding: '12px 14px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  cardMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  cardName: {
    fontWeight: 500,
    color: '#1a1a1a',
    fontSize: '14px',
  },
  cardTitle: {
    color: '#666',
    fontSize: '13px',
  },
  cardRole: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: 500,
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  cardNotes: {
    margin: '8px 0 0 0',
    fontSize: '13px',
    color: '#666',
    lineHeight: 1.4,
  },
};

export default ProjectContactManager;
