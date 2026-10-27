'use client';

import { Check, ChevronDown } from 'lucide-react';
import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const TYPEAHEAD_RESET_MS = 600;
const MENU_MAX_HEIGHT_PX = 288;

/*
  Styled replacement for <select> (WAI-ARIA "select-only combobox"): a button opens a listbox.
  Keyboard: ↑↓ Home End move, Enter/Space choose, Esc closes, typing jumps to a matching option.
  Keeps the <select> contract for callers — `value`/`defaultValue`, `onChange(event)` with
  `event.target.value` — and a hidden input carries the value for native form submission.
  The list is portalled to <body> with fixed positioning (as Radix/Floating UI do), so sticky bars,
  clipped cards and animated containers can never cover or cut it off.
*/
const VIEWPORT_GAP_PX = 8;
export function SelectMenu({
  id,
  name,
  options,
  placeholder,
  value,
  defaultValue = '',
  onChange,
  disabled = false,
  required = false,
  invalid = false,
  describedBy,
  labelId,
}) {
  const isControlled = value !== undefined;
  const [innerValue, setInnerValue] = useState(defaultValue);
  const currentValue = isControlled ? value : innerValue;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const typeaheadRef = useRef({ text: '', timer: null });
  const listboxId = useId();
  const selected = options.find((option) => String(option.value) === String(currentValue));

  // Place the portalled list against the button; flip above when there's more room there
  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    function placeMenu() {
      const bounds = buttonRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const spaceBelow = window.innerHeight - bounds.bottom - VIEWPORT_GAP_PX;
      const spaceAbove = bounds.top - VIEWPORT_GAP_PX;
      const wantedHeight = Math.min(MENU_MAX_HEIGHT_PX, options.length * 44 + 16);
      const isAbove = spaceBelow < wantedHeight && spaceAbove > spaceBelow;
      setMenuPosition({
        left: bounds.left,
        width: bounds.width,
        isAbove,
        top: isAbove ? undefined : bounds.bottom + 6,
        bottom: isAbove ? window.innerHeight - bounds.top + 6 : undefined,
        maxHeight: Math.max(120, Math.min(MENU_MAX_HEIGHT_PX, isAbove ? spaceAbove : spaceBelow)),
      });
    }
    placeMenu();
    window.addEventListener('resize', placeMenu);
    window.addEventListener('scroll', placeMenu, true);
    return () => {
      window.removeEventListener('resize', placeMenu);
      window.removeEventListener('scroll', placeMenu, true);
    };
  }, [isOpen, options.length]);

  // Close on outside pointer (the list lives in a portal, so check it separately)
  useEffect(() => {
    if (!isOpen) return undefined;
    function closeOutside(event) {
      if (!rootRef.current?.contains(event.target) && !listRef.current?.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [isOpen]);

  // Keep the active option scrolled into view
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeIndex]);

  function open() {
    if (disabled) return;
    setActiveIndex(Math.max(0, options.findIndex((option) => String(option.value) === String(currentValue))));
    setIsOpen(true);
  }

  function choose(option) {
    if (!isControlled) setInnerValue(option.value);
    onChange?.({ target: { name, value: option.value }, currentTarget: { name, value: option.value } });
    setIsOpen(false);
    buttonRef.current?.focus();
  }

  function jumpToTypedOption(character) {
    const state = typeaheadRef.current;
    clearTimeout(state.timer);
    state.text += character.toLocaleLowerCase();
    state.timer = setTimeout(() => {
      state.text = '';
    }, TYPEAHEAD_RESET_MS);
    const matchIndex = options.findIndex((option) => String(option.label).toLocaleLowerCase().startsWith(state.text));
    if (matchIndex < 0) return;
    if (isOpen) setActiveIndex(matchIndex);
    else choose(options[matchIndex]);
  }

  function handleKeyDown(event) {
    if (disabled) return;
    const lastIndex = options.length - 1;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!isOpen) {
          open();
          return;
        }
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((index) => Math.min(lastIndex, Math.max(0, index + step)));
        return;
      }
      case 'Home':
      case 'End':
        if (!isOpen) return;
        event.preventDefault();
        setActiveIndex(event.key === 'Home' ? 0 : lastIndex);
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!isOpen) open();
        else if (options[activeIndex]) choose(options[activeIndex]);
        return;
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          setIsOpen(false);
        }
        return;
      case 'Tab':
        setIsOpen(false);
        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) jumpToTypedOption(event.key);
    }
  }

  return (
    <div ref={rootRef} className="relative mt-1.5">
      <input type="hidden" name={name} value={currentValue ?? ''} />
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-labelledby={labelId ? `${labelId} ${id}` : undefined}
        aria-activedescendant={isOpen && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        aria-invalid={invalid}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={handleKeyDown}
        className={`flex min-h-12 w-full items-center gap-2 rounded-control border bg-card-hover px-3.5 py-2.5 text-left text-base shadow-[inset_0_1px_2px_rgb(26_29_38/0.05)] transition-[border-color,box-shadow] duration-(--dur-150) hover:border-ink-subtle focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-100 disabled:cursor-not-allowed disabled:bg-card-dim disabled:opacity-70 ${isOpen ? 'border-primary ring-4 ring-primary-100' : invalid ? 'border-danger' : 'border-line-strong'}`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? 'text-ink' : 'text-ink-muted'}`}>{selected?.label ?? placeholder ?? ' '}</span>
        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-ink-muted transition-transform duration-(--dur-200) ${isOpen ? 'rotate-180 text-primary-dark' : ''}`} strokeWidth={2} />
      </button>

      {isOpen && menuPosition && createPortal(
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          style={{ position: 'fixed', left: menuPosition.left, width: menuPosition.width, top: menuPosition.top, bottom: menuPosition.bottom, maxHeight: menuPosition.maxHeight }}
          className={`scroll-soft z-[80] overflow-y-auto overscroll-contain rounded-card border border-line bg-card p-1.5 text-ink shadow-raised ring-1 ring-black/5 motion-safe:animate-[pop-in_var(--dur-150)_var(--ease-out-soft)_both] ${menuPosition.isAbove ? 'origin-bottom' : 'origin-top'}`}
        >
          {options.map((option, optionIndex) => {
            const isSelected = String(option.value) === String(currentValue);
            const isActive = optionIndex === activeIndex;
            return (
              <li
                key={option.value}
                id={`${listboxId}-${optionIndex}`}
                role="option"
                aria-selected={isSelected}
                // Keep focus on the button so the outside-click and keyboard handling stay in one place
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(optionIndex)}
                onClick={() => choose(option)}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-3 py-2 text-[15px] transition-colors duration-(--dur-100) ${isActive ? 'bg-primary-50 text-ink' : 'text-ink'} ${isSelected ? 'font-semibold' : ''}`}
              >
                <span className="min-w-0 flex-1">{option.label}</span>
                {isSelected && <Check aria-hidden="true" className="size-4 shrink-0 text-primary-dark" strokeWidth={2.5} />}
              </li>
            );
          })}
        </ul>,
        document.body,
      )}
    </div>
  );
}

// Plain text of an <option>'s children (strings, numbers and nested arrays)
function extractOptionText(children) {
  return Children.toArray(children)
    .map((child) => (typeof child === 'string' || typeof child === 'number' ? String(child) : extractOptionText(child?.props?.children)))
    .join('');
}

/*
  Drop-in for a native <select> with <option> children, rendered as the styled SelectMenu.
  Every dropdown in the app goes through here or SelectField, so restyling SelectMenu restyles all of them.
*/
export function Select({ id, name, value, defaultValue, onChange, disabled, required, children, 'aria-invalid': ariaInvalid, 'aria-describedby': ariaDescribedBy }) {
  const options = Children.toArray(children)
    .filter((child) => isValidElement(child) && child.type === 'option')
    .map((option) => ({ value: option.props.value ?? extractOptionText(option.props.children), label: extractOptionText(option.props.children) }));
  return (
    <SelectMenu
      id={id}
      name={name}
      options={options}
      value={value}
      defaultValue={defaultValue ?? options[0]?.value ?? ''}
      onChange={onChange}
      disabled={disabled}
      required={required}
      invalid={ariaInvalid === true || ariaInvalid === 'true'}
      describedBy={ariaDescribedBy}
    />
  );
}
