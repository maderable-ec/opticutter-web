import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default [
  { ignores: ['eslint.config.mjs', 'build/**', 'node_modules/**'] },
  {
    ...eslintPluginReact.configs.flat.recommended,
    ...eslintPluginReact.configs.flat['jsx-runtime'],
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    plugins: {
      eslintPluginReact,
      'react-hooks': eslintPluginReactHooks,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
    },
  },
  // TypeScript type-checked rules (parser + recommended-type-checked), scoped to .ts/.tsx only.
  // The e2e specs get the same rules as the app, but not the React ones: a Playwright fixture's
  // `use()` reads as a hook to eslint-plugin-react-hooks.
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['src/**/*.{ts,tsx}', 'e2e/**/*.ts', 'playwright.config.ts'],
  })),
  {
    files: ['src/**/*.{ts,tsx}', 'e2e/**/*.ts', 'playwright.config.ts'],
    languageOptions: {
      parserOptions: {
        // Type-aware linting: discover the nearest tsconfig for each file automatically. The
        // Playwright config sits at the root, whose tsconfig covers src/ alone: it is linted
        // against e2e's, the program `tsc -p e2e` checks it in.
        projectService: {
          allowDefaultProject: ['playwright.config.ts'],
          defaultProject: 'e2e/tsconfig.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Migration complete: explicit `any` is no longer allowed.
      '@typescript-eslint/no-explicit-any': 'error',
      // Non-null assertions are allowed but flagged for review (used only where an
      // invariant provably holds, e.g. bounds-checked array swaps).
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    // The two wrappers themselves, which exist to add what CoreUI leaves out (see each one), and
    // the icon module, the one place an icon library is imported.
    ignores: [
      'src/shared/components/Spinner.tsx',
      'src/shared/components/Modal.tsx',
      'src/shared/icons/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@coreui/react',
              importNames: ['CSpinner'],
              message:
                'Use Spinner from src/shared/components/Spinner: CSpinner says «Loading...».',
            },
            {
              name: '@coreui/react',
              importNames: ['CModal', 'CModalTitle'],
              message:
                'Use Modal/ModalTitle from src/shared/components/Modal: CModal has no accessible name.',
            },
            {
              name: 'lucide-react',
              message:
                'Use <Icon name> from src/shared/icons/Icon: icons are named by meaning in registry.ts.',
            },
            {
              name: '@coreui/icons',
              message: 'Use <Icon name> from src/shared/icons/Icon: the app draws Lucide icons.',
            },
            {
              name: '@coreui/icons-react',
              message: 'Use <Icon name> or <BrandMark> from src/shared/icons/.',
            },
          ],
        },
      ],
      // The browser's own dialog: unstyled, tiny on the shop's panels, and it freezes the tab.
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'confirm',
          message: 'Use useConfirm (src/shared/hooks/useConfirm) or ConfirmDialog.',
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'confirm',
          message: 'Use useConfirm (src/shared/hooks/useConfirm) or ConfirmDialog.',
        },
      ],
    },
  },
  eslintPluginPrettierRecommended,
]
