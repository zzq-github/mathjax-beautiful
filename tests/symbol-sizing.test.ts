import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VueMathjaxBeautiful from '../packages/core/src/components/VueMathjaxBeautiful/index.vue';
import type { VueMathjaxBeautifulProps } from '../packages/core/src/types';
import {
  advancedSymbols,
  basicSymbols,
  formulaExamples,
  greekSymbols,
} from '../packages/core/src/data';

const wrappers: VueWrapper[] = [];
const symbols = [...basicSymbols, ...greekSymbols, ...advancedSymbols, ...formulaExamples];
const originalDisplays = symbols.map((symbol) => symbol.display);
let originalRootFontSize: string;

beforeEach(() => {
  vi.useFakeTimers();
  originalRootFontSize = document.documentElement.style.fontSize;
  document.documentElement.style.fontSize = '16px';
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400);
  window.MathJax = {
    tex2svgPromise: vi.fn(async () => {
      const result = document.createElement('div');
      result.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><path d="M0 0" /></svg>';
      return result;
    }),
  };
});

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  symbols.forEach((symbol, index) => {
    symbol.display = originalDisplays[index];
  });
  document.documentElement.style.fontSize = originalRootFontSize;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete window.MathJax;
});

function createEditor(props: VueMathjaxBeautifulProps = {}) {
  const wrapper = mount(VueMathjaxBeautiful, {
    attachTo: document.body,
    props: { inlineMode: true, autoFocus: false, showFormulaExamples: false, ...props },
  });
  wrappers.push(wrapper);
  return wrapper;
}

function button(wrapper: VueWrapper, index = 0) {
  return wrapper.findAll('.symbol-button')[index].element as HTMLButtonElement;
}

async function finishRendering() {
  await vi.advanceTimersByTimeAsync(300);
  await flushPromises();
}

describe('VueMathjaxBeautiful symbol sizing', () => {
  it('positions fixed pixel buttons with the requested gap', async () => {
    const wrapper = createEditor({ symbolWidth: 40, symbolHeight: 40, symbolGap: 5 });
    await flushPromises();

    expect(button(wrapper).style.width).toBe('40px');
    expect(button(wrapper).style.height).toBe('40px');
    expect(button(wrapper, 1).style.left).toBe('45px');
  });

  it('converts rem width, height and gap using the root font size', async () => {
    const wrapper = createEditor({
      symbolWidth: '2.5rem',
      symbolHeight: '1.5rem',
      symbolGap: '0.25rem',
    });
    await flushPromises();

    expect(button(wrapper).style.width).toBe('40px');
    expect(button(wrapper).style.height).toBe('24px');
    expect(button(wrapper, 1).style.left).toBe('44px');
  });

  it('converts em lengths using the symbol panel font size', async () => {
    const wrapper = createEditor();
    await flushPromises();
    (wrapper.find('.symbols-grid').element as HTMLElement).style.fontSize = '20px';
    await wrapper.setProps({ symbolWidth: '2em', symbolHeight: '1.5em', symbolGap: '0.25em' });

    expect(button(wrapper).style.width).toBe('40px');
    expect(button(wrapper).style.height).toBe('30px');
    expect(button(wrapper, 1).style.left).toBe('45px');
  });

  it.each([0, '0px'])('allows a zero gap (%s)', async (symbolGap) => {
    const wrapper = createEditor({ symbolWidth: 40, symbolGap });
    await flushPromises();

    expect(button(wrapper, 1).style.left).toBe('40px');
  });

  it.each(['40invalid', '40%', -1, Number.NaN])(
    'falls back to adaptive width for unsupported or invalid input (%s)',
    async (symbolWidth) => {
      const wrapper = createEditor({ symbolWidth });
      await flushPromises();

      expect(button(wrapper).style.width).toBe('calc(12.5% - 8px)');
    }
  );

  it('keeps default height and gap when given a zero height and negative gap', async () => {
    const wrapper = createEditor({ symbolWidth: 40, symbolHeight: 0, symbolGap: -2 });
    await flushPromises();

    expect(button(wrapper).style.height).toBe('48px');
    expect(button(wrapper, 1).style.left).toBe('48px');
  });

  it('resizes cached SVGs when button height shrinks and grows', async () => {
    const wrapper = createEditor({ symbolWidth: 40, symbolHeight: 48 });
    await finishRendering();
    const svg = () => wrapper.find('.symbol-button svg').element as SVGElement;
    const render = vi.mocked(window.MathJax!.tex2svgPromise!);
    const renderCount = render.mock.calls.length;
    expect(svg().style.maxHeight).toBe('32px');

    await wrapper.setProps({ symbolHeight: 24 });
    await flushPromises();
    expect(button(wrapper).style.height).toBe('24px');
    expect(svg().style.maxHeight).toBe('16px');
    expect(render).toHaveBeenCalledTimes(renderCount);

    await wrapper.setProps({ symbolHeight: 48 });
    await flushPromises();
    expect(svg().style.maxHeight).toBe('32px');
    expect(render).toHaveBeenCalledTimes(renderCount);
  });

  it('keeps SVG sizes independent between editor instances', async () => {
    const large = createEditor({ symbolHeight: 48 });
    await finishRendering();
    const small = createEditor({ symbolHeight: 24 });
    await finishRendering();

    expect((large.find('.symbol-button svg').element as SVGElement).style.maxHeight).toBe('32px');
    expect((small.find('.symbol-button svg').element as SVGElement).style.maxHeight).toBe('16px');
  });
});
