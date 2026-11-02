import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import rule from './web-architecture-rule.mjs';

function messages(filename, source) {
  return new Linter().verify(
    source,
    [
      {
        files: ['**/*.{ts,tsx}'],
        languageOptions: { parser: tseslint.parser },
        plugins: { architecture: { rules: { mvvm: rule } } },
        rules: { 'architecture/mvvm': 'error' },
      },
    ],
    { filename: `apps/web/src/${filename}` },
  );
}

test('permits the MVVM dependency direction', () => {
  for (const [file, code] of [
    [
      'features/a/view/page.tsx',
      "import { usePage } from '../view-model/page';",
    ],
    [
      'features/a/view-model/page.ts',
      "import { getSession } from '../../../lib/api';",
    ],
    [
      'features/a/model/page.ts',
      "import type { GameSessionRecord } from '@llm-sim/shared-types';",
    ],
    ['shared/ui/dialog.tsx', "import { useEffect } from 'react';"],
  ])
    assert.equal(messages(file, code).length, 0, file);
});

test('rejects reverse dependencies, transport in views, and boundary bypasses', () => {
  for (const [file, code] of [
    [
      'features/a/view/page.tsx',
      "import { getSession } from '../../../lib/api';",
    ],
    [
      'features/a/view/page.tsx',
      "import { useQuery } from '@tanstack/react-query';",
    ],
    ['features/a/view/page.tsx', 'fetch("/api");'],
    [
      'features/a/model/page.ts',
      "import type { PageVM } from '../view-model/page';",
    ],
    ['features/a/model/page.ts', "import { useEffect } from 'react';"],
    ['shared/ui/dialog.tsx', "export * from '../../features/a/model/page';"],
    ['features/a/view-model/page.ts', "import { Page } from '../view/page';"],
    ['features/a/model/page.ts', 'window.localStorage.getItem("x");'],
    ['features/a/view/page.tsx', 'import("../../../lib/api");'],
    ['features/a/view/page.tsx', 'require("../../../lib/api");'],
    ['features/a/model/page.ts', 'type T = import("../view-model/page").T;'],
  ])
    assert.ok(
      messages(file, code).some((m) => m.ruleId === 'architecture/mvvm'),
      `${file}: ${code}`,
    );
});
