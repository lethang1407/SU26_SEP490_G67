import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import '../../css/StyledSelect.css';

export default function StyledSelect({
    value,
    options = [],
    onChange,
    placeholder = 'Chọn...',
    disabled = false,
    className = '',
    menuClassName = '',
}) {
    const [open, setOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState(null);
    const rootRef = useRef(null);
    const menuRef = useRef(null);
    const listId = useId();

    const selected = options.find((opt) => String(opt.value) === String(value));

    const updateMenuPosition = () => {
        const trigger = rootRef.current?.querySelector('.styled-select__trigger');
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const viewportPad = 8;
        const preferredHeight = 240;
        const spaceBelow = window.innerHeight - rect.bottom - viewportPad;
        const spaceAbove = rect.top - viewportPad;
        const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
        const maxHeight = Math.min(preferredHeight, openUp ? spaceAbove - 6 : spaceBelow - 6);

        setMenuStyle({
            position: 'fixed',
            left: rect.left,
            width: Math.max(rect.width, 120),
            top: openUp ? undefined : rect.bottom + 6,
            bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
            maxHeight: Math.max(120, maxHeight),
            zIndex: 2000,
        });
    };

    useLayoutEffect(() => {
        if (!open) {
            setMenuStyle(null);
            return undefined;
        }
        updateMenuPosition();
        const handleReposition = () => updateMenuPosition();
        window.addEventListener('resize', handleReposition);
        window.addEventListener('scroll', handleReposition, true);
        return () => {
            window.removeEventListener('resize', handleReposition);
            window.removeEventListener('scroll', handleReposition, true);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const handlePointerDown = (event) => {
            const inTrigger = rootRef.current?.contains(event.target);
            const inMenu = menuRef.current?.contains(event.target);
            if (!inTrigger && !inMenu) setOpen(false);
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    const handleSelect = (nextValue) => {
        onChange?.(nextValue);
        setOpen(false);
    };

    return (
        <div
            ref={rootRef}
            className={`styled-select${open ? ' styled-select--open' : ''}${disabled ? ' styled-select--disabled' : ''}${className ? ` ${className}` : ''}`}
        >
            <button
                type="button"
                className="styled-select__trigger"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => {
                    if (!disabled) setOpen((prev) => !prev);
                }}
            >
                <span className={selected ? 'styled-select__value' : 'styled-select__placeholder'}>
                    {selected?.label ?? placeholder}
                </span>
                <ChevronDown size={16} className="styled-select__chevron" aria-hidden="true" />
            </button>

            {open && menuStyle
                ? createPortal(
                      <ul
                          ref={menuRef}
                          id={listId}
                          className={`styled-select__menu styled-select__menu--portal${menuClassName ? ` ${menuClassName}` : ''}`}
                          role="listbox"
                          style={menuStyle}
                      >
                          {options.map((opt) => {
                              const isActive = String(opt.value) === String(value);
                              return (
                                  <li key={String(opt.value)} role="option" aria-selected={isActive}>
                                      <button
                                          type="button"
                                          className={`styled-select__option${isActive ? ' styled-select__option--active' : ''}`}
                                          onClick={() => handleSelect(opt.value)}
                                      >
                                          {opt.label}
                                      </button>
                                  </li>
                              );
                          })}
                      </ul>,
                      document.body,
                  )
                : null}
        </div>
    );
}
