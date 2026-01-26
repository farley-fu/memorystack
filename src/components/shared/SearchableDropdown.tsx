/**
 * @file SearchableDropdown.tsx
 * @description 可搜索下拉组件 - 支持模糊搜索、自动补全、键盘导航
 */

import { useState, useRef, useEffect, ReactNode } from 'react';
import { colors, spacing, typography, borderRadius, shadows, zIndex } from '../../styles/theme';

interface SearchableDropdownProps<T> {
  items: T[];
  onSelect: (item: T) => void;
  placeholder?: string;
  displayField: keyof T;
  searchFields: (keyof T)[];
  renderItem?: (item: T, isHighlighted: boolean) => ReactNode;
  maxResults?: number;
  emptyMessage?: string;
  style?: React.CSSProperties;
}

function SearchableDropdown<T extends object>({
  items,
  onSelect,
  placeholder = '搜索...',
  displayField,
  searchFields,
  renderItem,
  maxResults = 10,
  emptyMessage = '无匹配结果',
  style,
}: SearchableDropdownProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 模糊搜索过滤
  const filteredItems = (() => {
    if (!searchTerm.trim()) return [];
    
    const lowerTerm = searchTerm.toLowerCase();
    
    return items
      .filter(item => 
        searchFields.some(field => {
          const value = (item as Record<string, unknown>)[field as string];
          return value && String(value).toLowerCase().includes(lowerTerm);
        })
      )
      .sort((a, b) => {
        // 优先级：完全匹配 > 开头匹配 > 包含匹配
        const aDisplay = String((a as Record<string, unknown>)[displayField as string] || '').toLowerCase();
        const bDisplay = String((b as Record<string, unknown>)[displayField as string] || '').toLowerCase();
        
        if (aDisplay === lowerTerm) return -1;
        if (bDisplay === lowerTerm) return 1;
        if (aDisplay.startsWith(lowerTerm)) return -1;
        if (bDisplay.startsWith(lowerTerm)) return 1;
        return 0;
      })
      .slice(0, maxResults);
  })();

  // 重置高亮索引当过滤结果改变时
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredItems.length === 0) {
      if (e.key === 'ArrowDown' && searchTerm.trim()) {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredItems[highlightedIndex]) {
          handleSelect(filteredItems[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // 选择项
  const handleSelect = (item: T) => {
    onSelect(item);
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // 输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(e.target.value.trim().length > 0);
  };

  // 滚动高亮项到可视区域
  useEffect(() => {
    if (listRef.current && isOpen) {
      const highlightedEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const styles = {
    container: {
      position: 'relative' as const,
      ...style,
    },
    input: {
      width: '100%',
      padding: `${spacing.sm} ${spacing.md}`,
      border: `1px solid ${isOpen ? colors.primary.project : colors.border.medium}`,
      borderRadius: borderRadius.md,
      fontSize: typography.fontSize.base,
      outline: 'none',
      boxSizing: 'border-box' as const,
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxShadow: isOpen ? `0 0 0 3px rgba(59, 130, 246, 0.1)` : 'none',
    },
    dropdown: {
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      right: 0,
      marginTop: spacing.xs,
      background: 'white',
      border: `1px solid ${colors.border.light}`,
      borderRadius: borderRadius.md,
      boxShadow: shadows.lg,
      zIndex: zIndex.dropdown,
      maxHeight: '240px',
      overflowY: 'auto' as const,
    },
    item: (isHighlighted: boolean) => ({
      padding: `${spacing.sm} ${spacing.md}`,
      cursor: 'pointer',
      background: isHighlighted ? colors.gray[50] : 'white',
      borderBottom: `1px solid ${colors.gray[100]}`,
      transition: 'background 0.15s',
    }),
    itemText: {
      fontSize: typography.fontSize.base,
      color: colors.gray[700],
    },
    itemSubtext: {
      fontSize: typography.fontSize.sm,
      color: colors.gray[500],
      marginTop: '2px',
    },
    empty: {
      padding: `${spacing.md} ${spacing.lg}`,
      textAlign: 'center' as const,
      color: colors.gray[400],
      fontSize: typography.fontSize.sm,
    },
    hint: {
      fontSize: typography.fontSize.xs,
      color: colors.gray[400],
      marginTop: spacing.xs,
    },
  };

  return (
    <div ref={containerRef} style={styles.container}>
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => searchTerm.trim() && setIsOpen(true)}
        placeholder={placeholder}
        style={styles.input}
      />
      
      {isOpen && (
        <div ref={listRef} style={styles.dropdown}>
          {filteredItems.length === 0 ? (
            <div style={styles.empty}>{emptyMessage}</div>
          ) : (
            filteredItems.map((item, index) => (
              <div
                key={String((item as Record<string, unknown>)[displayField as string]) + index}
                style={styles.item(index === highlightedIndex)}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {renderItem ? (
                  renderItem(item, index === highlightedIndex)
                ) : (
                  <div style={styles.itemText}>
                    {String((item as Record<string, unknown>)[displayField as string])}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
      
      {!isOpen && !searchTerm && items.length > 0 && (
        <div style={styles.hint}>
          输入关键词搜索，共 {items.length} 条记录
        </div>
      )}
    </div>
  );
}

export default SearchableDropdown;
