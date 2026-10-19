import { act, createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MathjaxBeautiful,
  type MathjaxBeautifulProps,
} from '../packages/react/src/MathjaxBeautiful';
import ReactFormulaPlayground from '../examples/playground/src/react/ReactFormulaPlayground';

let root: Root;
let host: HTMLDivElement;
let input: HTMLTextAreaElement;
const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean };

beforeEach(() => {
  vi.useFakeTimers();
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  input = document.createElement('textarea');
  input.value = 'LEFT RIGHT';
  document.body.append(input);
  input.focus();
  input.setSelectionRange(5, 5);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.useRealTimers();
  delete (actEnvironment as Partial<typeof actEnvironment>).IS_REACT_ACT_ENVIRONMENT;
});

async function render(props: MathjaxBeautifulProps = {}, strict = false) {
  await act(async () => {
    const editor = createElement(MathjaxBeautiful, {
      defaultOpen: true,
      defaultValue: 'x+1',
      locale: 'en-US',
      showSymbols: false,
      showFormulaExamples: false,
      showPreview: false,
      ...props,
    });
    root.render(strict ? createElement(StrictMode, null, editor) : editor);
  });
  await act(async () => {
    vi.advanceTimersByTime(1);
  });
}

async function click(text: string) {
  const button = [...document.querySelectorAll('button')].find(
    (el) => el.textContent?.trim() === text
  )!;
  await act(async () => {
    button.focus();
    button.click();
  });
}

describe('React dialog focus restoration', () => {
  it.each(['Cancel', 'Insert Formula', 'x'])(
    'restores the original caret after %s',
    async (action) => {
      await render();
      expect(document.activeElement).not.toBe(input);
      await click(action);
      expect(document.querySelector('.rmb-overlay')).toBeNull();
      expect(document.activeElement).toBe(input);
      expect([input.selectionStart, input.selectionEnd]).toEqual([5, 5]);
      input.setRangeText('OK', input.selectionStart, input.selectionEnd, 'end');
      expect(input.value).toBe('LEFT OKRIGHT');
    }
  );

  it('restores focus and a selected range after controlled external close', async () => {
    input.setSelectionRange(2, 7, 'backward');
    await render({ open: true });
    await render({ open: false });
    expect(document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd, input.selectionDirection]).toEqual([
      2,
      7,
      'backward',
    ]);
  });

  it('restores the selection in a contenteditable host', async () => {
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    editable.tabIndex = 0;
    editable.textContent = 'LEFT RIGHT';
    document.body.append(editable);
    editable.focus();
    const range = document.createRange();
    range.setStart(editable.firstChild!, 5);
    range.collapse(true);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
    await render();
    getSelection()!.removeAllRanges();
    await click('Cancel');
    expect(document.activeElement).toBe(editable);
    expect(getSelection()!.anchorNode).toBe(editable.firstChild);
    expect(getSelection()!.anchorOffset).toBe(5);
  });

  it('does not steal focus chosen by the insertion callback', async () => {
    const next = document.createElement('button');
    document.body.append(next);
    await render({ onInsert: () => next.focus() });
    await click('Insert Formula');
    expect(document.activeElement).toBe(next);
  });

  it('restores focus on unmount under StrictMode', async () => {
    await render({}, true);
    await act(async () => root.render(null));
    expect(document.activeElement).toBe(input);
  });

  it('ignores a removed return target', async () => {
    await render();
    input.remove();
    await click('Cancel');
    expect(document.activeElement).toBe(document.body);
  });

  it('does not restore focus when an inline editor unmounts', async () => {
    await render({ inline: true });
    await act(async () => root.render(null));
    expect(document.activeElement).not.toBe(input);
  });

  it('returns to the demo input caret after clicking the dialog trigger', async () => {
    await act(async () => root.render(createElement(ReactFormulaPlayground)));
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    const field = host.querySelector('aside textarea') as HTMLTextAreaElement;
    field.focus();
    field.setSelectionRange(3, 3);
    const trigger = [...host.querySelectorAll('button')].find(
      (el) => el.textContent === 'Edit in React dialog'
    )!;
    await act(async () => {
      // jsdom does not apply the browser's default mousedown focus behavior.
      if (trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })))
        trigger.focus();
      trigger.click();
    });
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    await click('Cancel');
    expect(document.activeElement).toBe(field);
    expect(field.selectionStart).toBe(3);
  });
});
