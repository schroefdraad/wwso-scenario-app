/**
 * Vangt de laatste N console.error-aanroepen en onafgehandelde JS-fouten op, zodat een
 * feedbackmelding automatisch reproductiecontext meestuurt zonder dat de melder zelf iets hoeft
 * te kopiëren. Los van Sentry (die is voor onze eigen monitoring): dit is de context die
 * rechtstreeks in de feedback-e-mail/tabel terechtkomt.
 *
 * Side-effect module: importeren volstaat, patcht console.error/window.onerror bij het laden.
 * Geïmporteerd vanuit instrumentation-client.ts zodat de buffer al vanaf de eerste paginalaad
 * meeloopt, niet pas zodra iemand de feedbackknop opent.
 */
const MAX_ENTRIES = 20;
const buffer: string[] = [];

function voegToe(regel: string) {
  buffer.push(regel);
  if (buffer.length > MAX_ENTRIES) buffer.shift();
}

if (typeof window !== 'undefined') {
  const oorspronkelijkeConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    voegToe(args.map((a) => (a instanceof Error ? a.stack ?? a.message : String(a))).join(' '));
    oorspronkelijkeConsoleError(...args);
  };

  window.addEventListener('error', (event) => {
    voegToe(`Onafgehandelde fout: ${event.message}`);
  });
  window.addEventListener('unhandledrejection', (event) => {
    voegToe(`Onafgehandelde promise-rejection: ${String(event.reason)}`);
  });
}

export function haalConsoleBuffer(): string[] {
  return [...buffer];
}
