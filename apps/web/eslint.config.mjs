import tseslint from 'typescript-eslint';

export default tseslint.config({
  ignores: ['.next/**', 'node_modules/**'],
  files: ['src/**/*.{ts,tsx}'],
  languageOptions: { parser: tseslint.parser },
  rules: {},
});
