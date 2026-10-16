# Vue MathJax Beautiful

🚀 精简、高效的 Vue 3 数学公式编辑器组件库

## 特性

- 🧮 **专业公式编辑** - 基于 MathJax 引擎，支持完整的 LaTeX 语法
- 🎨 **丰富符号面板** - 240+ 数学符号和 38 个常用公式模板
- 👀 **实时预览** - 所见即所得的公式编辑体验
- 🌍 **国际化支持** - 内置中文和英文界面
- 🚀 **Vue 3 + TypeScript** - 现代化的技术栈
- 📱 **响应式设计** - 完美适配桌面端和移动端
- 🔧 **易于集成** - 简单的 API 设计，轻松集成到现有项目
- ⚡ **工具函数** - 丰富的 LaTeX 处理工具函数
- 🎨 **主题系统** - 支持亮色/暗色/自动主题，可自定义主题
- 📱 **移动端优化** - 虚拟键盘适配、触摸优化、安全区域支持
- ⚡ **性能优化** - 虚拟列表、LRU 缓存、懒加载、内存泄漏防护

## 安装

```bash
npm install vue-mathjax-beautiful
```

或使用 yarn：

```bash
yarn add vue-mathjax-beautiful
```

或使用 pnpm：

```bash
pnpm add vue-mathjax-beautiful
```

## 快速开始

### 基本使用

```vue
<template>
  <div>
    <!-- 公式编辑器弹窗 -->
    <VueMathjaxBeautiful
      v-model="showDialog"
      :existing-latex="formula"
      title="数学公式编辑器"
      @insert="handleInsert"
      @close="handleClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { 
  VueMathjaxBeautiful,
  initMathJax 
} from 'vue-mathjax-beautiful'

const showDialog = ref(false)
const formula = ref('E = mc^2')

// 初始化 MathJax
onMounted(async () => {
  await initMathJax()
})

const handleInsert = (latex: string) => {
  formula.value = latex
  showDialog.value = false
}

const handleClose = () => {
  showDialog.value = false
}
</script>
```

### 全局注册

```typescript
import { createApp } from 'vue'
import VueMathjaxBeautiful from 'vue-mathjax-beautiful'
import App from './App.vue'

const app = createApp(App)
app.use(VueMathjaxBeautiful)
app.mount('#app')
```

## API 文档

### 样式入口

```typescript
import 'vue-mathjax-beautiful/style.css'
// 兼容旧写法：import 'vue-mathjax-beautiful/dist/style.css'
```

### VueMathjaxBeautiful

公式编辑器组件，支持弹窗模式和内联模式。

#### Props

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `v-model` | `boolean` | `false` | 控制弹窗显示状态 |
| `existing-latex` | `string` | `""` | 预设 LaTeX 代码 |
| `inline-mode` | `boolean` | `false` | 是否启用内联模式 |
| `theme` | `'light' \| 'dark'` | `'light'` | 初始主题 |
| `theme-config` | `VueMathjaxBeautifulThemeConfig` | 内置主题 | 自定义亮色/暗色主题色 |
| `width` / `height` | `string` | `'auto'` | 编辑器尺寸 |
| `scale` | `number` | `1.2` | 预览公式缩放 |
| `font-size` | `string` | `'16px'` | 输入区字号 |
| `readonly` | `boolean` | `false` | 是否只读 |
| `show-symbols` | `boolean` | `true` | 是否显示符号面板 |
| `show-preview` | `boolean` | `true` | 是否显示实时预览 |
| `show-theme-toggle` | `boolean` | `true` | 是否显示主题切换 |
| `show-clear-button` | `boolean` | `true` | 是否显示清空按钮 |
| `show-language-toggle` | `boolean` | `true` | 是否显示语言切换 |
| `show-formula-examples` | `boolean` | `true` | 是否显示公式模板 |
| `auto-focus` | `boolean` | `true` | 打开后自动聚焦 |
| `placeholder` | `string` | `""` | 输入框占位文案 |
| `max-length` | `number` | `1000` | 最大输入长度 |
| `rows` | `number` | `2` | 输入框行数 |
| `symbol-width` | `number \| string` | 自适应均分 | 符号按钮固定宽度，数字按 px 处理，字符串支持 px/rem/em，如 `:symbol-width="40"` 或 `symbol-width="2.5rem"` |
| `symbol-height` | `number \| string` | `48` | 符号按钮固定高度，数字按 px 处理，字符串支持 px/rem/em |
| `symbol-gap` | `number \| string` | `8` | 符号按钮之间的间距，数字按 px 处理，字符串支持 px/rem/em，允许为 0 |
| `enabled-categories` | `string[]` | `['basic', 'greek', 'advanced']` | 启用的符号分类 |
| `default-category` | `string` | `'basic'` | 默认符号分类 |
| `insert-button-text` | `string` | `'插入公式'` | 插入按钮文案 |
| `cancel-button-text` | `string` | `'取消'` | 关闭按钮文案 |
| `clear-button-text` | `string` | `'清空'` | 清空按钮文案 |
| `title` / `subtitle` | `string` | 内置文案 | 标题和副标题 |
| `wrap-formula` | `boolean` | `true` | 插入时是否自动包裹公式分隔符 |

#### Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `@update:modelValue` | `(value: boolean)` | 弹窗显示状态变化 |
| `@insert` | `(latex: string)` | 点击插入时触发 |
| `@change` | `(latex: string)` | 输入内容变化时触发 |
| `@clear` | `()` | 清空内容时触发 |
| `@close` | `()` | 关闭或取消时触发 |
| `@theme-change` | `(theme: string)` | 主题切换时触发 |

> `@cancel` 不是当前组件事件；关闭动作请监听 `@close`。

### VueMathjaxEditor

富文本编辑器组件，内置 `VueMathjaxBeautiful` 作为公式插入器。

| Props 分组 | 字段 |
|-----------|------|
| 内容 | `v-model`, `placeholder`, `readonly`, `auto-focus`, `spellcheck`, `max-length` |
| 尺寸 | `min-height`, `max-height`, `width`, `border-radius` |
| 工具栏 | `show-toolbar`, `toolbar-position`, `enabled-tools` |
| 格式 | `enable-bold`, `enable-italic`, `enable-underline`, `enable-strikethrough`, `enable-clear-format` |
| 插入 | `enable-formula`, `enable-image`, `formula-editor-props`, `max-image-size`, `allowed-image-types` |
| 体验 | `theme`, `enable-theme-toggle`, `show-char-count`, `show-word-count`, `enable-shortcuts`, `enable-auto-save`, `auto-save-interval` |
| 样式类 | `custom-class`, `toolbar-class`, `editor-class` |

主要事件：`update:modelValue`、`change`、`focus`、`blur`、`ready`、`error`、`themeChange`、`formatToggle`、`formulaInsert`、`imageUpload`、`imageUploaded`、`imageError`、`save`、`charLimitReached`、`wordCountChange`、`charCountChange`。

## 工具函数 API

所有下面的函数都可以从包根路径导入：

```typescript
import {
  initMathJax,
  loadMathJax,
  lazyLoadMathJax,
  isMathJaxReady,
  preloadMathJax,
  resetMathJaxLoadState,
  convertLatexToSvg,
  batchConvertLatex,
  matchLatex,
  hasLatexFormula,
  sanitizeHtml
} from 'vue-mathjax-beautiful'
```

### MathJax 加载

| API | 说明 |
|-----|------|
| `initMathJax(config?)` | 初始化 MathJax，可传入 `MathJaxConfig` |
| `loadMathJax(urls?)` | 加载并等待 MathJax 脚本就绪，可传入单个 URL 或 URL 数组 |
| `lazyLoadMathJax()` | 按需加载 MathJax |
| `isMathJaxReady()` | 判断 MathJax 是否已就绪 |
| `preloadMathJax()` | 提前触发加载，不阻塞当前流程 |
| `resetMathJaxLoadState()` | 重置内部加载状态，主要用于测试或异常恢复 |

### LaTeX 处理

| API | 说明 |
|-----|------|
| `convertLatexToSvg(content)` | 将 LaTeX 内容转换为 SVG 字符串 |
| `batchConvertLatex(items)` | 批量转换带公式的内容 |
| `extractLatexFromSvg(svg)` | 从 SVG 中提取 `data-latex` |
| `matchLatex(content)` | 返回所有公式匹配结果 |
| `hasLatexFormula(content)` | 判断内容是否包含公式 |
| `clearMathTags(element, tagName)` | 清理 DOM 中的指定 MathJax 标签 |
| `preprocessLatexDocument(content)` | 预处理包含公式的文档内容 |
| `protectMathBlocks(content)` / `restoreMathBlocks(content)` | 保护并恢复数学块 |
| `cleanupMathBlockPlaceholders(content)` | 清理数学块占位符 |
| `isMathContent(content)` | 判断内容是否主要为数学内容 |
| `smartProcessContent(content)` | 智能处理混合文本/公式内容 |
| `processMarkdownTable(content)` | 处理 Markdown 表格中的公式 |
| `sanitizeLatexFormula(formula)` | 清理 LaTeX 公式字符串 |
| `latexToReadable(content)` | 将 LaTeX 转为更易读的文本 |
| `processMarkdownInCode(html)` | 处理代码块中的 Markdown 内容 |
| `preprocessFakeCodeBlocks(content)` / `preprocessCodeBlocks(content)` | 预处理代码块 |

### 安全清洗

组件内部会在写入 `v-html` 前调用 DOMPurify 清洗 MathJax SVG/HTML。你在业务代码里手动渲染 HTML 时，也可以复用同一套 API：

```typescript
import { sanitizeHtml, escapeHtml } from 'vue-mathjax-beautiful'

const safeHtml = sanitizeHtml(untrustedHtml)
const escapedText = escapeHtml(userInput)
```

### 其他导出

| 类型 | 导出 |
|------|------|
| 缓存 | `LRUCache`, `FormulaCache`, `MemoryCache`, `globalFormulaCache` |
| 日志 | `logger`, `Logger`, `LogLevel` |
| 主题 | `useTheme`, `useGlobalTheme`, `createTheme`, `presetThemes` |
| 移动端 | `useMobile`, `useMobileOptimization`, `useSafeArea`, `defaultMobileConfig` |
| 虚拟列表 | `useVirtualList`, `useVirtualGrid`, `useBatchRender` |
| 国际化 | `useI18n`, `Locale`, `Messages` |
| 数据 | `basicSymbols`, `greekSymbols`, `advancedSymbols`, `formulaExamples`, `categories` |

## 类型定义

```typescript
import type {
  VueMathjaxBeautifulProps,
  VueMathjaxBeautifulEvents,
  VueMathjaxBeautifulThemeConfig,
  VueMathjaxEditorProps,
  VueMathjaxEditorEvents,
  MathJaxConfig,
  MathJaxInstance,
  MathJaxRenderOptions,
  MatchLatexResult,
  Symbol,
  Category,
  Locale,
  DataLocale,
  Messages,
  Theme,
  ThemeColors,
  ThemeConfig,
  Breakpoint,
  MobileOptimizationConfig,
  VirtualListOptions,
  VirtualListItem
} from 'vue-mathjax-beautiful'
```

## 主题系统

### 使用主题

```typescript
import { useTheme, presetThemes } from 'vue-mathjax-beautiful'

// 使用自动主题（跟随系统）
const { theme, actualTheme, cssVariables, toggleTheme } = useTheme('auto')

// 使用预设主题
const { themeConfig } = useTheme('light', presetThemes.purple)

// 创建自定义主题
import { createTheme } from 'vue-mathjax-beautiful'
const myTheme = createTheme('myTheme',
  { primary: '#ff0000', accent: '#00ff00' },  // light
  { primary: '#ff4444', accent: '#44ff44' }   // dark
)
```

### 主题类型

- `light` - 亮色主题
- `dark` - 暗色主题
- `auto` - 自动（跟随系统偏好）

## 移动端优化

### 移动端检测

```typescript
import { useMobile, useMobileOptimization, useSafeArea } from 'vue-mathjax-beautiful'

// 基础检测
const { isMobile, isTablet, isTouch, screenSize } = useMobile()

// 完整移动端优化
const { 
  isOptimizationEnabled,
  virtualKeyboardHeight,
  responsiveStyles,
  touchHandlers 
} = useMobileOptimization({
  virtualKeyboard: { adjustHeight: true },
  touch: { swipeEnabled: true },
  performance: { reduceAnimations: true },
  ui: { compactMode: true, bottomSheet: true }
})

// 安全区域适配（刘海屏）
const { safeAreaInsets, cssSafeArea } = useSafeArea()
```

## 国际化

组件内置中英文支持，您也可以自定义语言：

```typescript
import { useI18n } from 'vue-mathjax-beautiful'

const { t, setLocale } = useI18n()

// 切换语言
setLocale('en-US') // 或 'zh-CN'

// 使用翻译
console.log(t('common.save'))
```

## 浏览器兼容性

- Chrome >= 88
- Firefox >= 85
- Safari >= 14
- Edge >= 88

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解版本更新详情。 
