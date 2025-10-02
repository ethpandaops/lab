import { useState } from 'react';
import { Search } from 'lucide-react';
import { useSlot } from '@/hooks/useSlot';

export function SlotJump() {
  const { minSlot, maxSlot, actions } = useSlot();
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const slot = Number(value);
    if (!isNaN(slot)) {
      actions.goToSlot(slot);
      setValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={`Jump to slot (${minSlot}-${maxSlot})`}
        min={minSlot}
        max={maxSlot}
        className="flex-1 rounded-sm border border-subtle bg-nav px-3 py-2 text-sm/6 placeholder:text-secondary focus:border-accent focus:outline-hidden"
      />
      <button
        type="submit"
        className="flex items-center justify-center rounded-sm bg-accent px-4 py-2 hover:bg-accent/80"
        aria-label="Jump to slot"
      >
        <Search className="size-4" />
      </button>
    </form>
  );
}
