import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
export default defineConfig([
 ...nextVitals,
 {files:['src/**/*.{ts,tsx}'],languageOptions:{parser:tsParser},plugins:{'@typescript-eslint':tsPlugin},rules:{'@typescript-eslint/no-explicit-any':'error',
 // Preserve the existing non-compiler application contract while reporting new compiler recommendations.
 // React Compiler is not enabled; existing hook-order and dependency rules retain their severity.
 'react-hooks/set-state-in-effect':'warn','react-hooks/globals':'warn','react-hooks/refs':'warn','react-hooks/purity':'warn','react-hooks/immutability':'warn','react-hooks/use-memo':'warn'}},
 globalIgnores(['.next*/**','node_modules/**','out/**','next-env.d.ts'])
])
