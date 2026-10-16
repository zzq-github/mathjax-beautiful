<template>
  <!-- 内联模式 -->
  <div
    v-if="inlineMode"
    class="vue-mathjax-beautiful-inline"
    :class="{ 'theme-dark': internalTheme === 'dark', 'theme-light': internalTheme === 'light' }"
    :style="customThemeVars"
  >
    <!-- 编辑器内容 -->
    <div class="editor-container">
      <!-- 输入区域 -->
      <div class="input-section">
        <div class="section-header">
          <div class="section-title">
            <span class="icon">📝</span>
            <span>{{ t.beautiful.inputSection }}</span>
          </div>
          <div class="input-actions">
            <button 
              v-if="availableLocales.length > 1 && showLanguageToggle"
              class="action-btn" 
              :title="locale === 'zh-CN' ? 'Switch to English' : '切换到中文'" 
              @click="toggleLanguage"
            >
              <span class="icon">🌐</span>
            </button>
            <button 
              v-if="showThemeToggle"
              class="action-btn" 
              :title="internalTheme === 'dark' ? t.beautiful.themeToggle.light : t.beautiful.themeToggle.dark" 
              @click="toggleTheme"
            >
              <span class="icon">{{ themeIcon }}</span>
            </button>
            <button 
              v-if="showClearButton && !readonly"
              class="action-btn" 
              :title="t.beautiful.clearButton" 
              @click="clearInput"
            >
              <span class="icon">🗑️</span>
            </button>
          </div>
        </div>
        <div class="input-wrapper">
          <textarea
            v-model="latexInput"
            class="latex-input"
            :placeholder="computedPlaceholder"
            :readonly="readonly"
            :rows="rows"
            :maxlength="maxLength"
            @input="handleInput"
          />
        </div>
      </div>

      <!-- 预览区域 -->
      <div
        v-if="showPreview"
        class="preview-section"
      >
        <div class="section-header">
          <div class="section-title">
            <span class="icon">👁️</span>
            <span>{{ t.beautiful.previewSection }}</span>
          </div>
          <div
            class="preview-status"
            :class="{ active: latexInput }"
          >
            <span
              v-if="latexInput"
              class="status-dot"
            />
            {{ latexInput ? t.beautiful.rendering : t.beautiful.noFormula }}
          </div>
        </div>
        <div class="preview-container">
          <div
            v-if="latexInput"
            class="formula-preview"
            v-html="renderedFormula"
          />
          <div
            v-else
            class="no-formula"
          >
            <span class="icon">💡</span>
            <span>{{ t.beautiful.inputPlaceholder }}</span>
          </div>
        </div>
      </div>

      <!-- 符号面板 -->
      <div
        v-if="showSymbols"
        class="symbols-section"
      >
        <!-- 分类标签 -->
        <div class="category-tabs">
          <button
            v-for="category in filteredCategories"
            :key="category.key"
            :class="['tab-button', { active: activeCategory === category.key }]"
            @click="activeCategory = category.key"
          >
            <span class="tab-icon">{{ category.icon }}</span>
            <span class="tab-name">{{ getCategoryName(category, locale) }}</span>
          </button>
          
          <!-- 大小写切换按钮（仅在基础分类时显示） -->
          <!-- <button
              v-if="activeCategory === 'basic'"
              class="case-toggle-btn"
              :class="{ 'uppercase': isUppercase }"
              @click="toggleCase"
              :title="isUppercase ? t.beautiful.caseToggle.lowercase : t.beautiful.caseToggle.uppercase"
            >
              <span class="case-icon">{{ isUppercase ? 'Aa' : 'aA' }}</span>
            </button> -->
        </div>

        <!-- 符号内容 -->
        <div class="symbols-content">
          <!-- 符号网格（虚拟网格优化） -->
          <div 
            ref="symbolsContainerRef"
            class="symbols-grid virtual-grid-container"
            :style="{ height: '240px', overflowY: 'auto' }"
            @scroll="handleSymbolsScroll"
          >
            <div :style="{ height: symbolsRange.totalHeight + 'px', position: 'relative' }">
              <button
                v-for="item in visibleSymbols"
                :key="item.data.latex"
                class="symbol-button"
                :style="getSymbolItemStyle(item)"
                :title="getSymbolDescription(item.data, locale)"
                @click="insertSymbol(item.data.latex)"
              >
                <span
                  v-if="item.data.display"
                  v-html="item.data.display"
                />
                <span
                  v-else
                  class="symbol-fallback"
                >{{ item.data.latex }}</span>
              </button>
            </div>
          </div>

          <!-- 常用公式示例 -->
          <div
            v-if="activeCategory === 'basic' && showFormulaExamples"
            class="formula-examples"
          >
            <div class="examples-header">
              <span class="icon">⭐</span>
              <span>{{ t.beautiful.categories.formulas }}</span>
            </div>
            <div class="examples-grid">
              <button
                v-for="example in reactiveFormulaExamples"
                :key="example.latex"
                class="example-button"
                :title="getSymbolDescription(example, locale)"
                @click="insertSymbol(example.latex)"
              >
                <div
                  class="example-preview"
                  v-html="example.display"
                />
                <div class="example-description">
                  {{ getSymbolDescription(example, locale) }}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作（内联模式） -->
      <div class="inline-footer">
        <button 
          v-if="showClearButton && !readonly"
          class="btn btn-secondary" 
          @click="clearInput"
        >
          {{ t.beautiful.clearButton }}
        </button>
        <button 
          class="btn btn-primary" 
          :disabled="!latexInput || readonly" 
          @click="handleInsert"
        >
          {{ t.beautiful.insertButton }}
        </button>
      </div>
    </div>
  </div>

  <!-- 弹窗模式 -->
  <Teleport to="body">
    <Transition
      name="overlay"
      appear
    >
      <div
        v-if="visible"
        class="vue-mathjax-beautiful-overlay"
        :class="{ 'theme-dark': internalTheme === 'dark', 'theme-light': internalTheme === 'light', 'show': visible }"
        @click="handleOverlayClick"
      >
        <Transition
          name="dialog"
          appear
        >
          <div
            v-if="visible"
            class="vue-mathjax-beautiful-dialog"
            :class="{ 'theme-dark': internalTheme === 'dark', 'theme-light': internalTheme === 'light', 'show': visible }"
            :style="{ ...dialogStyle, ...customThemeVars }"
            @click.stop
          >
            <!-- 头部 -->
            <div class="dialog-header">
              <div class="header-content">
                <div class="header-icon">
                  <span class="icon">📐</span>
                </div>
                <div class="header-text">
                  <h3 class="header-title">
                    {{ title || t.beautiful.title }}
                  </h3>
                  <p class="header-subtitle">
                    {{ subtitle || t.beautiful.subtitle }}
                  </p>
                </div>
                <div class="header-badge">
                  <span>LaTeX</span>
                </div>
              </div>
              <button
                class="close-btn"
                @click="handleClose"
              >
                <span>×</span>
              </button>
            </div>

            <!-- 编辑器内容 -->
            <div class="editor-container">
              <!-- 输入区域 -->
              <div class="input-section">
                <div class="section-header">
                  <div class="section-title">
                    <span class="icon">📝</span>
                    <span>{{ t.beautiful.inputSection }}</span>
                  </div>
                  <div class="input-actions">
                    <button 
                      v-if="availableLocales.length > 1 && showLanguageToggle"
                      class="action-btn" 
                      :title="locale === 'zh-CN' ? 'Switch to English' : '切换到中文'" 
                      @click="toggleLanguage"
                    >
                      <span class="icon">🌐</span>
                    </button>
                    <button 
                      v-if="showThemeToggle"
                      class="action-btn" 
                      :title="internalTheme === 'dark' ? t.beautiful.themeToggle.light : t.beautiful.themeToggle.dark" 
                      @click="toggleTheme"
                    >
                      <span class="icon">{{ themeIcon }}</span>
                    </button>
                    <button 
                      v-if="showClearButton && !readonly"
                      class="action-btn" 
                      :title="t.beautiful.clearButton" 
                      @click="clearInput"
                    >
                      <span class="icon">🗑️</span>
                    </button>
                  </div>
                </div>
                <div class="input-wrapper">
                  <textarea
                    v-model="latexInput"
                    class="latex-input"
                    :placeholder="computedPlaceholder"
                    :readonly="readonly"
                    :rows="rows"
                    :maxlength="maxLength"
                    @input="handleInput"
                  />
                </div>
              </div>

              <!-- 预览区域 -->
              <div
                v-if="showPreview"
                class="preview-section"
              >
                <div class="section-header">
                  <div class="section-title">
                    <span class="icon">👁️</span>
                    <span>{{ t.beautiful.previewSection }}</span>
                  </div>
                  <div
                    class="preview-status"
                    :class="{ active: latexInput }"
                  >
                    <span
                      v-if="latexInput"
                      class="status-dot"
                    />
                    {{ latexInput ? t.beautiful.rendering : t.beautiful.noFormula }}
                  </div>
                </div>
                <div class="preview-container">
                  <div
                    v-if="latexInput"
                    class="formula-preview"
                    v-html="renderedFormula"
                  />
                  <div
                    v-else
                    class="no-formula"
                  >
                    <span class="icon">💡</span>
                    <span>{{ t.beautiful.inputPlaceholder }}</span>
                  </div>
                </div>
              </div>

              <!-- 符号面板 -->
              <div
                v-if="showSymbols"
                class="symbols-section"
              >
                <!-- 分类标签 -->
                <div class="category-tabs">
                  <button
                    v-for="category in filteredCategories"
                    :key="category.key"
                    :class="['tab-button', { active: activeCategory === category.key }]"
                    @click="activeCategory = category.key"
                  >
                    <span class="tab-icon">{{ category.icon }}</span>
                    <span class="tab-name">{{ getCategoryName(category, locale) }}</span>
                  </button>
            
                  <!-- 大小写切换按钮（仅在基础分类时显示） -->
                  <!-- <button
              v-if="activeCategory === 'basic'"
              class="case-toggle-btn"
              :class="{ 'uppercase': isUppercase }"
              @click="toggleCase"
              :title="isUppercase ? t.beautiful.caseToggle.lowercase : t.beautiful.caseToggle.uppercase"
            >
              <span class="case-icon">{{ isUppercase ? 'Aa' : 'aA' }}</span>
            </button> -->
                </div>

                <!-- 符号内容 -->
                <div class="symbols-content">
                  <!-- 符号网格（虚拟网格优化） -->
                  <div 
                    ref="symbolsContainerRef"
                    class="symbols-grid virtual-grid-container"
                    :style="{ height: '240px', overflowY: 'auto' }"
                    @scroll="handleSymbolsScroll"
                  >
                    <div :style="{ height: symbolsRange.totalHeight + 'px', position: 'relative' }">
                      <button
                        v-for="item in visibleSymbols"
                        :key="item.data.latex"
                        class="symbol-button"
                        :style="getSymbolItemStyle(item)"
                        :title="getSymbolDescription(item.data, locale)"
                        @click="insertSymbol(item.data.latex)"
                      >
                        <span
                          v-if="item.data.display"
                          v-html="item.data.display"
                        />
                        <span
                          v-else
                          class="symbol-fallback"
                        >{{ item.data.latex }}</span>
                      </button>
                    </div>
                  </div>

                  <!-- 常用公式示例 -->
                  <div
                    v-if="activeCategory === 'basic' && showFormulaExamples"
                    class="formula-examples"
                  >
                    <div class="examples-header">
                      <span class="icon">⭐</span>
                      <span>{{ t.beautiful.categories.formulas }}</span>
                    </div>
                    <div class="examples-grid">
                      <button
                        v-for="example in reactiveFormulaExamples"
                        :key="example.latex"
                        class="example-button"
                        :title="getSymbolDescription(example, locale)"
                        @click="insertSymbol(example.latex)"
                      >
                        <div
                          class="example-preview"
                          v-html="example.display"
                        />
                        <div class="example-description">
                          {{ getSymbolDescription(example, locale) }}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 底部操作（弹窗模式） -->
            <div class="dialog-footer">
              <button
                class="btn btn-secondary"
                @click="handleClose"
              >
                {{ t.beautiful.cancelButton }}
              </button>
              <button 
                class="btn btn-primary" 
                :disabled="!latexInput || readonly" 
                @click="handleInsert"
              >
                {{ t.beautiful.insertButton }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { initMathJax } from '../../utils/latex';
import { useI18n } from '../../composables/useI18n';
import { useVirtualGrid, useBatchRender } from '../../composables/useVirtualList';
import { logger } from '../../utils/logger';
import { escapeHtml, sanitizeHtml } from '../../utils/sanitizeHtml';
import type { VueMathjaxBeautifulProps, VueMathjaxBeautifulThemeConfig } from '../../types';
import {
  type Symbol,
  basicSymbols,
  greekSymbols,
  advancedSymbols,
  formulaExamples,
  categories,
  getSymbolDescription,
  getCategoryName,
} from '../../data';

type ThemeConfig = VueMathjaxBeautifulThemeConfig;

const props = withDefaults(
  defineProps<VueMathjaxBeautifulProps>(),
  {
    modelValue: false,
    existingLatex: '',
    inlineMode: false,
    theme: 'light',
    themeConfig: (): ThemeConfig => ({
      light: {
        primary: '#3b82f6',
        secondary: '#6b7280',
        accent: '#10b981',
        button: '#3b82f6',
        buttonHover: '#2563eb',
        buttonText: '#ffffff',
        dialogBackground: '#ffffff',
        inputBackground: '#ffffff',
        inputBorder: '#e5e7eb',
      },
      dark: {
        primary: '#60a5fa',
        secondary: '#9ca3af',
        accent: '#34d399',
        button: '#60a5fa',
        buttonHover: '#3b82f6',
        buttonText: '#ffffff',
        dialogBackground: '#1f2937',
        inputBackground: '#374151',
        inputBorder: '#4b5563',
      },
    }),
    width: 'auto',
    height: 'auto',
    scale: 1.2,
    fontSize: '16px',
    readonly: false,
    showSymbols: true,
    showPreview: true,
    showThemeToggle: true,
    showClearButton: true,
    showLanguageToggle: true,
    showFormulaExamples: true,
    autoFocus: true,
    placeholder: '',
    maxLength: 1000,
    rows: 2,
    enabledCategories: () => ['basic', 'greek', 'advanced'],
    defaultCategory: 'basic',
    insertButtonText: '插入公式',
    cancelButtonText: '取消',
    clearButtonText: '清空',
    title: '数学公式编辑器',
    subtitle: '使用下方按钮或直接输入 LaTeX 代码',
    wrapFormula: true,
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  insert: [latex: string];
  change: [latex: string];
  clear: [];
  close: [];
  themeChange: [theme: string];
}>();

// 国际化
const { t, locale, setLocale, availableLocales } = useI18n();

// 响应式数据
const visible = ref(false);
const latexInput = ref('');
const activeCategory = ref(props.defaultCategory);
const renderedFormula = ref('');
const isUppercase = ref(false);

// 组件内部主题状态（独立于外部传入的theme）
const internalTheme = ref(props.theme || 'light');

// 创建响应式的符号数据副本
const reactiveBasicSymbols = ref<Symbol[]>(basicSymbols.map(symbol => ({ ...symbol })));
const reactiveGreekSymbols = ref<Symbol[]>(greekSymbols.map(symbol => ({ ...symbol })));
const reactiveAdvancedSymbols = ref<Symbol[]>(advancedSymbols.map(symbol => ({ ...symbol })));
const reactiveFormulaExamples = ref<Symbol[]>([...formulaExamples]);

// 虚拟网格优化 - 符号面板
const symbolsList = computed(() => currentSymbols.value);

// 符号按钮尺寸默认值（与样式保持一致）
const SYMBOL_PANEL_HEIGHT = 240;
const DEFAULT_SYMBOL_ITEM_HEIGHT = 48;
const DEFAULT_SYMBOL_COLUMN_COUNT = 8;
const DEFAULT_SYMBOL_GAP = 8;

/** 支持数字以及 px/rem/em；间距可为 0，宽高必须为正数。 */
const toPixel = (value?: number | string, allowZero = false): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  let pixel: number;
  if (typeof value === 'number') {
    pixel = value;
  } else {
    const match = value.trim().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(px|rem|em)?$/i);
    if (!match) return undefined;
    pixel = Number(match[1]);
    const unit = match[2]?.toLowerCase();
    if (unit === 'rem' || unit === 'em') {
      if (typeof window === 'undefined') return undefined;
      const root = document.documentElement;
      const rootFontSize = Number.parseFloat(window.getComputedStyle(root).fontSize) || 16;
      const element = unit === 'em' ? symbolsContainerRef.value : root;
      const fontSize = element
        ? Number.parseFloat(window.getComputedStyle(element).fontSize) || rootFontSize
        : rootFontSize;
      pixel *= fontSize;
    }
  }
  return Number.isFinite(pixel) && (allowZero ? pixel >= 0 : pixel > 0) ? pixel : undefined;
};

const symbolItemHeight = computed(() => toPixel(props.symbolHeight) ?? DEFAULT_SYMBOL_ITEM_HEIGHT);
const symbolItemGap = computed(() => toPixel(props.symbolGap, true) ?? DEFAULT_SYMBOL_GAP);
const symbolItemWidth = computed(() => toPixel(props.symbolWidth));

// 指定宽度时，按容器可用宽度换算列数，保证按钮宽度固定且不会被拉伸
const symbolGridOptions = () => {
  const gap = symbolItemGap.value;
  const width = symbolItemWidth.value;
  const availableWidth = symbolsContainerWidth.value;
  const columnCount = width
    ? Math.max(1, Math.floor((availableWidth + gap) / (width + gap)) || 1)
    : DEFAULT_SYMBOL_COLUMN_COUNT;

  return {
    itemHeight: symbolItemHeight.value,
    columnCount,
    gap,
    itemWidth: width,
    overscan: 2,
    containerHeight: SYMBOL_PANEL_HEIGHT,
  };
};

const {
  containerRef: symbolsContainerRef,
  containerWidth: symbolsContainerWidth,
  scrollTop: symbolsScrollTop,
  visibleItems: visibleSymbols,
  visibleRange: symbolsRange,
  getItemStyle: getSymbolItemStyle,
  handleScroll: handleSymbolsScroll,
  updateContainerWidth: updateSymbolsContainerWidth,
} = useVirtualGrid(symbolsList, symbolGridOptions);

// 符号渲染尺寸随按钮高度变化，避免按钮变小时图标溢出
const symbolIconSize = computed(() =>
  Math.max(14, Math.min(32, Math.round(symbolItemHeight.value * (2 / 3))))
);
const symbolIconFontSize = computed(() =>
  Math.max(10, Math.round(symbolItemHeight.value * 0.375))
);

const applySymbolSvgSize = (svg: SVGElement) => {
  svg.style.fontSize = `${symbolIconFontSize.value}px`;
  svg.style.maxWidth = `${symbolIconSize.value}px`;
  svg.style.maxHeight = `${symbolIconSize.value}px`;
};

// 更新缓存中的 SVG 即可改变图标尺寸，无需重新执行 MathJax 排版。
const resizeCachedSymbol = (symbol: Symbol) => {
  if (!symbol.display) return;
  const container = document.createElement('div');
  container.innerHTML = sanitizeHtml(symbol.display);
  const svg = container.querySelector('svg');
  if (!svg) return;
  applySymbolSvgSize(svg);
  symbol.display = sanitizeHtml(container.innerHTML);
};

watch([symbolIconSize, symbolIconFontSize], () => {
  [
    ...reactiveBasicSymbols.value,
    ...reactiveGreekSymbols.value,
    ...reactiveAdvancedSymbols.value,
  ].forEach(resizeCachedSymbol);
});

// 批量渲染控制
const renderSymbolItem = async (symbol: Symbol) => {
  if (symbol.display) {
    resizeCachedSymbol(symbol);
    return;
  }
  if (!window.MathJax?.tex2svgPromise) return;
  
  try {
    const result = await window.MathJax.tex2svgPromise(symbol.latex, {
      display: false,
      scale: 1.3,
      em: 16,
      ex: 8,
      containerWidth: 1280,
    });
    
    const svg = result.getElementsByTagName('svg')[0];
    if (svg) {
      applySymbolSvgSize(svg);
      svg.style.verticalAlign = 'middle';
      svg.style.width = 'auto';
      svg.style.height = 'auto';
      svg.setAttribute('shape-rendering', 'geometricPrecision');
      svg.setAttribute('text-rendering', 'optimizeLegibility');
      symbol.display = sanitizeHtml(svg.outerHTML);
    }
  } catch (error) {
    logger.warn(`符号 ${symbol.latex} 渲染失败`, error);
    symbol.display = '';
  }
};

const { renderQueue: renderSymbolsQueue } = useBatchRender(
  symbolsList,
  renderSymbolItem,
  { batchSize: 8, delay: 0, priority: 'visible-first' }
);

// 计算属性
const filteredCategories = computed(() => {
  return categories.filter(category => props.enabledCategories.includes(category.key));
});

const currentSymbols = computed(() => {
  switch (activeCategory.value) {
    case 'greek':
      return reactiveGreekSymbols.value;
    case 'advanced':
      return reactiveAdvancedSymbols.value;
    default: {
      // 基础分类时，始终显示所有符号，大小写切换只影响字母
      const allBasicSymbols = reactiveBasicSymbols.value;
      return allBasicSymbols.filter(symbol => {
        if (symbol.latex.length === 1) {
          // 单字符：根据大小写状态显示字母，或显示所有非字母字符
          if (symbol.latex.match(/[a-zA-Z]/)) {
            // 字母：根据大小写状态显示
            return isUppercase.value ? symbol.latex.match(/[A-Z]/) : symbol.latex.match(/[a-z]/);
          } else {
            // 非字母字符（包括数字和其他符号）：始终显示
            return true;
          }
        } else {
          // 多字符：始终显示所有符号
          return true;
        }
      });
    }
  }
});

// 弹窗样式计算属性
const dialogStyle = computed(() => {
  const style: Record<string, string> = {};
  if (props.width !== 'auto') {
    style.width = props.width;
  }
  if (props.height !== 'auto') {
    style.height = props.height;
  }
  return style;
});

// 主题相关计算属性
const themeIcon = computed(() => {
  return internalTheme.value === 'dark' ? '☀️' : '🌙';
});

// 计算化的placeholder
const computedPlaceholder = computed(() => {
  return props.placeholder || t.value.beautiful.inputPlaceholder;
});

// 自定义主题色CSS变量
const customThemeVars = computed(() => {
  const currentTheme = internalTheme.value;
  const themeSettings = props.themeConfig?.[currentTheme as keyof typeof props.themeConfig] || {};
  
  return {
    '--math-editor-primary': themeSettings.primary,
    '--math-editor-primary-hover': themeSettings.buttonHover,
    '--math-editor-secondary': themeSettings.secondary,
    '--math-editor-accent': themeSettings.accent,
    '--math-editor-button-bg': themeSettings.button,
    '--math-editor-button-hover-bg': themeSettings.buttonHover,
    '--math-editor-button-text': themeSettings.buttonText,
    '--math-editor-dialog-bg': themeSettings.dialogBackground,
    '--math-editor-input-bg': themeSettings.inputBackground,
    '--math-editor-input-border': themeSettings.inputBorder,
  };
});

// 监听器
watch(
  () => props.modelValue,
  (newVal) => {
    visible.value = newVal;
    if (newVal) {
      // 保存当前滚动位置
      const scrollY = window.scrollY;
      
      // 阻止页面滚动
      document.body.style.overflow = 'hidden';
      
      latexInput.value = props.existingLatex || '';
      updatePreview();
      focusInput();
      
      // 防止页面滚动到弹窗位置
      nextTick(() => {
        window.scrollTo(0, scrollY);
      });
    } else {
      // 弹窗关闭时恢复页面滚动
      document.body.style.overflow = '';
    }
  }
);

watch(
  () => props.existingLatex,
  (newVal) => {
    if ((visible.value || props.inlineMode) && newVal) {
      latexInput.value = newVal;
      updatePreview();
    }
  }
);

// 监听内联模式变化
watch(
  () => props.inlineMode,
  (newVal) => {
    if (newVal) {
      // 内联模式激活时，使用批量渲染
      nextTick(async () => {
        try {
          // 优先渲染可见区域的符号
          const visibleIndices = new Set<number>(visibleSymbols.value.map((item: { index: number }) => item.index));
          await renderSymbolsQueue(visibleIndices);
        } catch (error) {
          logger.error('内联模式符号渲染失败', error);
        }
      });
    }
  },
  { immediate: true }
);

// 符号按钮尺寸变化时重新测量容器并回到顶部，避免沿用旧的滚动位置
watch([symbolItemWidth, symbolItemHeight, symbolItemGap], () => {
  nextTick(() => {
    symbolsScrollTop.value = 0;
    if (symbolsContainerRef.value) {
      symbolsContainerRef.value.scrollTop = 0;
    }
    updateSymbolsContainerWidth();
    const visibleIndices = new Set<number>(visibleSymbols.value.map((item: { index: number }) => item.index));
    renderSymbolsQueue(visibleIndices);
  });
});

// 符号面板宽度变化时重新换算列数（固定宽度模式下需要）
let symbolsResizeObserver: ResizeObserver | null = null;
const observeSymbolsContainer = () => {
  if (typeof ResizeObserver === 'undefined') return;
  const el = symbolsContainerRef.value;
  if (!el) return;
  if (!symbolsResizeObserver) {
    symbolsResizeObserver = new ResizeObserver(() => updateSymbolsContainerWidth());
  }
  symbolsResizeObserver.disconnect();
  symbolsResizeObserver.observe(el);
  updateSymbolsContainerWidth();
};
watch(symbolsContainerRef, () => nextTick(observeSymbolsContainer));

// 标记用户是否手动修改过主题
const hasUserChangedTheme = ref(false);

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

// 监听启用的分类变化，确保当前分类有效
watch(
  () => props.enabledCategories,
  (newCategories) => {
    if (!newCategories.includes(activeCategory.value)) {
      activeCategory.value = newCategories[0] || 'basic';
    }
  },
  { immediate: true }
);

// 监听分类变化，触发批量渲染
watch(
  () => activeCategory.value,
  () => {
    nextTick(() => {
      const visibleIndices = new Set<number>(visibleSymbols.value.map((item: { index: number }) => item.index));
      renderSymbolsQueue(visibleIndices);
    });
  }
);

// 方法
const handleOverlayClick = () => {
  handleClose();
};

const handleClose = () => {
  visible.value = false;
  emit('update:modelValue', false);
  emit('close');
  if (!props.readonly) {
    latexInput.value = '';
    renderedFormula.value = '';
  }
};

const clearInput = () => {
  if (props.readonly) return;
  latexInput.value = '';
  renderedFormula.value = '';
  emit('clear');
  emit('change', '');
};

const insertSymbol = (symbol: string) => {
  if (props.readonly) return;
  
  // 检查最大长度限制
  if (props.maxLength && (latexInput.value + symbol).length > props.maxLength) {
    return;
  }
  
  const textarea = document.querySelector('.latex-input') as HTMLTextAreaElement;
  if (textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = latexInput.value;

    latexInput.value = currentValue.substring(0, start) + symbol + currentValue.substring(end);

    nextTick(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + symbol.length;
      updatePreview();
    });
  } else {
    latexInput.value += symbol;
    updatePreview();
  }
};

const updatePreview = async () => {
  
  // 发出change事件
  emit('change', latexInput.value);

  if (!latexInput.value.trim()) {
    renderedFormula.value = '';
    return;
  }

  try {
    // 确保MathJax已经初始化
    if (!window.MathJax?.tex2svgPromise) {
      await initMathJax();
    }

    // 再次检查MathJax是否可用
    if (!window.MathJax?.tex2svgPromise) {
      logger.error('MathJax初始化失败，无法预览公式');
      renderedFormula.value = sanitizeHtml('<span style="color: red;">MathJax未加载</span>');
      return;
    }

    const result = await window.MathJax.tex2svgPromise(latexInput.value, {
      display: false,
      scale: props.scale * 1.5, // 增加缩放比例让公式更大
    });


    const svg = result.getElementsByTagName('svg')[0];
    if (svg) {
      svg.style.fontSize = props.fontSize;
      svg.style.verticalAlign = 'middle';
      svg.style.maxWidth = '100%';
      svg.style.height = 'auto';
      svg.style.display = 'block';
      svg.style.margin = '0 auto';
      renderedFormula.value = sanitizeHtml(svg.outerHTML);
    } else {
      logger.warn('未获取到SVG元素');
      renderedFormula.value = sanitizeHtml('<span style="color: red;">渲染失败</span>');
    }
  } catch (error) {
    logger.error('LaTeX预览失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    renderedFormula.value = sanitizeHtml(
      `<span style="color: red;">预览失败: ${escapeHtml(errorMessage)}</span>`
    );
  }
};

const handleInsert = () => {
  if (latexInput.value.trim()) {
    let latex = latexInput.value.trim();
    
    // 如果启用了公式包裹，添加相应的包裹符
    if (props.wrapFormula) {
      // 检查是否已经有包裹符
      const hasInlineWrapper = latex.startsWith('$') && latex.endsWith('$') && !latex.startsWith('$$');
      const hasDisplayWrapper = latex.startsWith('$$') && latex.endsWith('$$');
      
      // 如果没有包裹符，根据 inlineMode 添加
      if (!hasInlineWrapper && !hasDisplayWrapper) {
        latex = props.inlineMode ? `$${latex}$` : `$$${latex}$$`;
      }
    }
    
    emit('insert', latex);
    if (!props.inlineMode) {
      handleClose();
    }
  }
};

// 主题切换方法（仅影响当前组件）
const toggleTheme = () => {
  if (!props.showThemeToggle) return;
  const newTheme = internalTheme.value === 'dark' ? 'light' : 'dark';
  internalTheme.value = newTheme;
  emit('themeChange', newTheme);
};

// 语言切换方法
const toggleLanguage = () => {
  const newLocale = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN';
  setLocale(newLocale);
};

// 大小写切换方法（已禁用）
// const toggleCase = () => {
//   isUppercase.value = !isUppercase.value;
//   // 重新渲染基础符号以应用大小写变化
//   nextTick(async () => {
//     await renderSymbols(reactiveBasicSymbols.value);
//   });
// };

// 处理输入变化
const handleInput = (event: Event) => {
  if (props.readonly) {
    event.preventDefault();
    return;
  }
  
  const target = event.target as HTMLTextAreaElement;
  let value = target.value;
  
  // 应用最大长度限制
  if (props.maxLength && value.length > props.maxLength) {
    value = value.substring(0, props.maxLength);
    target.value = value;
    latexInput.value = value;
  }
  
  updatePreview();
};

// 自动聚焦功能
const focusInput = () => {
  if (props.autoFocus) {
    nextTick(() => {
      const textarea = document.querySelector('.latex-input') as HTMLTextAreaElement;
      if (textarea) {
        // 保存当前滚动位置
        const scrollY = window.scrollY;
        
        textarea.focus();
        
        // 防止聚焦时页面滚动
        setTimeout(() => {
          window.scrollTo(0, scrollY);
        }, 0);
      }
    });
  }
};

// 渲染公式示例（使用批量渲染）
const renderFormulaExamples = async () => {
  if (!window.MathJax?.tex2svgPromise) {
    logger.warn('MathJax不可用，跳过公式示例渲染');
    return;
  }

  const renderExample = async (example: Symbol) => {
    if (example.display || !window.MathJax?.tex2svgPromise) return;
    
    try {
      const result = await window.MathJax.tex2svgPromise(example.latex, {
        display: false,
        scale: 1.0,
        em: 16,
        ex: 8,
        containerWidth: 1280,
      });

      const svg = result.getElementsByTagName('svg')[0];
      if (svg) {
        svg.style.fontSize = '16px';
        svg.style.maxWidth = '100%';
        svg.style.verticalAlign = 'middle';
        svg.setAttribute('shape-rendering', 'geometricPrecision');
        svg.setAttribute('text-rendering', 'optimizeLegibility');
        example.display = sanitizeHtml(svg.outerHTML);
      }
    } catch (error) {
      logger.warn(`公式示例 ${example.latex} 渲染失败`, error);
      example.display = '';
    }
  };

  // 批量渲染公式示例
  const batchSize = 5;
  for (let i = 0; i < reactiveFormulaExamples.value.length; i += batchSize) {
    const batch = reactiveFormulaExamples.value.slice(i, i + batchSize);
    await Promise.all(batch.map(renderExample));
    // 使用 requestAnimationFrame 让出主线程
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
};

// 清理函数
let isUnmounted = false;

// 生命周期
onMounted(async () => {
  // 如果是内联模式或者弹窗已显示，则执行自动聚焦
  if (props.inlineMode || visible.value) {
    focusInput();
  }
  
  // 更新虚拟网格容器宽度
  updateSymbolsContainerWidth();
  
  try {
    await initMathJax();

    // 等待 MathJax 就绪
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (window.MathJax?.tex2svgPromise) {
          clearInterval(checkInterval);
          resolve(undefined);
        }
      }, 100);
      // 5秒超时
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(undefined);
      }, 5000);
    });

    if (isUnmounted) return;

    // 优先渲染可见区域的符号
    const visibleIndices = new Set<number>(visibleSymbols.value.map((item: { index: number }) => item.index));
    await renderSymbolsQueue(visibleIndices);
    
    // 渲染公式示例
    await renderFormulaExamples();

  } catch (error) {
    logger.error('VueMathjaxBeautiful初始化失败', error);
  }
});

onUnmounted(() => {
  isUnmounted = true;
  symbolsResizeObserver?.disconnect();
  symbolsResizeObserver = null;
  // 清理工作由 useBatchRender 和 useVirtualList 自动处理
});
</script>

<style lang="scss">
/* 所有样式已移至 packages/core/src/styles/index.scss 中统一管理 */
</style>
