import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['apps/web/**', '**/node_modules/**', '**/dist/**', '**/.next/**'],
  },
  ...tseslint.configs.recommended,
);
