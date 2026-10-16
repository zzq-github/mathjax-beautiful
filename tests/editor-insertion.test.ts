import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VueMathjaxEditor from '../packages/core/src/components/VueMathjaxEditor/index.vue';

const wrappers: VueWrapper[] = [];
const originals: Array<() => void> = [];
const imageUrl = 'blob:https://example.com/local-image';

function replaceMethod(target: object, key: string, value: unknown) {
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { configurable: true, value });
  originals.push(() => {
    if (descriptor) Object.defineProperty(target, key, descriptor);
    else Reflect.deleteProperty(target, key);
  });
}

beforeEach(() => {
  // jsdom has no editing command implementation; use real DOM ranges for its insertion boundary.
  replaceMethod(document, 'execCommand', vi.fn((command: string, _ui: boolean, value: string) => {
    const selection = window.getSelection()!;
    const range = selection.getRangeAt(0);
    const fragment = command === 'insertHTML'
      ? range.createContextualFragment(value)
      : document.createTextNode(value);
    const last = fragment.lastChild ?? fragment;
    range.deleteContents();
    range.insertNode(fragment);
    range.setStartAfter(last);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }));
  replaceMethod(document, 'queryCommandState', () => false);
  replaceMethod(URL, 'createObjectURL', vi.fn(() => imageUrl));
  replaceMethod(URL, 'revokeObjectURL', vi.fn());
  window.MathJax = {
    tex2svgPromise: vi.fn(async () => {
      const result = document.createElement('div');
      result.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" /></svg>';
      return result;
    }),
  };
});

afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount());
  originals.splice(0).reverse().forEach(restore => restore());
  window.getSelection()?.removeAllRanges();
  document.body.replaceChildren();
  delete window.MathJax;
});

async function createEditor(modelValue = 'left right') {
  const wrapper = mount(VueMathjaxEditor, {
    attachTo: document.body,
    props: { modelValue },
    global: {
      stubs: {
        VueMathjaxBeautiful: {
          name: 'FormulaDialog',
          props: ['modelValue'],
          emits: ['insert', 'close', 'update:modelValue'],
          template: '<textarea v-if="modelValue" class="test-dialog-input" />',
        },
      },
    },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
}

async function placeCaret(wrapper: VueWrapper, offset: number) {
  const editor = wrapper.find('.editor-content').element as HTMLElement;
  editor.focus();
  const range = document.createRange();
  if (editor.firstChild) range.setStart(editor.firstChild, offset);
  else range.selectNodeContents(editor);
  range.collapse(true);
  window.getSelection()!.removeAllRanges();
  window.getSelection()!.addRange(range);
  await wrapper.find('.editor-content').trigger('mouseup');
}

function moveSelectionOutsideEditor() {
  const range = document.createRange();
  range.selectNodeContents(document.body);
  range.collapse(false);
  window.getSelection()!.removeAllRanges();
  window.getSelection()!.addRange(range);
}

async function insertFormula(wrapper: VueWrapper, latex = '$$x^2$$') {
  await wrapper.find('.formula-btn').trigger('click');
  moveSelectionOutsideEditor();
  const dialog = wrapper.findComponent({ name: 'FormulaDialog' });
  dialog.vm.$emit('insert', latex);
  dialog.vm.$emit('update:modelValue', false);
  dialog.vm.$emit('close');
  await flushPromises();
}

describe('VueMathjaxEditor insertion regressions', () => {
  it('restores the original caret after the formula dialog takes focus', async () => {
    const wrapper = await createEditor();
    await placeCaret(wrapper, 5);
    await insertFormula(wrapper);
    const editor = wrapper.find('.editor-content').element;
    expect(editor.querySelector('svg')).not.toBeNull();
    expect(editor.innerHTML.indexOf('left')).toBeLessThan(editor.innerHTML.indexOf('<svg'));
    expect(editor.innerHTML.indexOf('<svg')).toBeLessThan(editor.innerHTML.indexOf('right'));
    expect(editor.contains(window.getSelection()!.anchorNode)).toBe(true);
    expect(document.activeElement).toBe(editor);
  });

  it('keeps inserted formulas non-editable and places the caret outside the SVG', async () => {
    const wrapper = await createEditor('');
    await placeCaret(wrapper, 0);
    await insertFormula(wrapper);
    const svg = wrapper.find('.editor-content svg').element;
    expect(svg.getAttribute('contenteditable')).toBe('false');
    expect(svg.contains(window.getSelection()!.anchorNode)).toBe(false);
  });

  it('restores the formula editing boundary if the browser insertion command strips it', async () => {
    const wrapper = await createEditor('');
    await placeCaret(wrapper, 0);
    const insert = vi.mocked(document.execCommand).getMockImplementation()!;
    vi.mocked(document.execCommand).mockImplementationOnce((...args) => {
      const result = insert(...args);
      wrapper.find('.editor-content svg').element.removeAttribute('contenteditable');
      return result;
    });
    await insertFormula(wrapper);
    expect(wrapper.find('.editor-content svg').attributes('contenteditable')).toBe('false');
  });

  it('does not double-wrap delimiters emitted by the formula dialog', async () => {
    const wrapper = await createEditor('');
    await placeCaret(wrapper, 0);
    await insertFormula(wrapper);
    expect(wrapper.find('.editor-content svg').attributes('data-latex')).toBe('x^2');
  });

  it('restores the caret when the formula dialog is cancelled', async () => {
    const wrapper = await createEditor();
    await placeCaret(wrapper, 5);
    await wrapper.find('.formula-btn').trigger('click');
    moveSelectionOutsideEditor();
    wrapper.findComponent({ name: 'FormulaDialog' }).vm.$emit('close');
    await flushPromises();
    expect(window.getSelection()!.anchorNode).toBe(wrapper.find('.editor-content').element.firstChild);
    expect(window.getSelection()!.anchorOffset).toBe(5);
  });

  it('retains the insertion target while MathJax rendering is pending', async () => {
    const wrapper = await createEditor();
    await placeCaret(wrapper, 5);
    let finish!: (node: HTMLElement) => void;
    vi.mocked(window.MathJax!.tex2svgPromise!).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    await wrapper.find('.formula-btn').trigger('click');
    const dialog = wrapper.findComponent({ name: 'FormulaDialog' });
    dialog.vm.$emit('insert', '$$x^2$$');
    dialog.vm.$emit('update:modelValue', false);
    dialog.vm.$emit('close');
    await placeCaret(wrapper, 0);
    const result = document.createElement('div');
    result.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" /></svg>';
    finish(result);
    await flushPromises();
    const html = wrapper.find('.editor-content').element.innerHTML;
    expect(html.indexOf('left')).toBeLessThan(html.indexOf('<svg'));
    expect(html.indexOf('<svg')).toBeLessThan(html.indexOf('right'));
  });

  it('retains a pending formula replacement when a new dialog is opened', async () => {
    const wrapper = await createEditor('left $$x^2$$ right');
    await wrapper.find('.editor-content svg').trigger('click');
    let finish!: (node: HTMLElement) => void;
    vi.mocked(window.MathJax!.tex2svgPromise!).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const dialog = wrapper.findComponent({ name: 'FormulaDialog' });
    dialog.vm.$emit('insert', '$$y^2$$');
    dialog.vm.$emit('update:modelValue', false);
    dialog.vm.$emit('close');
    await placeCaret(wrapper, 0);
    await wrapper.find('.formula-btn').trigger('click');
    const result = document.createElement('div');
    result.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" /></svg>';
    finish(result);
    await flushPromises();
    expect(wrapper.findAll('.editor-content svg')).toHaveLength(1);
    expect(wrapper.find('.editor-content svg').attributes('data-latex')).toBe('y^2');
  });

  it('inserts a blob image at the saved caret and retains it in emitted content', async () => {
    const wrapper = await createEditor();
    await placeCaret(wrapper, 5);
    await wrapper.find('.image-btn').trigger('click');
    moveSelectionOutsideEditor();
    const input = wrapper.find('input[type=file]');
    Object.defineProperty(input.element, 'files', { value: [new File(['png'], 'photo.png', { type: 'image/png' })] });
    await input.trigger('change');
    await flushPromises();
    const editor = wrapper.find('.editor-content').element;
    expect(editor.querySelector('img')?.getAttribute('src')).toBe(imageUrl);
    expect(editor.innerHTML.indexOf('left')).toBeLessThan(editor.innerHTML.indexOf('<img'));
    expect(editor.innerHTML.indexOf('<img')).toBeLessThan(editor.innerHTML.indexOf('right'));
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toContain(imageUrl);
    expect(editor.contains(window.getSelection()!.anchorNode)).toBe(true);
    wrapper.unmount();
    wrappers.splice(wrappers.indexOf(wrapper), 1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(imageUrl);
  });

  it('preserves blob images and non-editable formulas when external content is rendered', async () => {
    const wrapper = await createEditor(`<img src="${imageUrl}">$$x^2$$`);
    expect(wrapper.find('.editor-content img').attributes('src')).toBe(imageUrl);
    expect(wrapper.find('.editor-content svg').attributes('contenteditable')).toBe('false');
  });
});
