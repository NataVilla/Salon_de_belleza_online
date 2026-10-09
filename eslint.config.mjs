// @ts-check
// Flat config de ESLint 9, con las mismas reglas que tenía la configuración anterior
// (formato .eslintrc, que ESLint 9 ya no carga).
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['eslint.config.mjs', 'dist/**', 'coverage/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      sourceType: 'commonjs',
    },
  },
  {
    rules: {
      // Apagamos la obligación de poner siempre el tipo de retorno en las funciones
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // ESTA ES LA SALVAVIDAS: Te permite usar 'any' cuando no sepas qué tipo de dato va
      '@typescript-eslint/no-explicit-any': 'off',

      // Cambiamos el error de "variable no usada" por una simple advertencia (línea amarilla)
      // Así tu código compilará aunque dejes variables "olvidadas" por ahí mientras pruebas
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
);
