import { afterEach, describe, expect, it, vi } from 'vitest';
import { initMathJax } from '../packages/core/src/utils/latex';

describe('MathJax loader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document
      .querySelectorAll('script[src*="mathjax"]')
      .forEach((script) => script.remove());
    delete window.MathJax;
  });

  it('reuses an already initialized MathJax instance without removing host scripts', async () => {
    const script = document.createElement('script');
    script.setAttribute('src', '/mathjax/es5/tex-svg.js');
    document.head.appendChild(script);

    const mathJax = {
      tex2svgPromise: async () => document.createElement('div'),
    };
    window.MathJax = mathJax;

    await initMathJax();

    expect(script.isConnected).toBe(true);
    expect(window.MathJax).toBe(mathJax);
  });

  it('merges caller config with defaults before loading MathJax', async () => {
    const entryScript = document.createElement('script');
    entryScript.setAttribute(
      'src',
      'https://zzq-github.github.io/mathjax-beautiful/assets/index.js'
    );
    document.head.appendChild(entryScript);

    const appendChildSpy = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation((node: Node) => {
        const appended = HTMLElement.prototype.appendChild.call(document.head, node);

        if (node instanceof HTMLScriptElement) {
          queueMicrotask(() => {
            window.MathJax = {
              ...window.MathJax,
              tex2svgPromise: async () => document.createElement('div'),
            };
            node.onload?.call(node, new Event('load'));
          });
        }

        return appended;
      });

    await initMathJax({
      tex: {
        inlineMath: [['\\(', '\\)']],
      },
    });

    expect(window.MathJax?.tex?.inlineMath).toEqual([['\\(', '\\)']]);
    expect(window.MathJax?.svg?.fontCache).toBe('global');
    expect(appendChildSpy).toHaveBeenCalled();
    expect((appendChildSpy.mock.calls[0][0] as HTMLScriptElement).src).toBe(
      'https://zzq-github.github.io/mathjax-beautiful/mathjax/es5/tex-svg.js'
    );
  });
});
