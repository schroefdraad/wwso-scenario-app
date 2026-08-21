'use client';

import { InvoerProvider } from '../../../components/invoer/InvoerContext';
import { ToastProvider } from '../../../components/invoer/ToastContext';
import { LadeProvider } from '../../../components/invoer/LadeContext';
import { Topbar } from '../../../components/invoer/Topbar';
import { PandFormulier } from '../../../components/invoer/PandFormulier';
import { RuimteRaster } from '../../../components/invoer/RuimteRaster';
import { OverigePosten } from '../../../components/invoer/OverigePosten';
import { RuimteLade } from '../../../components/invoer/RuimteLade';
import styles from '../../../components/invoer/styles.module.css';

export default function NieuwPandPagina() {
  return (
    <InvoerProvider>
      <ToastProvider>
        <LadeProvider>
          <div className={styles.page}>
            <Topbar />
            <main className={styles.main}>
              <PandFormulier />
              <RuimteRaster />
              <OverigePosten />
            </main>
            <RuimteLade />
          </div>
        </LadeProvider>
      </ToastProvider>
    </InvoerProvider>
  );
}
