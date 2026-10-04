import { OMGEVING, omgevingLabel } from '../lib/omgeving';
import styles from './OmgevingBalk.module.css';

/** Balk bovenaan elke pagina buiten productie, zodat testers altijd zien dat ze op de testomgeving
 * (testdatabase) werken. Rendert niets op productie. */
export function OmgevingBalk() {
  const label = omgevingLabel(OMGEVING);
  if (!label) return null;

  return (
    <div className={styles.balk} role="status">
      <strong>{label}</strong> · Testomgeving — woningen hier staan los van de echte app.
    </div>
  );
}
