'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import styles from './styles.module.css';

interface ToastItem {
  id: number;
  tekst: string;
  ongedaanMaken?: () => void;
}

interface ToastContextWaarde {
  toon: (tekst: string, ongedaanMaken?: () => void) => void;
}

const ToastContext = createContext<ToastContextWaarde | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const volgendId = useRef(1);

  const toon = useCallback((tekst: string, ongedaanMaken?: () => void) => {
    const id = volgendId.current++;
    setItems((huidig) => [...huidig, { id, tekst, ongedaanMaken }]);
    setTimeout(() => setItems((huidig) => huidig.filter((t) => t.id !== id)), 7000);
  }, []);

  return (
    <ToastContext.Provider value={{ toon }}>
      {children}
      <div className={styles.toastRegion}>
        {items.map((item) => (
          <div className={styles.toast} key={item.id}>
            <span>{item.tekst}</span>
            {item.ongedaanMaken && (
              <button
                type="button"
                onClick={() => {
                  item.ongedaanMaken?.();
                  setItems((huidig) => huidig.filter((t) => t.id !== item.id));
                }}
              >
                Ongedaan maken
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextWaarde {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast moet binnen een ToastProvider gebruikt worden.');
  return ctx;
}
