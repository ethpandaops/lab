import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';

interface DebugSection {
  id: string;
  title: string;
  component: ReactNode;
  priority?: number;
}

interface DebugContextType {
  sections: Map<string, DebugSection>;
  collapsedSections: Set<string>;
  isVisible: boolean;
  registerSection: (section: DebugSection) => void;
  unregisterSection: (id: string) => void;
  updateSection: (id: string, component: ReactNode) => void;
  toggleSection: (id: string) => void;
  toggleVisibility: () => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

const STORAGE_KEY_COLLAPSED = 'debug-panel-collapsed-sections';
const STORAGE_KEY_VISIBLE = 'debug-panel-visible';

export function DebugProvider({ children }: { children: ReactNode }) {
  const [sections, setSections] = useState<Map<string, DebugSection>>(new Map());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    // Load collapsed state from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY_COLLAPSED);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [isVisible, setIsVisible] = useState(() => {
    // Load visibility state from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY_VISIBLE);
      return stored ? JSON.parse(stored) : false; // Default to hidden
    } catch {
      return false;
    }
  });

  // Define toggleVisibility first, before any effects that use it
  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  // Save collapsed sections to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COLLAPSED, JSON.stringify(Array.from(collapsedSections)));
  }, [collapsedSections]);

  // Save visibility state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VISIBLE, JSON.stringify(isVisible));
  }, [isVisible]);

  // Single 'd' hotkey detection
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check if 'd' is pressed without any modifiers and not in an input field
      if (
        (e.key === 'd' || e.key === 'D') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.shiftKey
      ) {
        // Don't trigger if user is typing in an input, textarea, or contenteditable
        const target = e.target as HTMLElement;
        const isInputField =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.contentEditable === 'true';

        if (!isInputField) {
          e.preventDefault(); // Prevent default 'd' behavior
          toggleVisibility();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleVisibility]);

  const registerSection = useCallback((section: DebugSection) => {
    setSections(prev => {
      const next = new Map(prev);
      next.set(section.id, section);
      return next;
    });
  }, []);

  const unregisterSection = useCallback((id: string) => {
    setSections(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const updateSection = useCallback((id: string, component: ReactNode) => {
    setSections(prev => {
      const next = new Map(prev);
      const existing = next.get(id);
      if (existing) {
        next.set(id, { ...existing, component });
      }
      return next;
    });
  }, []);

  const toggleSection = useCallback((id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <DebugContext.Provider
      value={{
        sections,
        collapsedSections,
        isVisible,
        registerSection,
        unregisterSection,
        updateSection,
        toggleSection,
        toggleVisibility,
      }}
    >
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}
