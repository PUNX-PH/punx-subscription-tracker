'use client';

import { useState, useRef } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
    id?: string;
    label?: string;
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function TagInput({
    id,
    label,
    tags,
    onChange,
    placeholder = 'Add and press Enter...',
    disabled,
}: TagInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [focused, setFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const addTag = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return;
        if (tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) return;
        onChange([...tags, trimmed]);
        setInputValue('');
    };

    const removeTag = (index: number) => {
        onChange(tags.filter((_, i) => i !== index));
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, width: '100%' }}>
            {label && (
                <label
                    htmlFor={id}
                    style={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'var(--muted-foreground)',
                        marginBottom: '0.5rem',
                        display: 'block',
                    }}
                >
                    {label}
                </label>
            )}

            {/* Unified container */}
            <div
                onClick={() => inputRef.current?.focus()}
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '0.375rem',
                    background: focused ? 'rgba(9, 2, 11, 0.9)' : 'rgba(9, 2, 11, 0.5)',
                    border: `1px solid ${focused ? '#D8B4FE' : 'rgba(216, 180, 254, 0.2)'}`,
                    borderRadius: '10px',
                    boxShadow: focused ? '0 0 0 3px rgba(216, 180, 254, 0.15)' : 'none',
                    transform: focused ? 'translateY(-2px)' : 'none',
                    minHeight: '3rem',
                    padding: '0.5rem 0.75rem',
                    cursor: 'text',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                {tags.map((tag, i) => (
                    <span
                        key={i}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            background: 'rgba(139, 92, 246, 0.15)',
                            border: '1px solid rgba(139, 92, 246, 0.35)',
                            color: '#C4B5FD',
                            borderRadius: '6px',
                            padding: '0.2rem 0.5rem 0.2rem 0.65rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            lineHeight: '1.4',
                            letterSpacing: '0.01em',
                            userSelect: 'none',
                            flexShrink: 0,
                        }}
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={e => { e.stopPropagation(); removeTag(i); }}
                            disabled={disabled}
                            tabIndex={-1}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(196,181,253,0.5)',
                                cursor: 'pointer',
                                padding: '1px',
                                borderRadius: '4px',
                                marginLeft: '2px',
                                transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.color = '#C4B5FD';
                                e.currentTarget.style.background = 'rgba(139,92,246,0.3)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.color = 'rgba(196,181,253,0.5)';
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <X size={10} strokeWidth={2.5} />
                        </button>
                    </span>
                ))}

                <input
                    ref={inputRef}
                    id={id}
                    type="text"
                    value={inputValue}
                    placeholder={tags.length === 0 ? placeholder : ''}
                    disabled={disabled}
                    autoComplete="off"
                    style={{
                        flex: 1,
                        minWidth: '120px',
                        height: '2rem',
                        padding: 0,
                        margin: 0,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        boxShadow: 'none',
                        color: 'var(--foreground)',
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        fontFamily: 'inherit',
                        WebkitAppearance: 'none',
                        appearance: 'none',
                    }}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setFocused(true)}
                    onBlur={() => { setFocused(false); addTag(inputValue); }}
                />
            </div>

            <p
                style={{
                    fontSize: '0.75rem',
                    color: 'rgba(142, 156, 162, 0.45)',
                    marginTop: '0.375rem',
                    marginLeft: '0.125rem',
                    opacity: focused ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                }}
            >
                Press Enter to add &middot; Backspace to remove last
            </p>
        </div>
    );
}
