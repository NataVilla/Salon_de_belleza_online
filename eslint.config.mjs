module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
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
};