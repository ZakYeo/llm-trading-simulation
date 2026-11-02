import path from 'node:path';

function layer(file) {
  if (file.includes('/shared/ui/')) return 'ui';
  if (file.includes('/view-model/')) return 'view-model';
  if (file.includes('/model/') || file.endsWith('/lib/formatters'))
    return 'model';
  if (file.includes('/view/') || file.includes('/components/')) return 'view';
  if (file.endsWith('/lib/api')) return 'data';
  return 'entry';
}

export default {
  meta: {
    type: 'problem',
    schema: [],
    messages: { boundary: 'MVVM boundary: {{reason}}' },
  },
  create(context) {
    const filename = context.filename
      .replaceAll('\\', '/')
      .replace(/\.[^.]+$/, '');
    const from = layer(filename);
    const report = (node, reason) =>
      context.report({ node, messageId: 'boundary', data: { reason } });
    function check(node, source) {
      if (typeof source !== 'string') return;
      const resolved = source.startsWith('.')
        ? path
            .resolve(path.dirname(filename), source)
            .replaceAll('\\', '/')
            .replace(/\.(tsx?|jsx?)$/, '')
        : source;
      const to = layer(resolved);
      if (
        from === 'model' &&
        (['view', 'view-model', 'ui', 'data'].includes(to) ||
          /^(react|react-dom|@tanstack\/react-query|zustand)(\/|$)/.test(
            source,
          ))
      )
        report(
          node,
          'models must remain pure and independent of UI, view-models and transport',
        );
      if (
        from === 'view' &&
        (to === 'data' ||
          /^(\@tanstack\/react-query|zustand)(\/|$)/.test(source))
      )
        report(node, 'views receive data and commands through view-models');
      if (from === 'view-model' && ['view', 'ui'].includes(to))
        report(node, 'view-models must not depend on rendering');
      if (
        from === 'ui' &&
        /\/features\/|\/components\/|\/lib\/api$/.test(resolved)
      )
        report(node, 'shared UI must not depend on features or transport');
      if (from === 'data' && ['view', 'view-model', 'ui'].includes(to))
        report(
          node,
          'data access must not depend on rendering or orchestration',
        );
      if (source.startsWith('@/') || source.startsWith('~/'))
        report(
          node,
          'use the configured relative paths so boundaries remain verifiable',
        );
    }
    return {
      ImportDeclaration(node) {
        check(node, node.source.value);
      },
      ExportNamedDeclaration(node) {
        if (node.source) check(node, node.source.value);
      },
      ExportAllDeclaration(node) {
        check(node, node.source.value);
      },
      TSImportType(node) {
        check(node, node.argument?.value ?? node.argument?.literal?.value);
      },
      ImportExpression(node) {
        if (from !== 'entry')
          report(node, 'dynamic imports are not allowed inside MVVM layers');
      },
      TSImportEqualsDeclaration(node) {
        if (from !== 'entry')
          report(node, 'CommonJS imports are not allowed inside MVVM layers');
      },
      CallExpression(node) {
        const name = node.callee.name;
        if (from !== 'entry' && name === 'require')
          report(node, 'CommonJS imports are not allowed inside MVVM layers');
        if (['view', 'ui', 'model'].includes(from) && name === 'fetch')
          report(node, 'network effects belong in data access');
      },
      NewExpression(node) {
        if (
          ['view', 'ui', 'model'].includes(from) &&
          ['EventSource', 'WebSocket', 'XMLHttpRequest'].includes(
            node.callee.name,
          )
        )
          report(node, 'transport belongs in data access');
      },
      MemberExpression(node) {
        if (
          from === 'model' &&
          [
            'window',
            'document',
            'localStorage',
            'sessionStorage',
            'navigator',
          ].includes(node.object.name)
        )
          report(node, 'browser effects belong in view-models');
      },
    };
  },
};
