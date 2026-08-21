'use client';

import styles from './styles.module.css';

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (waarde: boolean) => void;
  label?: string;
}) {
  return (
    <label className={styles.toggle} aria-label={label}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={styles.toggleTrack} />
      <span className={styles.toggleThumb} />
    </label>
  );
}
