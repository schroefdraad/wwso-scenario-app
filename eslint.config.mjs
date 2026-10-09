import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['apps/web/**', 'outputs/**', '.claude/**', '**/node_modules/**', '**/dist/**', '**/.next/**'],
  },
  ...tseslint.configs.recommended,
);
