import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export interface ProjectInlineSelectOption {
  value: string;
  label: string;
}

interface ProjectInlineSelectProps {
  ariaLabel: string;
  className?: string;
  getOptionToneClassName?: (value: string) => string;
  onChange: (value: string) => void;
  options: ProjectInlineSelectOption[];
  value: string;
}

export function ProjectInlineSelect({
  ariaLabel,
  className = '',
  getOptionToneClassName,
  onChange,
  options,
  value,
}: ProjectInlineSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || value || '-';
  const selectedToneClassName = getOptionToneClassName?.(value) ?? '';

  return (
    <div
      className={`project-sheet__custom-select ${open ? 'is-open' : ''} ${className}`}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        className={`project-sheet__custom-select-button ${selectedToneClassName}`}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        {selectedToneClassName ? (
          <span
            className={`project-sheet__custom-select-indicator ${selectedToneClassName}`}
            aria-hidden="true"
          />
        ) : null}
        <span className="project-sheet__custom-select-value">{selectedLabel}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open ? (
        <div className="project-sheet__custom-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const optionToneClassName = getOptionToneClassName?.(option.value) ?? '';
            const selected = option.value === value;

            return (
              <button
                className={`project-sheet__custom-select-option ${optionToneClassName} ${
                  selected ? 'is-selected' : ''
                }`}
                key={option.value || '__empty'}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {optionToneClassName ? (
                  <span
                    className={`project-sheet__custom-select-indicator ${optionToneClassName}`}
                    aria-hidden="true"
                  />
                ) : (
                  <span aria-hidden="true" />
                )}
                <span>{option.label}</span>
                {selected ? <Check size={13} aria-hidden="true" /> : <span aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
