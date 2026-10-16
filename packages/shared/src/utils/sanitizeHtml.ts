import DOMPurify from 'dompurify';

const ADD_TAGS = [
  'mjx-container',
  'svg',
  'g',
  'defs',
  'path',
  'use',
  'rect',
  'line',
  'polyline',
  'polygon',
  'circle',
  'ellipse',
  'text',
  'tspan',
];

const ADD_ATTR = [
  'aria-hidden',
  'aria-label',
  'class',
  'd',
  'data-c',
  'data-latex',
  'data-latex-type',
  'data-mml-node',
  'fill',
  'focusable',
  'height',
  'href',
  'id',
  'preserveAspectRatio',
  'role',
  'shape-rendering',
  'stroke',
  'style',
  'text-rendering',
  'transform',
  'viewBox',
  'width',
  'x',
  'xlink:href',
  'xmlns',
  'y',
];

let purifier: ReturnType<typeof DOMPurify> | undefined;

export function sanitizeHtml(html: string): string {
  if (!html || typeof window === 'undefined') return html || '';

  if (!purifier) {
    // Keep editor-specific exceptions isolated from the host application's DOMPurify hooks.
    purifier = DOMPurify(window);
    purifier.addHook('uponSanitizeAttribute', (node, attribute) => {
      const tag = node.nodeName.toLowerCase();
      if (tag === 'img' && attribute.attrName === 'src' && /^blob:/i.test(attribute.attrValue.trim())) {
        attribute.forceKeepAttr = true;
      }
      if (
        tag === 'svg' &&
        (node as Element).hasAttribute('data-latex') &&
        attribute.attrName === 'contenteditable' &&
        attribute.attrValue === 'false'
      ) {
        attribute.forceKeepAttr = true;
      }
    });
  }

  return purifier.sanitize(html, {
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    ADD_TAGS,
    ADD_ATTR,
    ALLOW_DATA_ATTR: true,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
  });
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}
