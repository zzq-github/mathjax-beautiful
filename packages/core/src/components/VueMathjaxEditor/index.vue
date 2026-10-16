<template>
  <div
    class="vue-mathjax-editor"
    :class="[
      {
        'full-screen': isFullScreen,
        'theme-dark': internalTheme === 'dark',
        'theme-light': internalTheme === 'light',
      },
      toolbarPositionClass,
      props.customClass
    ]"
    :style="editorStyle"
  >
    <!-- 工具栏 -->
    <div
      v-if="showToolbar"
      class="toolbar"
      :class="props.toolbarClass"
    >
      <!-- 基础格式工具 -->
      <div
        v-if="shouldShowTool('bold') || shouldShowTool('italic') || shouldShowTool('underline') || shouldShowTool('strikethrough')"
        class="format-group"
      >
        <button
          v-if="shouldShowTool('bold')"
          class="toolbar-btn"
          :class="{ active: isFormatActive('bold') }"
          :title="tooltipTexts.bold"
          @click="toggleFormat('bold')"
        >
          <strong>B</strong>
        </button>
        <button
          v-if="shouldShowTool('italic')"
          class="toolbar-btn"
          :class="{ active: isFormatActive('italic') }"
          :title="tooltipTexts.italic"
          @click="toggleFormat('italic')"
        >
          <em>I</em>
        </button>
        <button
          v-if="shouldShowTool('underline')"
          class="toolbar-btn"
          :class="{ active: isFormatActive('underline') }"
          :title="tooltipTexts.underline"
          @click="toggleFormat('underline')"
        >
          <u>U</u>
        </button>
        <button
          v-if="shouldShowTool('strikethrough')"
          class="toolbar-btn"
          :class="{ active: isFormatActive('strikethrough') }"
          :title="tooltipTexts.strikethrough"
          @click="toggleFormat('strikethrough')"
        >
          <s>S</s>
        </button>
      </div>

      <div
        v-if="(shouldShowTool('bold') || shouldShowTool('italic') || shouldShowTool('underline') || shouldShowTool('strikethrough')) && shouldShowTool('formula')"
        class="divider"
      />

      <!-- 公式工具 -->
      <div
        v-if="shouldShowTool('formula')"
        class="math-group"
      >
        <button
          class="toolbar-btn formula-btn"
          :title="tooltipTexts.formula"
          @mousedown.prevent="saveSelection"
          @click="showFormulaEditor"
        >
          <span class="fx-icon">fx</span>
          <span>{{ t.editor.toolbar.formulaShort }}</span>
        </button>
      </div>

      <div
        v-if="shouldShowTool('formula') && (shouldShowTool('image') || shouldShowTool('clear') || shouldShowTool('theme'))"
        class="divider"
      />

      <!-- 插入工具 -->
      <div
        v-if="shouldShowTool('image') || shouldShowTool('clear') || shouldShowTool('theme')"
        class="insert-group"
      >
        <input
          v-if="shouldShowTool('image')"
          ref="imageInput"
          type="file"
          :accept="props.allowedImageTypes.join(',')"
          style="display: none"
          @change="handleImageUpload"
          @cancel="restoreSelection"
        >
        <button
          v-if="shouldShowTool('image')"
          class="toolbar-btn image-btn"
          :disabled="uploadLoading || props.readonly"
          :title="tooltipTexts.image"
          @mousedown.prevent="saveSelection"
          @click="openImagePicker"
        >
          <span
            v-if="uploadLoading"
            class="loading-icon"
          >⟳</span>
          <span
            v-else
            class="icon"
          >🖼️</span>
          <span>{{ t.editor.toolbar.imageShort }}</span>
        </button>

        <div
          v-if="shouldShowTool('image') && (shouldShowTool('clear') || shouldShowTool('theme'))"
          class="divider"
        />

        <button 
          v-if="shouldShowTool('clear')"
          class="toolbar-btn clear-btn" 
          :title="tooltipTexts.clear" 
          :disabled="props.readonly"
          @click="clearFormat"
        >
          <span class="icon">🧹</span>
          <span>{{ t.editor.toolbar.clearShort }}</span>
        </button>

        <div
          v-if="shouldShowTool('clear') && (shouldShowTool('theme') || availableLocales.length > 1)"
          class="divider"
        />

        <button 
          v-if="availableLocales.length > 1"
          class="toolbar-btn language-btn" 
          :title="locale === 'zh-CN' ? 'Switch to English' : '切换到中文'" 
          @click="toggleLanguage"
        >
          <span class="icon">🌐</span>
          <span>{{ locale === 'zh-CN' ? '中' : 'EN' }}</span>
        </button>

        <div
          v-if="availableLocales.length > 1 && shouldShowTool('theme')"
          class="divider"
        />

        <button 
          v-if="shouldShowTool('theme')"
          class="toolbar-btn theme-btn" 
          :title="tooltipTexts.theme" 
          @click="toggleTheme"
        >
          <span class="icon">{{ themeIcon }}</span>
          <span>{{ t.editor.toolbar.theme }}</span>
        </button>
      </div>
    </div>

    <!-- 编辑器内容区域 -->
    <div class="editor-container">
      <div
        ref="editorRef"
        class="editor-content"
        :class="props.editorClass"
        :contenteditable="!props.readonly"
        :spellcheck="props.spellcheck"
        :placeholder="placeholder"
        :style="{ minHeight: minHeight, maxHeight: props.maxHeight !== 'none' ? props.maxHeight : undefined }"
        @input="handleInput"
        @beforeinput="handleBeforeInput"
        @keydown="handleKeydown"
        @paste="handlePaste"
        @focus="handleFocus"
        @blur="handleBlur"
        @mouseup="updateSelection"
        @keyup="updateSelection"
      />

      <!-- 统计信息 -->
      <div
        v-if="props.showCharCount || props.showWordCount"
        class="char-counter"
      >
        <span>{{ statsDisplay }}</span>
        <span
          v-if="props.maxLength"
          class="limit-info"
        >/ {{ props.maxLength }}</span>
      </div>
    </div>

    <!-- 公式编辑器弹窗 -->
    <VueMathjaxBeautiful
      v-if="props.enableFormula"
      v-model="showFormula"
      :existing-latex="editingLatex"
      :theme="internalTheme"
      v-bind="props.formulaEditorProps"
      @insert="insertFormula"
      @close="restoreSelection"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import VueMathjaxBeautiful from '../VueMathjaxBeautiful/index.vue';
import { convertLatexToSvg, extractLatexFromSvg, initMathJax, matchLatex } from '../../utils/latex';
import { useI18n } from '../../composables/useI18n';
import { escapeHtml, sanitizeHtml } from '../../utils/sanitizeHtml';

interface Props {
  // 基础内容控制
  modelValue?: string;
  placeholder?: string;
  
  // 尺寸和样式
  minHeight?: string;
  maxHeight?: string;
  width?: string;
  borderRadius?: string;
  
  // 工具栏配置
  showToolbar?: boolean;
  toolbarPosition?: 'top' | 'bottom';
  enabledTools?: string[];
  
  // 格式功能控制
  enableBold?: boolean;
  enableItalic?: boolean;
  enableUnderline?: boolean;
  enableStrikethrough?: boolean;
  
  // 插入功能控制
  enableFormula?: boolean;
  enableImage?: boolean;
  enableClearFormat?: boolean;
  enableThemeToggle?: boolean;
  
  // 编辑器行为配置
  readonly?: boolean;
  autoFocus?: boolean;
  spellcheck?: boolean;
  maxLength?: number;
  
  // 主题和外观
  theme?: 'light' | 'dark';
  
  // 统计显示
  showCharCount?: boolean;
  showWordCount?: boolean;
  
  // 功能增强
  enableShortcuts?: boolean;
  enableAutoSave?: boolean;
  autoSaveInterval?: number;
  
  // 公式编辑器配置
  formulaEditorProps?: Record<string, any>;
  
  // 上传配置
  maxImageSize?: number;
  allowedImageTypes?: string[];
  
  // 自定义样式类
  customClass?: string;
  toolbarClass?: string;
  editorClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  // 基础内容控制
  modelValue: '',
  placeholder: '',
  
  // 尺寸和样式
  minHeight: '300px',
  maxHeight: 'none',
  width: '100%',
  borderRadius: '12px',
  
  // 工具栏配置
  showToolbar: true,
  toolbarPosition: 'top',
  enabledTools: () => ['bold', 'italic', 'underline', 'strikethrough', 'formula', 'image', 'clear', 'theme'],
  
  // 格式功能控制
  enableBold: true,
  enableItalic: true,
  enableUnderline: true,
  enableStrikethrough: true,
  
  // 插入功能控制
  enableFormula: true,
  enableImage: true,
  enableClearFormat: true,
  enableThemeToggle: true,
  
  // 编辑器行为配置
  readonly: false,
  autoFocus: false,
  spellcheck: true,
  maxLength: 10000,
  
  // 主题和外观
  theme: 'light',
  
  // 统计显示
  showCharCount: true,
  showWordCount: false,
  
  // 功能增强
  enableShortcuts: true,
  enableAutoSave: false,
  autoSaveInterval: 30000,
  
  // 公式编辑器配置
  formulaEditorProps: () => ({}),
  
  // 上传配置
  maxImageSize: 5242880, // 5MB
  allowedImageTypes: () => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  
  // 自定义样式类
  customClass: '',
  toolbarClass: '',
  editorClass: '',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  change: [value: string];
  focus: [];
  blur: [];
  ready: [];
  error: [error: Error];
  themeChange: [theme: string];
  formatToggle: [format: string, active: boolean];
  imageUpload: [file: File];
  imageUploaded: [url: string];
  imageError: [error: string];
  formulaInsert: [latex: string];
  save: [content: string];
  charLimitReached: [];
  wordCountChange: [count: number];
  charCountChange: [count: number];
}>();

// 国际化
const { t, locale, setLocale, availableLocales } = useI18n();

// 响应式数据
const editorRef = ref<HTMLElement>();
const imageInput = ref<HTMLInputElement>();

const showFormula = ref(false);
const editingLatex = ref('');
const editingFormulaElement = ref<HTMLElement | null>(null);
const isFullScreen = ref(false);
const content = ref('');
const charCount = ref(0);
const wordCount = ref(0);
const uploadLoading = ref(false);
const activeFormats = ref(new Set<string>());
const autoSaveTimer = ref<number | null>(null);
const lastSavedContent = ref('');
const objectUrls = new Set<string>();
let savedRange: Range | null = null;

const isEditorRange = (range: Range) => !!editorRef.value &&
  editorRef.value.contains(range.startContainer) && editorRef.value.contains(range.endContainer);

const saveSelection = () => {
  const selection = window.getSelection();
  if (selection?.rangeCount && isEditorRange(selection.getRangeAt(0))) {
    savedRange = selection.getRangeAt(0).cloneRange();
  }
};

const restoreRange = (targetRange: Range | null) => {
  const editor = editorRef.value;
  if (!editor || props.readonly) return;
  const range = targetRange && isEditorRange(targetRange) ? targetRange.cloneRange() : document.createRange();
  if (!targetRange || !isEditorRange(targetRange)) {
    range.selectNodeContents(editor);
    range.collapse(false);
  }
  editor.focus({ preventScroll: true });
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
};

const restoreSelection = () => restoreRange(savedRange);

const openImagePicker = () => {
  if (props.readonly || !props.enableImage) return;
  saveSelection();
  imageInput.value?.click();
};

const insertEditorHtml = (html: string, targetRange = savedRange) => {
  restoreRange(targetRange);
  if (!document.execCommand('insertHTML', false, html)) {
    throw new Error('无法在编辑器中插入内容');
  }
  saveSelection();
};

// 组件内部主题状态（独立于外部传入的theme）
const internalTheme = ref(props.theme || 'light');
const hasUserChangedTheme = ref(false);

// 主题相关计算属性
const themeIcon = computed(() => {
  return internalTheme.value === 'dark' ? '☀️' : '🌙';
});

// 编辑器样式计算
const editorStyle = computed(() => {
  const style: Record<string, string> = {
    minHeight: props.minHeight,
    width: props.width,
    borderRadius: props.borderRadius,
  };
  
  if (props.maxHeight !== 'none') {
    style.maxHeight = props.maxHeight;
  }
  
  return style;
});

// 工具栏显示控制
const shouldShowTool = (tool: string) => {
  if (!props.enabledTools.includes(tool)) return false;
  
  switch (tool) {
    case 'bold':
      return props.enableBold;
    case 'italic':
      return props.enableItalic;
    case 'underline':
      return props.enableUnderline;
    case 'strikethrough':
      return props.enableStrikethrough;
    case 'formula':
      return props.enableFormula;
    case 'image':
      return props.enableImage;
    case 'clear':
      return props.enableClearFormat;
    case 'theme':
      return props.enableThemeToggle;
    default:
      return true;
  }
};

// 工具栏位置类
const toolbarPositionClass = computed(() => {
  return props.toolbarPosition === 'bottom' ? 'toolbar-bottom' : 'toolbar-top';
});

// 统计信息显示
const statsDisplay = computed(() => {
  const stats: string[] = [];
  if (props.showCharCount) {
    stats.push(`${charCount.value} ${t.value.editor.stats.characters}`);
  }
  if (props.showWordCount) {
    stats.push(`${wordCount.value} ${t.value.editor.stats.words}`);
  }
  return stats.join(' · ');
});

// 是否需要自动保存
const needsAutoSave = computed(() => {
  return props.enableAutoSave && content.value !== lastSavedContent.value;
});

// 计算化的文本
const placeholder = computed(() => {
  return props.placeholder || t.value.editor.placeholder;
});

const tooltipTexts = computed(() => {
  if (props.enableShortcuts) {
    return {
      bold: t.value.editor.shortcuts.bold,
      italic: t.value.editor.shortcuts.italic,
      underline: t.value.editor.shortcuts.underline,
      strikethrough: t.value.editor.toolbar.strikethrough + ' - 点击激活后，输入的文本将自动应用此格式',
      formula: t.value.editor.toolbar.formula,
      image: t.value.editor.toolbar.image,
      clear: t.value.editor.shortcuts.clear,
      theme: locale.value === 'zh-CN' ? (internalTheme.value === 'dark' ? '切换到亮色主题' : '切换到暗色主题') : (internalTheme.value === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'),
    };
  } else {
    return {
      bold: t.value.editor.toolbar.bold + ' - 点击激活后，输入的文本将自动应用此格式',
      italic: t.value.editor.toolbar.italic + ' - 点击激活后，输入的文本将自动应用此格式',
      underline: t.value.editor.toolbar.underline + ' - 点击激活后，输入的文本将自动应用此格式',
      strikethrough: t.value.editor.toolbar.strikethrough + ' - 点击激活后，输入的文本将自动应用此格式',
      formula: t.value.editor.toolbar.formula,
      image: t.value.editor.toolbar.image,
      clear: t.value.editor.toolbar.clear,
      theme: locale.value === 'zh-CN' ? (internalTheme.value === 'dark' ? '切换到亮色主题' : '切换到暗色主题') : (internalTheme.value === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'),
    };
  }
});

// 监听外部值变化
watch(
  () => props.modelValue,
  async (newVal) => {
    if (newVal !== content.value && editorRef.value) {
      content.value = newVal || '';
      const htmlContent = await convertFromStandardSyntax(newVal || '');
      editorRef.value.innerHTML = sanitizeHtml(htmlContent);
      updateStats();
      await nextTick();
      setupFormulaClickEvents();
    }
  },
  { immediate: true }
);

// 监听外部主题变化（仅在初始化时同步，之后组件内部独立控制）
watch(
  () => props.theme,
  (newTheme) => {
  // 只有在组件内部主题还没有被用户手动修改时才同步外部主题
  if (!hasUserChangedTheme.value) {
      internalTheme.value = newTheme;
  }
  },
  { immediate: true }
);

// 监听内部主题变化
watch(internalTheme, (newTheme, oldTheme) => {
  if (oldTheme !== undefined) {
    hasUserChangedTheme.value = true;
  }
});

// 将标准表达式语法转换为HTML显示
const convertFromStandardSyntax = async (content: string): Promise<string> => {
  if (!content) return '';

  let htmlContent = content;

  // 首先检查内容是否已经包含SVG公式
  const hasSvgFormulas = /<svg[^>]*data-latex[^>]*>/i.test(htmlContent);
  if (hasSvgFormulas) {
    htmlContent = extractLatexFromSvg(htmlContent);
  }

  // 处理基本格式
  htmlContent = htmlContent
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // 粗体
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // 斜体
    .replace(/__(.*?)__/g, '<u>$1</u>') // 下划线
    .replace(/~~(.*?)~~/g, '<s>$1</s>') // 删除线
    .replace(/!\[([^\]]*)\]\(([^)]*)\)/g, (_match, alt, src) => {
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" style="max-width: 100%; height: auto; margin: 8px 0; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">`;
    })
    .replace(/\n/g, '<br>'); // 换行

  // 转换LaTeX公式为SVG
  try {
    htmlContent = await convertLatexToSvg(htmlContent);
  } catch (error) {
    console.warn('LaTeX conversion failed:', error);
  }

  return sanitizeHtml(htmlContent);
};

// 将HTML内容转换为标准表达式语法
const convertToStandardSyntax = (editorElement: HTMLElement) => {
  const clonedElement = editorElement.cloneNode(true) as HTMLElement;

  // 将SVG数学公式元素转换为LaTeX格式
  const svgFormulas = clonedElement.querySelectorAll('svg[data-latex]');
  svgFormulas.forEach((svg) => {
    const latex = svg.getAttribute('data-latex') || '';
    if (latex) {
      const latexType = svg.getAttribute('data-latex-type');
      let latexFormat: string;

      if (latexType === 'inline') {
        latexFormat = `$${latex}$`;
      } else {
        latexFormat = `$$${latex}$$`;
      }

      const textNode = document.createTextNode(latexFormat);
      svg.parentNode?.replaceChild(textNode, svg);
    }
  });

  return sanitizeHtml(clonedElement.innerHTML);
};

// 格式检查 - 检查当前选区或光标位置的格式状态
const isFormatActive = (format: string): boolean => {
  // 只检查用户主动激活的格式，不检查光标位置的格式
  return activeFormats.value.has(format);
};

// 切换格式
const toggleFormat = (format: string) => {
  if (!editorRef.value || props.readonly) return;

  // 检查格式是否启用
  switch (format) {
    case 'bold':
      if (!props.enableBold) return;
      break;
    case 'italic':
      if (!props.enableItalic) return;
      break;
    case 'underline':
      if (!props.enableUnderline) return;
      break;
    case 'strikethrough':
      if (!props.enableStrikethrough) return;
      break;
  }

  try {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    
    if (!range.collapsed) {
      // 有选中文字，直接应用格式
      document.execCommand(format, false);
      // 清除激活格式状态
      activeFormats.value.clear();
      emit('formatToggle', format, true);
    } else {
      // 没有选中文字，切换激活状态（完全互斥模式）
      const wasActive = activeFormats.value.has(format);
      if (wasActive) {
        // 如果已经激活，则取消激活
        activeFormats.value.clear();
        emit('formatToggle', format, false);
      } else {
        // 清除所有格式，只激活当前格式
        activeFormats.value.clear();
        activeFormats.value.add(format);
        emit('formatToggle', format, true);
      }
    }
    
    editorRef.value.focus();
    handleInput();
  } catch (error) {
    console.warn('切换格式失败:', error);
    emit('error', error as Error);
  }
};

// 更新格式状态
const updateFormatState = () => {
  // 这个函数现在主要用于兼容性，实际格式状态由activeFormats管理
  // 但我们可以用它来检查光标位置的实际格式状态
  const formats = ['bold', 'italic', 'underline', 'strikethrough'];
  
  // 如果没有激活的格式，检查光标位置的格式状态来更新UI显示
  if (activeFormats.value.size === 0) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (range.collapsed) {
        // 光标位置，检查当前位置的格式状态
        formats.forEach((format) => {
          if (document.queryCommandState(format)) {
            // 注意：这里不添加到activeFormats，只是为了UI显示
            // 实际的激活状态仍由用户操作控制
          }
        });
      }
    }
  }
};

// 处理输入前事件
const handleBeforeInput = (event: Event) => {
  const inputEvent = event as InputEvent;
  // 如果有激活的格式状态，应用格式
  if (activeFormats.value.size > 0 && inputEvent.inputType === 'insertText' && inputEvent.data) {
    event.preventDefault();
    
    let wrappedText = escapeHtml(inputEvent.data);
    const activeFormatsArray = Array.from(activeFormats.value);
    
    // 构建样式对象
    const styles: string[] = [];
    let htmlTags = {
      start: '',
      end: '',
    };
    
    // 处理每个激活的格式
    activeFormatsArray.forEach((format) => {
      switch (format) {
        case 'bold':
          htmlTags.start = `<strong>${htmlTags.start}`;
          htmlTags.end = `${htmlTags.end}</strong>`;
          break;
        case 'italic':
          htmlTags.start = `<em>${htmlTags.start}`;
          htmlTags.end = `${htmlTags.end}</em>`;
          break;
        case 'underline':
          htmlTags.start = `<u>${htmlTags.start}`;
          htmlTags.end = `${htmlTags.end}</u>`;
          break;
        case 'strikethrough':
          htmlTags.start = `<s>${htmlTags.start}`;
          htmlTags.end = `${htmlTags.end}</s>`;
          break;
      }
    });
    
    // 如果有样式，包装在span中
    if (styles.length > 0) {
      wrappedText = `<span style="${styles.join('; ')}">${wrappedText}</span>`;
    }
    
    // 应用HTML标签
    wrappedText = htmlTags.start + wrappedText + htmlTags.end;
    
    // 插入格式化的文字
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = sanitizeHtml(wrappedText);
      const fragment = document.createDocumentFragment();
      
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }
      
      range.insertNode(fragment);
      range.collapse(false);
      selection.removeAllRanges();
      selection?.addRange(range);
    }
    
    handleInput();
  }
};

// 更新选区状态
const updateSelection = () => {
  if (!editorRef.value) return;
  saveSelection();

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    // 如果没有选区，保持当前格式状态
    return;
  }

  const range = selection.getRangeAt(0);
  
  // 如果有选中的文字，清除激活格式状态（因为要对选中文字应用格式）
  if (!range.collapsed) {
    activeFormats.value.clear();
  }
  
  // 更新格式状态
  updateFormatState();
};

// 插入公式
const insertFormula = async (latex: string) => {
  if (!editorRef.value || props.readonly || !latex.trim()) return;
  const trimmed = latex.trim();
  const hasWrapper = matchLatex(trimmed).some(match => match.start === 0 && match.end === trimmed.length);
  const formula = hasWrapper ? trimmed : `$$${trimmed}$$`;
  const insertionRange = savedRange?.cloneRange() ?? null;
  const editedElement = editingFormulaElement.value;
  editingFormulaElement.value = null;

  try {
    // 确保MathJax已经初始化
    if (!window.MathJax?.tex2svgPromise) {
      await initMathJax();
    }

    // 再次检查MathJax是否可用
    if (!window.MathJax?.tex2svgPromise) {
      throw new Error('MathJax初始化失败，无法渲染公式');
    }

    // 转换LaTeX为SVG
    const svgHtml = sanitizeHtml(await convertLatexToSvg(formula));
    if (!editorRef.value || props.readonly) return;

    // 如果是编辑已有公式，先删除原公式
    let targetRange = insertionRange;
    if (editedElement && editorRef.value.contains(editedElement)) {
      targetRange = document.createRange();
      targetRange.selectNode(editedElement);
    }

    // 插入SVG公式
    insertEditorHtml(svgHtml, targetRange);

    // 更新内容
    handleInput();

    // 重新设置公式点击事件
    await nextTick();
    setupFormulaClickEvents();

    // 发出公式插入事件
    emit('formulaInsert', latex);
    
  } catch (error) {
    console.error('插入公式失败:', error);
    // 如果SVG转换失败，作为备用方案插入LaTeX文本
    try {
      if (!editorRef.value || props.readonly) return;
      restoreRange(insertionRange);
      document.execCommand('insertText', false, formula);
      saveSelection();
      handleInput();
    } catch (fallbackError) {
      console.error('备用插入也失败:', fallbackError);
    }
  }
};

// 显示公式编辑器
const showFormulaEditor = () => {
  if (!props.enableFormula || props.readonly) return;
  saveSelection();
  
  showFormula.value = true;
  editingLatex.value = '';
  editingFormulaElement.value = null;
};

// 编辑已有公式
const editExistingFormula = (svgElement: HTMLElement) => {
  const latexCode = svgElement.getAttribute('data-latex');
  if (latexCode) {
    savedRange = document.createRange();
    savedRange.selectNode(svgElement);
    editingLatex.value = latexCode;
    editingFormulaElement.value = svgElement;
    showFormula.value = true;
  }
};

// 设置公式点击事件
const setupFormulaClickEvents = () => {
  if (!editorRef.value) return;

  const svgElements = editorRef.value.querySelectorAll('svg[data-latex]');
  svgElements.forEach((svg) => {
    const htmlElement = svg as HTMLElement;
    // Chromium's insertHTML command can strip this attribute while inserting SVG.
    htmlElement.setAttribute('contenteditable', 'false');
    htmlElement.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      editExistingFormula(htmlElement);
    };
  });
};

// 处理图片上传
const handleImageUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file || !editorRef.value || props.readonly || !props.enableImage) return;

  // 检查文件类型
  if (!props.allowedImageTypes.includes(file.type)) {
    const error = `不支持的文件类型: ${file.type}`;
    emit('imageError', error);
    target.value = '';
    return;
  }

  // 检查文件大小
  if (file.size > props.maxImageSize) {
    const error = `文件过大: ${(file.size / 1024 / 1024).toFixed(2)}MB，最大允许: ${(props.maxImageSize / 1024 / 1024).toFixed(2)}MB`;
    emit('imageError', error);
    target.value = '';
    return;
  }

  uploadLoading.value = true;
  emit('imageUpload', file);

  try {
    // 创建本地预览URL
    const imageUrl = URL.createObjectURL(file);
    objectUrls.add(imageUrl);

    // 插入图片
    const imgHtml = sanitizeHtml(
      `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(file.name)}" style="max-width: 100%; height: auto; margin: 8px 0; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />`
    );

    insertEditorHtml(imgHtml + ' ');

    emit('imageUploaded', imageUrl);
    handleInput();
  } catch (error) {
    console.error('图片上传失败:', error);
    emit('imageError', error instanceof Error ? error.message : '图片上传失败');
    emit('error', error as Error);
  } finally {
    uploadLoading.value = false;
    target.value = ''; // 清空input
  }
};

// 清除格式
const clearFormat = async () => {
  if (!editorRef.value || props.readonly || !props.enableClearFormat) return;

  try {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // 没有选区，清除所有激活的格式状态
      activeFormats.value.clear();
      editorRef.value.focus();
      return;
    }

    const range = selection.getRangeAt(0);
    
    if (range.collapsed) {
      // 光标位置，清除激活的格式状态
      activeFormats.value.clear();
      editorRef.value.focus();
      return;
    }

    // 有选中文本，清除选中文本的格式
    await clearSelectionFormat(range);
    
    // 清除激活的格式状态
    activeFormats.value.clear();
    editorRef.value.focus();
    handleInput();
  } catch (error) {
    console.warn('清除格式失败:', error);
  }
};

// 清除选中文本的格式
const clearSelectionFormat = async (range: Range) => {
  if (!editorRef.value) return;

  // 获取选中的内容
  const selectedContent = range.extractContents();
  
  // 创建一个临时容器来处理内容
  const tempContainer = document.createElement('div');
  tempContainer.appendChild(selectedContent);
  
  // 保存数学公式和图片
  const formulas: Array<{ element: Element; placeholder: Text }> = [];
  const images: Array<{ element: Element; placeholder: Text }> = [];
  
  // 保存SVG公式
  const svgFormulas = tempContainer.querySelectorAll('svg[data-latex]');
  svgFormulas.forEach((svg, index) => {
    const placeholder = document.createTextNode(`__FORMULA_${index}__`);
    formulas.push({ element: svg.cloneNode(true) as Element, placeholder });
    svg.parentNode?.replaceChild(placeholder, svg);
  });
  
  // 保存传统公式
  const spanFormulas = tempContainer.querySelectorAll('.math-formula');
  spanFormulas.forEach((formula, index) => {
    const placeholder = document.createTextNode(`__SPAN_FORMULA_${index}__`);
    formulas.push({ element: formula.cloneNode(true) as Element, placeholder });
    formula.parentNode?.replaceChild(placeholder, formula);
  });
  
  // 保存图片
  const imgElements = tempContainer.querySelectorAll('img');
  imgElements.forEach((img, index) => {
    const placeholder = document.createTextNode(`__IMAGE_${index}__`);
    images.push({ element: img.cloneNode(true) as Element, placeholder });
    img.parentNode?.replaceChild(placeholder, img);
  });
  
  // 获取纯文本内容（移除所有HTML格式）
  let cleanText = tempContainer.textContent || '';
  
  // 恢复公式和图片的占位符
  formulas.forEach(({ placeholder: _ph }, index) => {
    cleanText = cleanText.replace(`__FORMULA_${index}__`, `__FORMULA_${index}__`);
    cleanText = cleanText.replace(`__SPAN_FORMULA_${index}__`, `__SPAN_FORMULA_${index}__`);
  });

  images.forEach(({ placeholder: _ph }, index) => {
    cleanText = cleanText.replace(`__IMAGE_${index}__`, `__IMAGE_${index}__`);
  });
  
  // 创建新的内容容器
  const newContainer = document.createElement('div');
  newContainer.textContent = cleanText;
  
  // 恢复公式
  formulas.forEach(({ element }, index) => {
    const formulaPlaceholder = `__FORMULA_${index}__`;
    const spanFormulaPlaceholder = `__SPAN_FORMULA_${index}__`;
    
    if (newContainer.textContent?.includes(formulaPlaceholder)) {
      newContainer.innerHTML = newContainer.innerHTML.replace(
        formulaPlaceholder,
        element.outerHTML
      );
    }
    if (newContainer.textContent?.includes(spanFormulaPlaceholder)) {
      newContainer.innerHTML = newContainer.innerHTML.replace(
        spanFormulaPlaceholder,
        element.outerHTML
      );
    }
  });
  
  // 恢复图片
  images.forEach(({ element }, index) => {
    const imagePlaceholder = `__IMAGE_${index}__`;
    if (newContainer.textContent?.includes(imagePlaceholder)) {
      newContainer.innerHTML = newContainer.innerHTML.replace(imagePlaceholder, element.outerHTML);
    }
  });
  newContainer.innerHTML = sanitizeHtml(newContainer.innerHTML);
  
  // 创建文档片段
  const fragment = document.createDocumentFragment();
  while (newContainer.firstChild) {
    fragment.appendChild(newContainer.firstChild);
  }
  
  // 插入清理后的内容
  range.insertNode(fragment);
  
  // 重新设置选区
  range.collapse(false);
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
  
  // 重新设置公式点击事件
  await nextTick();
  setupFormulaClickEvents();
};

// 主题切换方法（仅影响当前组件）
const toggleTheme = () => {
  if (!props.enableThemeToggle) return;
  
  const newTheme = internalTheme.value === 'dark' ? 'light' : 'dark';
  internalTheme.value = newTheme;
  hasUserChangedTheme.value = true;
  emit('themeChange', newTheme);
};

// 语言切换方法
const toggleLanguage = () => {
  const newLocale = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN';
  setLocale(newLocale);
};

// 更新统计信息
const updateStats = () => {
  if (!editorRef.value) return;

  const text = editorRef.value.textContent || '';
  const previousCharCount = charCount.value;
  const previousWordCount = wordCount.value;
  
  charCount.value = text.length;
  wordCount.value = text.trim() ? text.trim().split(/\s+/).length : 0;
  
  // 发出统计变化事件
  if (charCount.value !== previousCharCount) {
    emit('charCountChange', charCount.value);
  }
  if (wordCount.value !== previousWordCount) {
    emit('wordCountChange', wordCount.value);
  }
  
  // 检查字符限制
  if (props.maxLength && charCount.value >= props.maxLength) {
    emit('charLimitReached');
  }
};

// 输入处理
const handleInput = () => {
  if (!editorRef.value) return;
  saveSelection();

  // 检查字符限制
  if (props.maxLength && editorRef.value.textContent && editorRef.value.textContent.length > props.maxLength) {
    const text = editorRef.value.textContent.substring(0, props.maxLength);
    editorRef.value.textContent = text;
    
    // 恢复光标位置到末尾
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(editorRef.value);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  const newContent = convertToStandardSyntax(editorRef.value);
  content.value = newContent;
  emit('update:modelValue', newContent);
  emit('change', newContent);

  updateStats();
  
  // 自动保存逻辑
  if (props.enableAutoSave) {
    if (autoSaveTimer.value) {
      window.clearTimeout(autoSaveTimer.value);
    }
    autoSaveTimer.value = window.setTimeout(() => {
      if (needsAutoSave.value) {
        lastSavedContent.value = content.value;
        emit('save', content.value);
      }
    }, props.autoSaveInterval);
  }
};

// 处理键盘事件
const handleKeydown = (event: KeyboardEvent) => {
  if (props.readonly) return;
  
  // 按Escape键清除格式状态
  if (event.key === 'Escape') {
    activeFormats.value.clear();
    updateSelection();
    return;
  }

  // 处理快捷键（仅在启用时）
  if (props.enableShortcuts && (event.ctrlKey || event.metaKey)) {
    switch (event.key) {
      case 'b':
        if (props.enableBold) {
          event.preventDefault();
          toggleFormat('bold');
        }
        break;
      case 'i':
        if (props.enableItalic) {
          event.preventDefault();
          toggleFormat('italic');
        }
        break;
      case 'u':
        if (props.enableUnderline) {
          event.preventDefault();
          toggleFormat('underline');
        }
        break;
      case 's':
        if (props.enableAutoSave) {
          event.preventDefault();
          lastSavedContent.value = content.value;
          emit('save', content.value);
        }
        break;
    }
  }

  // 某些键会重置格式状态
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
    // 延迟重置格式状态，让光标移动完成
    setTimeout(() => {
      activeFormats.value.clear();
      updateSelection();
    }, 0);
  }
};

// 处理粘贴事件
const handlePaste = async (event: ClipboardEvent) => {
  event.preventDefault();

  const clipboardData = event.clipboardData;
  if (!clipboardData || !editorRef.value) return;

  // 处理文本粘贴
  const text = clipboardData.getData('text/plain');
  if (text) {
    // 清理文本并转换LaTeX
    try {
      const processedText = await convertFromStandardSyntax(text);
      document.execCommand('insertHTML', false, processedText);

      handleInput();
      setupFormulaClickEvents();
    } catch {
      // 如果转换失败，插入纯文本
      document.execCommand('insertText', false, text);
    }
  }

  // 处理图片粘贴
  const items = clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile();
      if (file) {
        // 模拟文件上传
        const fakeEvent = {
          target: {
            files: [file],
          },
        } as unknown as Event;

        await handleImageUpload(fakeEvent);
      }
    }
  }
};

// 焦点处理
const handleFocus = () => {
  emit('focus');
};

const handleBlur = () => {
  if (!showFormula.value) saveSelection();
  emit('blur');
};

// 生命周期
onMounted(async () => {
  try {
    // 初始化MathJax
    await initMathJax();

    // 设置初始内容
    if (props.modelValue && editorRef.value) {
      const htmlContent = await convertFromStandardSyntax(props.modelValue);
      editorRef.value.innerHTML = sanitizeHtml(htmlContent);
      await nextTick();
      setupFormulaClickEvents();
    }

    updateStats();
    
    // 自动聚焦
    if (props.autoFocus && editorRef.value) {
      editorRef.value.focus();
    }
    
    // 发出就绪事件
    emit('ready');
    
  } catch (error) {
    console.error('VueMathjaxEditor初始化失败:', error);
    emit('error', error as Error);
  }
});

onUnmounted(() => {
  // 清理资源
  if (autoSaveTimer.value) {
    window.clearTimeout(autoSaveTimer.value);
  }
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls.clear();
});
</script>

<style scoped>
/* 确保基础样式生效 */
* {
  box-sizing: border-box;
}

.vue-mathjax-editor {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: white;
  border: 1px solid #e2e8f0;
  overflow: visible;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.vue-mathjax-editor:hover {
  /* box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); */
}

.vue-mathjax-editor.full-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
  border-radius: 0;
}

.vue-mathjax-editor.full-screen .toolbar {
  border-radius: 0;
}

.vue-mathjax-editor.full-screen .editor-container {
  border-radius: 0;
}

.vue-mathjax-editor.full-screen .editor-content {
  border-radius: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
  gap: 12px;
  flex-wrap: wrap;
  backdrop-filter: blur(10px);
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  position: relative;
  border-radius: 12px 12px 0 0;
}

.toolbar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.3), transparent);
}

.format-group,
.math-group,
.insert-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-btn {
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 40px;
  min-width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  color: #475569;
  position: relative;
  backdrop-filter: blur(10px);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  gap: 6px;
}

.toolbar-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 0.5s;
}

.toolbar-btn:hover::before {
  left: 100%;
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  color: #0f172a;
  font-weight: 600;
}

.toolbar-btn.active {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.toolbar-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.toolbar-btn:disabled:hover {
  transform: none;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.06);
}

.divider {
  width: 1px;
  height: 24px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    #cbd5e1 20%,
    #cbd5e1 80%,
    transparent 100%
  );
  margin: 0 12px;
  opacity: 0.6;
}

.formula-btn {
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.1) 0%,
    rgba(139, 92, 246, 0.1) 100%
  ) !important;
  color: #6366f1 !important;
  border: 1px solid rgba(99, 102, 241, 0.2) !important;
  min-width: auto !important;
  padding: 10px 18px !important;
  font-weight: 700 !important;
}

.formula-btn:hover {
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.2) 0%,
    rgba(139, 92, 246, 0.2) 100%
  ) !important;
  color: #3730a3 !important;
  border-color: rgba(99, 102, 241, 0.3) !important;
  transform: translateY(-2px) scale(1.02) !important;
  font-weight: 600 !important;
}

.fx-icon {
  font-weight: bold;
  font-style: italic;
  color: #6366f1;
  font-size: 18px;
  text-shadow: 0 1px 2px rgba(99, 102, 241, 0.2);
  margin-right: 4px;
}

.formula-btn:hover .fx-icon {
  color: #3730a3 !important;
  text-shadow: 0 1px 2px rgba(55, 48, 163, 0.3) !important;
}

.image-btn {
  background: linear-gradient(
    135deg,
    rgba(34, 197, 94, 0.1) 0%,
    rgba(59, 130, 246, 0.1) 100%
  ) !important;
  color: #059669 !important;
  border: 1px solid rgba(34, 197, 94, 0.2) !important;
  min-width: auto !important;
  padding: 10px 18px !important;
  font-weight: 700 !important;
}

.image-btn:hover {
  background: linear-gradient(
    135deg,
    rgba(34, 197, 94, 0.2) 0%,
    rgba(59, 130, 246, 0.2) 100%
  ) !important;
  color: #065f46 !important;
  border-color: rgba(34, 197, 94, 0.3) !important;
  transform: translateY(-2px) scale(1.02) !important;
  font-weight: 600 !important;
}

.clear-btn {
  background: linear-gradient(
    135deg,
    rgba(239, 68, 68, 0.1) 0%,
    rgba(245, 101, 101, 0.1) 100%
  ) !important;
  color: #dc2626 !important;
  border: 1px solid rgba(239, 68, 68, 0.2) !important;
  min-width: auto !important;
  padding: 10px 18px !important;
  font-weight: 700 !important;
}

.clear-btn:hover {
  background: linear-gradient(
    135deg,
    rgba(239, 68, 68, 0.2) 0%,
    rgba(245, 101, 101, 0.2) 100%
  ) !important;
  color: #991b1b !important;
  border-color: rgba(239, 68, 68, 0.3) !important;
  transform: translateY(-2px) scale(1.02) !important;
  font-weight: 600 !important;
}

.theme-btn:hover {
  background: linear-gradient(
    135deg,
    rgba(168, 85, 247, 0.1) 0%,
    rgba(139, 92, 246, 0.2) 100%
  ) !important;
  color: #6b21a8 !important;
  border-color: rgba(168, 85, 247, 0.3) !important;
  font-weight: 600 !important;
}

.loading-icon {
  animation: spin 1s linear infinite;
  font-size: 16px;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.editor-container {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 0 0 12px 12px;
}

.editor-content {
  flex: 1;
  padding: 24px;
  outline: none;
  font-size: 16px;
  line-height: 1.7;
  color: #334155;
  overflow-y: auto;
  transition: all 0.3s ease;
  background: white;
  border-radius: 0 0 12px 12px;
}

.editor-content:focus {
  background: linear-gradient(135deg, #fefefe 0%, #f8fafc 100%);
  box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.1);
}

.vue-mathjax-editor.theme-dark .editor-content:focus {
  background: linear-gradient(135deg, #374151 0%, #4b5563 100%) !important;
  box-shadow: inset 0 0 0 1px rgba(96, 165, 250, 0.2) !important;
}

.editor-content:empty:before {
  content: attr(placeholder);
  color: #94a3b8;
  font-style: italic;
  pointer-events: none;
}

.char-counter {
  position: absolute;
  bottom: 16px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
  background: rgba(255, 255, 255, 0.95);
  padding: 6px 12px;
  border-radius: 8px;
  backdrop-filter: blur(12px);
  transition: all 0.2s ease;
  pointer-events: none;
  user-select: none;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(226, 232, 240, 0.6);
}

.char-counter:hover {
  background: rgba(255, 255, 255, 0.98);
  border-color: rgba(156, 163, 175, 0.8);
  transform: translateY(-1px);
}

.char-count {
  font-weight: 700;
  color: #374151;
  font-variant-numeric: tabular-nums;
}

.char-label {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}

/* 编辑器内容样式 */
.editor-content :deep(strong) {
  font-weight: 700;
  color: #1f2937;
}

.editor-content :deep(em) {
  font-style: italic;
  color: #374151;
}

.editor-content :deep(u) {
  text-decoration: underline;
  text-decoration-color: #6366f1;
  text-decoration-thickness: 2px;
  text-underline-offset: 2px;
}

.editor-content :deep(s) {
  text-decoration: line-through;
  text-decoration-color: #ef4444;
  text-decoration-thickness: 2px;
  opacity: 0.7;
}

.editor-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 12px 0;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(226, 232, 240, 0.6);
}

.editor-content :deep(img:hover) {
  transform: scale(1.02) translateY(-2px);
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border-color: #6366f1;
}

/* SVG公式样式 */
.editor-content :deep(svg[data-latex]) {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 6px;
  padding: 4px 8px;
  margin: 0 4px;
  background: transparent;
  border: 1px solid transparent;
  font-size: 18px !important;
  min-height: 24px;
  vertical-align: middle;
}

.editor-content :deep(svg[data-latex]:hover) {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-color: #6366f1;
  transform: translateY(-2px) scale(1.02);
  box-shadow:
    0 4px 6px -1px rgba(99, 102, 241, 0.1),
    0 2px 4px -1px rgba(99, 102, 241, 0.06);
}

.editor-content :deep(svg[data-latex-type='inline']) {
  font-size: 30px !important;
  min-height: 20px;
  vertical-align: baseline;
  padding: 2px 6px;
}

.editor-content :deep(svg[data-latex-type='display']) {
  font-size: 30px !important;
  min-height: 28px;
  display: inline-block;
  margin: 8px 12px;
  padding: 6px 12px;
}

/* 添加微妙的动画效果 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.vue-mathjax-editor {
  animation: fadeInUp 0.4s ease-out;
}

/* 格式按钮特殊样式 */
.format-group .toolbar-btn {
  font-size: 16px !important;
  min-width: 44px !important;
  background: rgba(255, 255, 255, 0.9) !important;
  border: 1px solid rgba(226, 232, 240, 0.8) !important;
}

.format-group .toolbar-btn:hover {
  background: rgba(255, 255, 255, 1) !important;
  border-color: #6366f1 !important;
  color: #4f46e5 !important;
  font-weight: 600 !important;
}

.format-group .toolbar-btn:hover strong,
.format-group .toolbar-btn:hover em,
.format-group .toolbar-btn:hover u,
.format-group .toolbar-btn:hover s {
  color: #4f46e5 !important;
  font-weight: 700 !important;
}

.format-group .toolbar-btn.active {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
  border-color: transparent !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3) !important;
}

.format-group .toolbar-btn.active strong,
.format-group .toolbar-btn.active em,
.format-group .toolbar-btn.active u,
.format-group .toolbar-btn.active s {
  color: white !important;
  font-weight: 700 !important;
}

/* 工具栏位置样式 */
.vue-mathjax-editor.toolbar-bottom {
  flex-direction: column-reverse;
}

.vue-mathjax-editor.toolbar-bottom .toolbar {
  border-top: 1px solid #e2e8f0;
  border-bottom: none;
  border-radius: 0 0 12px 12px;
}

.vue-mathjax-editor.toolbar-bottom .editor-container {
  border-radius: 12px 12px 0 0;
}

.vue-mathjax-editor.toolbar-bottom .editor-content {
  border-radius: 12px 12px 0 0;
}

/* 只读状态样式 */
.vue-mathjax-editor .editor-content[contenteditable="false"] {
  background: #f8fafc !important;
  cursor: default;
  user-select: text;
}

.vue-mathjax-editor.theme-dark .editor-content[contenteditable="false"] {
  background: #1f2937 !important;
  opacity: 0.8;
}

/* 字符限制样式 */
.char-counter .limit-info {
  color: #6b7280;
  font-size: 11px;
  margin-left: 4px;
}

.char-counter.over-limit {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

/* 禁用状态按钮样式 */
.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.toolbar-btn:disabled:hover {
  transform: none !important;
  box-shadow: none !important;
  background: rgba(255, 255, 255, 0.8) !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .vue-mathjax-editor {
    border-radius: 8px;
  }

  .toolbar {
    flex-wrap: wrap;
    padding: 12px 16px;
    gap: 8px;
    border-radius: 8px 8px 0 0;
  }

  .editor-container {
    border-radius: 0 0 8px 8px;
  }

  .editor-content {
    border-radius: 0 0 8px 8px;
  }
  
  .toolbar-btn {
    padding: 8px 12px;
    font-size: 13px;
    height: 36px;
    min-width: 36px;
  }
  
  .formula-btn,
  .image-btn,
  .clear-btn {
    padding: 8px 14px !important;
    font-size: 12px !important;
  }
  
  .format-group .toolbar-btn {
    font-size: 14px !important;
    min-width: 36px !important;
  }
  
  .divider {
    height: 20px;
    margin: 0 8px;
  }
  
  .editor-content {
    padding: 18px;
    font-size: 15px;
    line-height: 1.6;
  }
  
  .char-counter {
    bottom: 12px;
    right: 16px;
    font-size: 11px;
    padding: 4px 8px;
  }
  
  .fx-icon {
    font-size: 16px;
    margin-right: 2px;
  }
}

@media (max-width: 480px) {
  .toolbar {
    padding: 10px 12px;
    gap: 6px;
  }
  
  .toolbar-btn {
    padding: 6px 10px;
    font-size: 12px;
    height: 32px;
    min-width: 32px;
  }
  
  .formula-btn,
  .image-btn,
  .clear-btn {
    padding: 6px 12px !important;
    font-size: 11px !important;
  }
  
  .editor-content {
    padding: 16px;
    font-size: 14px;
  }
  
  .char-counter {
    bottom: 10px;
    right: 12px;
    font-size: 10px;
    padding: 3px 6px;
  }
}

/* 暗色主题下的整体样式 */
.vue-mathjax-editor.theme-dark {
  background: #1f2937 !important;
  border-color: #374151 !important;
}

.vue-mathjax-editor.theme-dark .toolbar {
  background: linear-gradient(135deg, #1f2937 0%, #374151 100%) !important;
  border-bottom-color: #4b5563 !important;
}

.vue-mathjax-editor.theme-dark .editor-container {
  background: #1f2937 !important;
}

.vue-mathjax-editor.theme-dark .editor-content {
  background: #1f2937 !important;
}

/* 暗色主题下的工具栏按钮样式 - 直接在组件中定义确保生效 */
.vue-mathjax-editor.theme-dark .toolbar .toolbar-btn {
  border-color: rgba(156, 163, 175, 0.4) !important;
  background: rgba(55, 65, 81, 0.8) !important;
  color: #e5e7eb !important;
}

.vue-mathjax-editor.theme-dark .toolbar .toolbar-btn strong,
.vue-mathjax-editor.theme-dark .toolbar .toolbar-btn em,
.vue-mathjax-editor.theme-dark .toolbar .toolbar-btn u,
.vue-mathjax-editor.theme-dark .toolbar .toolbar-btn s {
  color: #f3f4f6 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5) !important;
  font-weight: 700 !important;
}

.vue-mathjax-editor.theme-dark .toolbar .toolbar-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%) !important;
  border-color: #60a5fa !important;
  color: white !important;
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
}

.vue-mathjax-editor.theme-dark .toolbar .toolbar-btn:hover:not(:disabled) strong,
.vue-mathjax-editor.theme-dark .toolbar .toolbar-btn:hover:not(:disabled) em,
.vue-mathjax-editor.theme-dark .toolbar .toolbar-btn:hover:not(:disabled) u,
.vue-mathjax-editor.theme-dark .toolbar .toolbar-btn:hover:not(:disabled) s {
  color: white !important;
  text-shadow: none !important;
}

.vue-mathjax-editor.theme-dark .toolbar .toolbar-btn.active {
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%) !important;
  border-color: #60a5fa !important;
  color: white !important;
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
}

.vue-mathjax-editor.theme-dark .toolbar .toolbar-btn.active strong,
.vue-mathjax-editor.theme-dark .toolbar .toolbar-btn.active em,
.vue-mathjax-editor.theme-dark .toolbar .toolbar-btn.active u,
.vue-mathjax-editor.theme-dark .toolbar .toolbar-btn.active s {
  color: white !important;
  text-shadow: none !important;
}

/* 暗色主题下的编辑器内容样式 */
.vue-mathjax-editor.theme-dark .editor-content {
  color: #e5e7eb !important;
}

.vue-mathjax-editor.theme-dark .editor-content :deep(strong) {
  color: #f9fafb !important;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.vue-mathjax-editor.theme-dark .editor-content :deep(em) {
  color: #f3f4f6 !important;
  font-style: italic;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.vue-mathjax-editor.theme-dark .editor-content :deep(u) {
  color: #f3f4f6 !important;
  text-decoration-color: #60a5fa !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.vue-mathjax-editor.theme-dark .editor-content :deep(s) {
  color: #e5e7eb !important;
  text-decoration-color: #f87171 !important;
  opacity: 0.8;
}

.vue-mathjax-editor.theme-dark .editor-content :deep(img) {
  border-color: rgba(107, 114, 128, 0.6) !important;
}

.vue-mathjax-editor.theme-dark .editor-content :deep(img:hover) {
  border-color: #60a5fa !important;
}

.vue-mathjax-editor.theme-dark .editor-content :deep(svg[data-latex]:hover) {
  background: linear-gradient(
    135deg,
    rgba(55, 65, 81, 0.8) 0%,
    rgba(75, 85, 99, 0.8) 100%
  ) !important;
  border-color: #60a5fa !important;
}

/* 暗色主题下的字符计数器 */
.vue-mathjax-editor.theme-dark .char-counter {
  background: rgba(55, 65, 81, 0.9) !important;
  border-color: rgba(107, 114, 128, 0.6) !important;
}

.vue-mathjax-editor.theme-dark .char-count {
  color: #f3f4f6 !important;
}

.vue-mathjax-editor.theme-dark .char-label {
  color: #d1d5db !important;
}
</style>
