import {
  type ChangeEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  type Category,
  type Symbol as MathSymbol,
  advancedSymbols,
  basicSymbols,
  categories,
  escapeHtml,
  formulaExamples,
  getCategoryName,
  getSymbolDescription,
  greekSymbols,
  initMathJax,
  sanitizeHtml,
} from '@vue-mathjax-beautiful/shared';
import { type MathjaxBeautifulLocale, messages } from './i18n';

export type MathjaxBeautifulTheme = 'light' | 'dark';

export interface MathjaxBeautifulProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  value?: string;
  defaultValue?: string;
  existingLatex?: string;
  inline?: boolean;
  theme?: MathjaxBeautifulTheme;
  locale?: MathjaxBeautifulLocale;
  readonly?: boolean;
  showSymbols?: boolean;
  showPreview?: boolean;
  showThemeToggle?: boolean;
  showClearButton?: boolean;
  showLanguageToggle?: boolean;
  showFormulaExamples?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  enabledCategories?: string[];
  defaultCategory?: string;
  title?: string;
  subtitle?: string;
  insertButtonText?: string;
  cancelButtonText?: string;
  clearButtonText?: string;
  wrapFormula?: boolean;
  className?: string;
  dialogClassName?: string;
  onInsert?: (latex: string) => void;
  onChange?: (latex: string) => void;
  onClear?: () => void;
  onClose?: () => void;
  onThemeChange?: (theme: MathjaxBeautifulTheme) => void;
  onLocaleChange?: (locale: MathjaxBeautifulLocale) => void;
}

const symbolGroups: Record<string, MathSymbol[]> = {
  basic: basicSymbols,
  greek: greekSymbols,
  advanced: advancedSymbols,
};

const visibleFormulaExamples = formulaExamples.slice(0, 12);

function isControlled<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function joinClassNames(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

async function renderLatexSvg(
  latex: string,
  {
    className,
    maxWidth,
    maxHeight,
    scale,
  }: {
    className: string;
    maxWidth: string;
    maxHeight?: string;
    scale: number;
  }
) {
  await initMathJax();
  if (!window.MathJax?.tex2svgPromise) return '';

  const result = await window.MathJax.tex2svgPromise(latex, {
    display: false,
    scale,
    em: 16,
    ex: 8,
    containerWidth: 1280,
  });
  const svg = result.getElementsByTagName('svg')[0];
  if (!svg) return '';

  svg.classList.add(className);
  svg.style.fontSize = '16px';
  svg.style.verticalAlign = 'middle';
  svg.style.maxWidth = maxWidth;
  svg.style.width = 'auto';
  svg.style.height = 'auto';
  if (maxHeight) {
    svg.style.maxHeight = maxHeight;
  }
  svg.setAttribute('shape-rendering', 'geometricPrecision');
  svg.setAttribute('text-rendering', 'optimizeLegibility');
  return sanitizeHtml(svg.outerHTML);
}

export function MathjaxBeautiful({
  open,
  defaultOpen = false,
  onOpenChange,
  value,
  defaultValue,
  existingLatex,
  inline = false,
  theme = 'light',
  locale = 'zh-CN',
  readonly = false,
  showSymbols = true,
  showPreview = true,
  showThemeToggle = true,
  showClearButton = true,
  showLanguageToggle = true,
  showFormulaExamples = true,
  autoFocus = true,
  placeholder,
  maxLength = 1000,
  rows = 2,
  enabledCategories = ['basic', 'greek', 'advanced'],
  defaultCategory = 'basic',
  title,
  subtitle,
  insertButtonText,
  cancelButtonText,
  clearButtonText,
  wrapFormula = true,
  className,
  dialogClassName,
  onInsert,
  onChange,
  onClear,
  onClose,
  onThemeChange,
  onLocaleChange,
}: MathjaxBeautifulProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const focusSessionRef = useRef(0);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [internalValue, setInternalValue] = useState(defaultValue ?? existingLatex ?? '');
  const [activeCategory, setActiveCategory] = useState(defaultCategory);
  const [renderedFormula, setRenderedFormula] = useState('');
  const [renderedSymbols, setRenderedSymbols] = useState<Record<string, string>>({});
  const [renderedExamples, setRenderedExamples] = useState<Record<string, string>>({});
  const [internalTheme, setInternalTheme] = useState<MathjaxBeautifulTheme>(theme);
  const [internalLocale, setInternalLocale] = useState<MathjaxBeautifulLocale>(locale);

  const currentOpen = inline ? true : isControlled(open) ? open : internalOpen;
  const latexValue = isControlled(value) ? value : internalValue;
  const t = messages[internalLocale];

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled(open)) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [onOpenChange, open]
  );

  const setLatexValue = useCallback(
    (nextValue: string) => {
      if (!isControlled(value)) {
        setInternalValue(nextValue);
      }
      onChange?.(nextValue);
    },
    [onChange, value]
  );

  const filteredCategories = useMemo(() => {
    return categories.filter((category: Category) => enabledCategories.includes(category.key));
  }, [enabledCategories]);

  const currentSymbols = useMemo(() => {
    return symbolGroups[activeCategory] ?? basicSymbols;
  }, [activeCategory]);

  useEffect(() => {
    if (!enabledCategories.includes(activeCategory)) {
      setActiveCategory(enabledCategories[0] ?? 'basic');
    }
  }, [activeCategory, enabledCategories]);

  useEffect(() => {
    setInternalTheme(theme);
  }, [theme]);

  useEffect(() => {
    setInternalLocale(locale);
  }, [locale]);

  useEffect(() => {
    if (currentOpen || inline) {
      const nextValue = value ?? existingLatex ?? defaultValue ?? '';
      if (!isControlled(value)) {
        setInternalValue(nextValue);
      }
    }
  }, [currentOpen, defaultValue, existingLatex, inline, value]);

  useEffect(() => {
    if (!currentOpen || inline || typeof document === 'undefined') return;
    const previous = document.activeElement;
    if (!(previous instanceof HTMLElement) || previous === document.body) return;
    const session = ++focusSessionRef.current;
    const overlay = textareaRef.current?.closest('.rmb-overlay');
    const textSelection =
      previous instanceof HTMLInputElement || previous instanceof HTMLTextAreaElement
        ? {
            start: previous.selectionStart,
            end: previous.selectionEnd,
            direction: previous.selectionDirection,
          }
        : null;
    const selection = window.getSelection();
    const range =
      selection?.rangeCount && previous.contains(selection.getRangeAt(0).commonAncestorContainer)
        ? selection.getRangeAt(0).cloneRange()
        : null;

    return () => {
      // Wait for the portal to unmount and let the caller choose its own next focus.
      queueMicrotask(() => {
        if (session !== focusSessionRef.current || !previous.isConnected) return;
        const active = document.activeElement;
        if (active && active !== document.body && !overlay?.contains(active)) return;
        previous.focus({ preventScroll: true });
        if (
          textSelection?.start != null &&
          textSelection.end != null &&
          (previous instanceof HTMLInputElement || previous instanceof HTMLTextAreaElement)
        ) {
          previous.setSelectionRange(
            textSelection.start,
            textSelection.end,
            textSelection.direction ?? undefined
          );
        } else if (
          range &&
          previous.contains(range.startContainer) &&
          previous.contains(range.endContainer)
        ) {
          const currentSelection = window.getSelection();
          currentSelection?.removeAllRanges();
          currentSelection?.addRange(range);
        }
      });
    };
  }, [currentOpen, inline]);

  useEffect(() => {
    if (!currentOpen || !autoFocus || readonly) return;
    const id = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [autoFocus, currentOpen, readonly]);

  useEffect(() => {
    if (!currentOpen || inline || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [currentOpen, inline]);

  useEffect(() => {
    let cancelled = false;

    async function renderPreview() {
      const trimmed = latexValue.trim();
      if (!trimmed) {
        setRenderedFormula('');
        return;
      }

      try {
        await initMathJax();
        if (!window.MathJax?.tex2svgPromise) {
          setRenderedFormula(
            sanitizeHtml('<span class="rmb-preview-error">MathJax not loaded</span>')
          );
          return;
        }

        const result = await window.MathJax.tex2svgPromise(trimmed, {
          display: false,
          scale: 1.6,
        });
        const svg = result.getElementsByTagName('svg')[0];
        if (!svg) {
          setRenderedFormula(sanitizeHtml('<span class="rmb-preview-error">Render failed</span>'));
          return;
        }

        svg.classList.add('rmb-preview-svg');
        const safeSvg = sanitizeHtml(svg.outerHTML);
        if (!cancelled) {
          setRenderedFormula(safeSvg);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        if (!cancelled) {
          setRenderedFormula(
            sanitizeHtml(
              `<span class="rmb-preview-error">Preview failed: ${escapeHtml(message)}</span>`
            )
          );
        }
      }
    }

    const id = window.setTimeout(renderPreview, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [currentOpen, latexValue]);

  useEffect(() => {
    if (!currentOpen || !showSymbols || typeof window === 'undefined') return;
    let cancelled = false;

    async function renderSymbols() {
      const entries = await Promise.all(
        currentSymbols.map(async (symbol) => {
          try {
            const display = await renderLatexSvg(symbol.latex, {
              className: 'rmb-symbol-svg',
              maxWidth: '42px',
              maxHeight: '32px',
              scale: 1.3,
            });
            return [symbol.latex, display] as const;
          } catch {
            return [symbol.latex, ''] as const;
          }
        })
      );

      if (!cancelled) {
        setRenderedSymbols((previous) => ({
          ...previous,
          ...Object.fromEntries(entries),
        }));
      }
    }

    void renderSymbols();
    return () => {
      cancelled = true;
    };
  }, [currentOpen, currentSymbols, showSymbols]);

  useEffect(() => {
    if (
      !currentOpen ||
      !showSymbols ||
      !showFormulaExamples ||
      activeCategory !== 'basic' ||
      typeof window === 'undefined'
    ) {
      return;
    }
    let cancelled = false;

    async function renderExamples() {
      const entries = await Promise.all(
        visibleFormulaExamples.map(async (example) => {
          try {
            const display = await renderLatexSvg(example.latex, {
              className: 'rmb-example-svg',
              maxWidth: '100%',
              scale: 1,
            });
            return [example.latex, display] as const;
          } catch {
            return [example.latex, ''] as const;
          }
        })
      );

      if (!cancelled) {
        setRenderedExamples((previous) => ({
          ...previous,
          ...Object.fromEntries(entries),
        }));
      }
    }

    void renderExamples();
    return () => {
      cancelled = true;
    };
  }, [activeCategory, currentOpen, showFormulaExamples, showSymbols]);

  const close = useCallback(() => {
    setOpen(false);
    onClose?.();
  }, [onClose, setOpen]);

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      close();
    }
  };

  const handleInput = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (readonly) return;
    setLatexValue(event.target.value);
  };

  const insertSymbol = (latex: string) => {
    if (readonly) return;

    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? latexValue.length;
    const end = textarea?.selectionEnd ?? latexValue.length;
    const nextValue = `${latexValue.slice(0, start)}${latex}${latexValue.slice(end)}`.slice(
      0,
      maxLength
    );

    setLatexValue(nextValue);
    window.requestAnimationFrame(() => {
      textarea?.focus();
      if (textarea) {
        const nextCursor = Math.min(start + latex.length, nextValue.length);
        textarea.selectionStart = nextCursor;
        textarea.selectionEnd = nextCursor;
      }
    });
  };

  const clearInput = () => {
    if (readonly) return;
    setLatexValue('');
    setRenderedFormula('');
    onClear?.();
  };

  const insertFormula = () => {
    const trimmed = latexValue.trim();
    if (!trimmed || readonly) return;

    let latex = trimmed;
    if (wrapFormula) {
      const hasInlineWrapper =
        latex.startsWith('$') && latex.endsWith('$') && !latex.startsWith('$$');
      const hasDisplayWrapper = latex.startsWith('$$') && latex.endsWith('$$');
      if (!hasInlineWrapper && !hasDisplayWrapper) {
        latex = inline ? `$${latex}$` : `$$${latex}$$`;
      }
    }

    onInsert?.(latex);
    if (!inline) {
      close();
    }
  };

  const toggleTheme = () => {
    const nextTheme = internalTheme === 'dark' ? 'light' : 'dark';
    setInternalTheme(nextTheme);
    onThemeChange?.(nextTheme);
  };

  const toggleLocale = () => {
    const nextLocale = internalLocale === 'zh-CN' ? 'en-US' : 'zh-CN';
    setInternalLocale(nextLocale);
    onLocaleChange?.(nextLocale);
  };

  const editor = (
    <div
      className={joinClassNames(
        'rmb-editor',
        `rmb-theme-${internalTheme}`,
        inline && 'rmb-editor-inline',
        className
      )}
    >
      <div className="rmb-editor-body">
        <section className="rmb-section">
          <div className="rmb-section-header">
            <div className="rmb-section-title">
              <span aria-hidden="true">LaTeX</span>
              <strong>{t.inputSection}</strong>
            </div>
            <div className="rmb-actions">
              {showLanguageToggle ? (
                <button type="button" className="rmb-icon-button" onClick={toggleLocale}>
                  {internalLocale === 'zh-CN' ? 'EN' : 'ZH'}
                </button>
              ) : null}
              {showThemeToggle ? (
                <button
                  type="button"
                  className="rmb-icon-button"
                  title={internalTheme === 'dark' ? t.themeToggle.light : t.themeToggle.dark}
                  onClick={toggleTheme}
                >
                  {internalTheme === 'dark' ? 'Light' : 'Dark'}
                </button>
              ) : null}
              {showClearButton ? (
                <button
                  type="button"
                  className="rmb-icon-button"
                  onClick={clearInput}
                  disabled={readonly}
                >
                  {clearButtonText || t.clearButton}
                </button>
              ) : null}
            </div>
          </div>
          <textarea
            ref={textareaRef}
            className="rmb-input"
            value={latexValue}
            placeholder={placeholder || t.inputPlaceholder}
            readOnly={readonly}
            rows={rows}
            maxLength={maxLength}
            onChange={handleInput}
          />
        </section>

        {showPreview ? (
          <section className="rmb-section">
            <div className="rmb-section-header">
              <div className="rmb-section-title">
                <span aria-hidden="true">fx</span>
                <strong>{t.previewSection}</strong>
              </div>
              <span className={joinClassNames('rmb-status', latexValue && 'rmb-status-active')}>
                {latexValue ? t.rendering : t.noFormula}
              </span>
            </div>
            <div className="rmb-preview">
              {latexValue ? (
                <div dangerouslySetInnerHTML={{ __html: renderedFormula }} />
              ) : (
                <span>{t.inputPlaceholder}</span>
              )}
            </div>
          </section>
        ) : null}

        {showSymbols ? (
          <section className="rmb-section">
            <div className="rmb-tabs" role="tablist" aria-label="Formula symbol categories">
              {filteredCategories.map((category) => (
                <button
                  type="button"
                  role="tab"
                  key={category.key}
                  className={joinClassNames(
                    'rmb-tab',
                    activeCategory === category.key && 'rmb-tab-active'
                  )}
                  aria-selected={activeCategory === category.key}
                  onClick={() => setActiveCategory(category.key)}
                >
                  <span>{category.icon}</span>
                  <span>{getCategoryName(category, internalLocale)}</span>
                </button>
              ))}
            </div>
            <div className="rmb-symbol-grid">
              {currentSymbols.map((symbol) => (
                <button
                  type="button"
                  key={symbol.latex}
                  className="rmb-symbol-button"
                  title={getSymbolDescription(symbol, internalLocale)}
                  onClick={() => insertSymbol(symbol.latex)}
                  disabled={readonly}
                >
                  {renderedSymbols[symbol.latex] ? (
                    <span
                      className="rmb-symbol-rendered"
                      dangerouslySetInnerHTML={{ __html: renderedSymbols[symbol.latex] }}
                    />
                  ) : (
                    <span className="rmb-symbol-fallback">{symbol.latex}</span>
                  )}
                </button>
              ))}
            </div>

            {activeCategory === 'basic' && showFormulaExamples ? (
              <div className="rmb-examples">
                <div className="rmb-examples-title">{t.categories.formulas}</div>
                <div className="rmb-examples-grid">
                  {visibleFormulaExamples.map((example) => (
                    <button
                      type="button"
                      key={example.latex}
                      className="rmb-example-button"
                      title={getSymbolDescription(example, internalLocale)}
                      onClick={() => insertSymbol(example.latex)}
                      disabled={readonly}
                    >
                      {renderedExamples[example.latex] ? (
                        <span
                          className="rmb-example-rendered"
                          dangerouslySetInnerHTML={{ __html: renderedExamples[example.latex] }}
                        />
                      ) : (
                        <code>{example.latex}</code>
                      )}
                      <span>{getSymbolDescription(example, internalLocale)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <div className="rmb-footer">
        <button
          type="button"
          className="rmb-button rmb-button-secondary"
          onClick={inline ? clearInput : close}
        >
          {inline ? clearButtonText || t.clearButton : cancelButtonText || t.cancelButton}
        </button>
        <button
          type="button"
          className="rmb-button rmb-button-primary"
          onClick={insertFormula}
          disabled={!latexValue.trim() || readonly}
        >
          {insertButtonText || t.insertButton}
        </button>
      </div>
    </div>
  );

  if (inline) {
    return editor;
  }

  if (!currentOpen) {
    return null;
  }

  const dialog = (
    <div className="rmb-overlay" onClick={handleOverlayClick}>
      <div className={joinClassNames('rmb-dialog', `rmb-theme-${internalTheme}`, dialogClassName)}>
        <div className="rmb-dialog-header">
          <div>
            <h2>{title || t.title}</h2>
            <p>{subtitle || t.subtitle}</p>
          </div>
          <button
            type="button"
            className="rmb-close-button"
            aria-label={t.closeLabel}
            onClick={close}
          >
            x
          </button>
        </div>
        {editor}
      </div>
    </div>
  );

  return typeof document === 'undefined' ? dialog : createPortal(dialog, document.body);
}
