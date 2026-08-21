'use client';

import styles from './styles.module.css';

/**
 * Chip-per-kamer toewijzingspatroon (§4.5 van het UX-ontwerp): vervangt de 40×12-matrix als
 * invoermiddel. `aantalKamers` is altijd al bekend (`Pand.aantalKamers`), dus deze strip toont
 * nooit meer chips dan er kamers zijn — een ongeldig kamernummer is hierdoor niet aan te wijzen.
 */
export function KamerChipStrip({
  aantalKamers,
  geselecteerd,
  onToggle,
  ariaLabel,
}: {
  aantalKamers: number;
  geselecteerd: number[];
  onToggle: (kamer: 'alle' | number) => void;
  ariaLabel: string;
}) {
  const alle = geselecteerd.length === aantalKamers && aantalKamers > 0;
  return (
    <div className={styles.chipstrip} role="group" aria-label={ariaLabel}>
      <button
        type="button"
        className={`${styles.chip} ${styles.chipAlle} ${alle ? styles.chipOn : ''}`}
        role="checkbox"
        aria-checked={alle}
        onClick={() => onToggle('alle')}
      >
        Alle
      </button>
      {Array.from({ length: aantalKamers }, (_, i) => i + 1).map((kamer) => (
        <button
          key={kamer}
          type="button"
          className={`${styles.chip} ${geselecteerd.includes(kamer) ? styles.chipOn : ''}`}
          role="checkbox"
          aria-checked={geselecteerd.includes(kamer)}
          onClick={() => onToggle(kamer)}
        >
          {kamer}
        </button>
      ))}
    </div>
  );
}
