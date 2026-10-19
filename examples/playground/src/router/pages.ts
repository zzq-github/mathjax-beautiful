// Shared by the client router and the static Pages build.
export const routePages = [
  { path: '/', name: 'Home', title: 'MathJax Beautiful' },
  { path: '/demo', name: 'Demo', title: 'Demo - MathJax Beautiful' },
  { path: '/config', name: 'Config', title: 'Configuration - MathJax Beautiful' },
  {
    path: '/editor-config',
    name: 'EditorConfig',
    title: 'Editor Configuration - MathJax Beautiful',
  },
  { path: '/docs', name: 'Docs', title: 'Documentation - MathJax Beautiful' },
  { path: '/updates', name: 'Updates', title: 'Updates - MathJax Beautiful' },
  { path: '/privacy', name: 'Privacy', title: 'Privacy Policy - MathJax Beautiful' },
  { path: '/terms', name: 'Terms', title: 'Terms of Service - MathJax Beautiful' },
] as const;
