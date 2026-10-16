export type {
  MathJaxConfig,
  MathJaxInstance,
  MathJaxRenderOptions,
  MathJaxStartup,
} from '@vue-mathjax-beautiful/shared';

export interface RichTextEditorProps {
  modelValue?: string;
  placeholder?: string;
  minHeight?: string;
  showToolbar?: boolean;
  readonly?: boolean;
}

export interface FormulaEditorDialogProps {
  modelValue: boolean;
  existingLatex?: string;
}

export interface VueMathjaxBeautifulThemeColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  button?: string;
  buttonHover?: string;
  buttonText?: string;
  dialogBackground?: string;
  inputBackground?: string;
  inputBorder?: string;
}

export interface VueMathjaxBeautifulThemeConfig {
  light?: VueMathjaxBeautifulThemeColors;
  dark?: VueMathjaxBeautifulThemeColors;
}

export interface VueMathjaxBeautifulProps {
  modelValue?: boolean;
  existingLatex?: string;
  inlineMode?: boolean;

  theme?: 'light' | 'dark';
  themeConfig?: VueMathjaxBeautifulThemeConfig;
  width?: string;
  height?: string;
  scale?: number;
  fontSize?: string;

  /**
   * 符号按钮固定宽度（数字按 px 处理，字符串支持 px/rem/em，如 "2.5rem"）。
   * 不传时按容器宽度自适应均分。
   */
  symbolWidth?: number | string;
  /** 符号按钮固定高度（数字按 px 处理，字符串支持 px/rem/em），不传时使用默认高度 */
  symbolHeight?: number | string;
  /** 符号按钮之间的间距（数字按 px 处理，字符串支持 px/rem/em），允许 0，默认 8px */
  symbolGap?: number | string;

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

  insertButtonText?: string;
  cancelButtonText?: string;
  clearButtonText?: string;

  title?: string;
  subtitle?: string;

  wrapFormula?: boolean;
}

export interface VueMathjaxBeautifulEvents {
  'update:modelValue': (value: boolean) => void;
  insert: (latex: string) => void;
  change: (latex: string) => void;
  clear: () => void;
  close: () => void;
  themeChange: (theme: string) => void;
}

export interface EditorEvents {
  'update:modelValue': (value: string | boolean) => void;
  change: (value: string) => void;
  focus: () => void;
  blur: () => void;
  insert: (latex: string) => void;
}

export interface VueMathjaxEditorProps {
  modelValue?: string;
  placeholder?: string;

  minHeight?: string;
  maxHeight?: string;
  width?: string;
  borderRadius?: string;

  showToolbar?: boolean;
  toolbarPosition?: 'top' | 'bottom';
  enabledTools?: string[];

  enableBold?: boolean;
  enableItalic?: boolean;
  enableUnderline?: boolean;
  enableStrikethrough?: boolean;

  enableFormula?: boolean;
  enableImage?: boolean;
  enableClearFormat?: boolean;
  enableThemeToggle?: boolean;

  readonly?: boolean;
  autoFocus?: boolean;
  spellcheck?: boolean;
  maxLength?: number;

  theme?: 'light' | 'dark';

  showCharCount?: boolean;
  showWordCount?: boolean;

  enableShortcuts?: boolean;
  enableAutoSave?: boolean;
  autoSaveInterval?: number;

  formulaEditorProps?: Record<string, unknown>;

  maxImageSize?: number;
  allowedImageTypes?: string[];

  customClass?: string;
  toolbarClass?: string;
  editorClass?: string;
}

export interface VueMathjaxEditorEvents {
  'update:modelValue': (value: string) => void;
  change: (value: string) => void;
  focus: () => void;
  blur: () => void;
  ready: () => void;
  error: (error: Error) => void;
  themeChange: (theme: string) => void;
  formatToggle: (format: string, active: boolean) => void;
  imageUpload: (file: File) => void;
  imageUploaded: (url: string) => void;
  imageError: (error: string) => void;
  formulaInsert: (latex: string) => void;
  save: (content: string) => void;
  charLimitReached: () => void;
  wordCountChange: (count: number) => void;
  charCountChange: (count: number) => void;
}
