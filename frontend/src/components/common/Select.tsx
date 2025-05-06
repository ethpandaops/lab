interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  multiple?: boolean;
}

export function Select({ value, onChange, options, label, multiple }: SelectProps): JSX.Element {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-mono text-tertiary mb-1">{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-surface border border-subtle rounded px-3 py-2 text-sm font-mono text-primary focus:border-accent focus:outline-none"
        multiple={multiple}
        size={multiple ? Math.min(options.length, 4) : 1}
      >
        {options.map(option => (
          <option key={option.value} value={option.value} className="py-1">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
