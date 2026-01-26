/**
 * @file ContactForm.tsx
 * @description 联系人创建/编辑表单组件
 * 
 * 功能：创建或编辑联系人，包含基本信息和扩展信息
 */

// src/components/ContactForm.tsx
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from './shared/ToastProvider';
import { useTranslation } from '../i18n';

interface Contact {
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

interface ContactFormProps {
  onContactCreated: () => void;
  editingContact?: Contact | null;
  onEditComplete?: () => void;
}

function ContactForm({ onContactCreated, editingContact, onEditComplete }: ContactFormProps) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [phones, setPhones] = useState<string[]>(['']);
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { showToast } = useToast();
  const { t } = useTranslation();

  const isEditMode = !!editingContact;

  // 当编辑联系人变化时，填充表单
  useEffect(() => {
    if (editingContact) {
      setName(editingContact.name || '');
      setTitle(editingContact.title || '');
      setCompany(editingContact.company || '');
      setEmail(editingContact.email || '');
      setAddress(editingContact.address || '');
      setNotes(editingContact.notes || '');
      setTags(editingContact.tags || '');
      
      // 解析电话JSON
      if (editingContact.phone) {
        try {
          const parsed = JSON.parse(editingContact.phone);
          setPhones(Array.isArray(parsed) ? parsed : [editingContact.phone]);
        } catch {
          setPhones([editingContact.phone]);
        }
      } else {
        setPhones(['']);
      }
      
      // 如果有扩展信息，展开更多选项
      if (editingContact.address || editingContact.tags || editingContact.notes) {
        setShowMore(true);
      }
    }
  }, [editingContact]);

  const handleAddPhone = () => {
    setPhones([...phones, '']);
  };

  const handleRemovePhone = (index: number) => {
    if (phones.length > 1) {
      setPhones(phones.filter((_, i) => i !== index));
    }
  };

  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...phones];
    newPhones[index] = value;
    setPhones(newPhones);
  };

  const resetForm = () => {
    setName('');
    setTitle('');
    setCompany('');
    setPhones(['']);
    setEmail('');
    setAddress('');
    setNotes('');
    setTags('');
    setShowMore(false);
  };

  const handleCancel = () => {
    resetForm();
    onEditComplete?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      showToast({ type: 'warning', message: t.contact.nameRequired });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 过滤空电话号码并转换为JSON
      const validPhones = phones.filter(p => p.trim());
      const phoneJson = validPhones.length > 0 ? JSON.stringify(validPhones) : null;
      
      if (isEditMode && editingContact) {
        // 更新联系人
        await invoke('update_contact', {
          contactId: editingContact.id,
          name: name.trim(),
          title: title.trim() || null,
          notes: notes.trim() || null,
          tags: tags.trim() || null,
          phone: phoneJson,
          email: email.trim() || null,
          address: address.trim() || null,
          company: company.trim() || null,
        });
        
        showToast({ type: 'success', message: t.contact.updateSuccess || '联系人更新成功！' });
        resetForm();
        onEditComplete?.();
      } else {
        // 创建联系人
        await invoke('create_contact', {
          name: name.trim(),
          title: title.trim() || null,
          notes: notes.trim() || null,
          tags: tags.trim() || null,
          phone: phoneJson,
          email: email.trim() || null,
          address: address.trim() || null,
          company: company.trim() || null,
        });
        
        showToast({ type: 'success', message: t.contact.createSuccess });
        resetForm();
        onContactCreated();
      }
    } catch (error) {
      console.error(isEditMode ? '更新联系人失败:' : '创建联系人失败:', error);
      showToast({ type: 'error', message: `${t.contact.createFailed}: ${error}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = {
    form: {
      padding: '20px',
      border: '1px solid #e5e7eb',
      borderRadius: '10px',
      background: isEditMode ? '#fffbeb' : '#fafafa',
    },
    title: {
      margin: '0 0 16px 0',
      fontSize: '1.1em',
      color: '#374151',
    },
    row: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      marginBottom: '12px',
    },
    field: {
      marginBottom: '12px',
    },
    label: {
      display: 'block',
      marginBottom: '4px',
      fontSize: '0.85em',
      color: '#4b5563',
      fontWeight: '500' as const,
    },
    input: {
      width: '100%',
      padding: '8px 10px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '0.95em',
      boxSizing: 'border-box' as const,
    },
    textarea: {
      width: '100%',
      padding: '8px 10px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '0.95em',
      minHeight: '60px',
      resize: 'vertical' as const,
      boxSizing: 'border-box' as const,
    },
    phoneRow: {
      display: 'flex',
      gap: '8px',
      marginBottom: '6px',
    },
    phoneInput: {
      flex: 1,
      padding: '8px 10px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '0.95em',
    },
    phoneBtn: {
      padding: '4px 10px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '0.9em',
    },
    addPhoneBtn: {
      padding: '4px 10px',
      background: '#e5e7eb',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '0.85em',
      color: '#4b5563',
    },
    toggleBtn: {
      padding: '6px 12px',
      background: 'transparent',
      border: '1px dashed #9ca3af',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '0.85em',
      color: '#6b7280',
      marginBottom: '12px',
      width: '100%',
    },
    buttonRow: {
      display: 'flex',
      gap: '10px',
    },
    submitBtn: {
      flex: 1,
      padding: '10px 20px',
      background: isEditMode ? '#f59e0b' : '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: 'bold' as const,
      fontSize: '0.95em',
    },
    cancelBtn: {
      padding: '10px 20px',
      background: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '0.95em',
    },
    hint: {
      fontSize: '0.8em',
      color: '#9ca3af',
      marginTop: '4px',
    },
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3 style={styles.title}>
        {isEditMode ? (t.contact.editTitle || '编辑联系人') : t.contact.createTitle}
      </h3>
      
      {/* 基本信息：姓名和职位 */}
      <div style={styles.row}>
        <div>
          <label style={styles.label}>{t.contact.name} *</label>
          <input
            type="text"
            placeholder={t.contact.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={styles.input}
          />
        </div>
        <div>
          <label style={styles.label}>{t.contact.titleField}</label>
          <input
            type="text"
            placeholder={t.contact.titlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={styles.input}
          />
        </div>
      </div>

      {/* 单位和邮箱 */}
      <div style={styles.row}>
        <div>
          <label style={styles.label}>{t.contact.company}</label>
          <input
            type="text"
            placeholder={t.contact.companyPlaceholder}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            style={styles.input}
          />
        </div>
        <div>
          <label style={styles.label}>{t.contact.email}</label>
          <input
            type="email"
            placeholder={t.contact.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
        </div>
      </div>

      {/* 电话（支持多个） */}
      <div style={styles.field}>
        <label style={styles.label}>{t.contact.phone}</label>
        {phones.map((phone, index) => (
          <div key={index} style={styles.phoneRow}>
            <input
              type="tel"
              placeholder={t.contact.phonePlaceholder}
              value={phone}
              onChange={(e) => handlePhoneChange(index, e.target.value)}
              style={styles.phoneInput}
            />
            {phones.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemovePhone(index)}
                style={{ ...styles.phoneBtn, background: '#fee2e2', color: '#dc2626' }}
              >
                {t.common.delete}
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={handleAddPhone} style={styles.addPhoneBtn}>
          {t.contact.addPhone}
        </button>
      </div>

      {/* 展开更多选项 */}
      <button
        type="button"
        onClick={() => setShowMore(!showMore)}
        style={styles.toggleBtn}
      >
        {showMore ? t.contact.collapseMore : t.contact.expandMore}
      </button>

      {showMore && (
        <>
          {/* 地址 */}
          <div style={styles.field}>
            <label style={styles.label}>{t.contact.address}</label>
            <input
              type="text"
              placeholder={t.contact.addressPlaceholder}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={styles.input}
            />
          </div>

          {/* 标签 */}
          <div style={styles.field}>
            <label style={styles.label}>{t.contact.tags}</label>
            <input
              type="text"
              placeholder={t.contact.tagsPlaceholder}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              style={styles.input}
            />
            <div style={styles.hint}>{t.contact.tagsHint}</div>
          </div>

          {/* 备注 */}
          <div style={styles.field}>
            <label style={styles.label}>{t.contact.notes}</label>
            <textarea
              placeholder={t.contact.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={styles.textarea}
            />
          </div>
        </>
      )}

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
          style={{
            ...styles.submitBtn,
            opacity: isSubmitting ? 0.6 : 1,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting 
            ? t.common.saving 
            : (isEditMode ? (t.common.update || '更新') : t.contact.saveBtn)
          }
        </button>
      </div>
    </form>
  );
}

export default ContactForm;
