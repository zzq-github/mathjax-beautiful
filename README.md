<div align="center">
  <img src="./title.svg" alt="MathJax Beautiful" />
</div>

<div align="center">

# MathJax Beautiful

面向 Vue 3 与 React 的数学公式编辑器组件库，基于 MathJax 提供专业公式编辑、符号面板、实时预览和 LaTeX 工具能力。

</div>

- 📖 演示地址: [在线地址](https://zzq-github.github.io/mathjax-beautiful)

## 🧾 更新说明

### v1.4.0 (2026-06-10)

**公共 API 对齐与安全加固**

- 对齐包根导出：统一导出组件、工具函数、组合式函数、数据助手和公共类型
- 新增样式子路径：支持 `vue-mathjax-beautiful/style.css`，并兼容旧的 `dist/style.css`
- 增强安全清洗：暴露 `sanitizeHtml` / `escapeHtml`，并在组件内部清洗 MathJax SVG/HTML
- 稳定 MathJax 加载：明确 `loadMathJax(urls?: string | string[])` 等加载 API
- 补充回归测试：覆盖运行时导出、类型导出、样式子路径和安全清洗工具
- 更新文档：README API 文档与实际 props、events 和工具函数保持一致

### v1.3.4 (2026-03-26)

**代码质量与 ESLint 规范修复**

- 修复正则表达式问题：移除不必要的转义字符，优化控制字符处理
- 清理未使用变量：移除 `symbolDisplayCache`、`themeButtonTitle` 等冗余代码
- 统一错误处理：将 `console` 语句替换为 `logger` 工具，规范错误日志
- 修复类型定义：添加 `eslint-disable` 注释处理必要的 `any` 类型
- 优化导入语句：移除未使用的 `Ref`、`vi`、`beforeEach` 等导入
- 构建验证通过：TypeScript 编译无错误，核心包质量提升

### v1.3.0 (2026-03-20)

**LaTeX 工具函数全面升级**

- 扩展公式匹配：支持 `equation*`、`align*`、`gather`、`displaymath` 等 10 种 LaTeX 格式
- 智能货币识别：自动区分 `$100`（货币）与 `$x^2$`（公式），避免误解析
- Unicode 符号预处理：`√(x)` 自动转为 `$\sqrt{x}$`，支持 `∞`、`≤`、`≥` 等符号
- 转义字符修复：解决 `\times`、`\frac` 等被 JavaScript 错误解析的问题
- 公式保护系统：防止 Markdown 解析器破坏矩阵等包含 `\\` 的公式
- LaTeX 文档转换：支持 AI 生成的完整 LaTeX 文档转换为 Markdown
- 纯 LaTeX 自动包裹：检测无分隔符的 LaTeX 代码并自动添加 `$...$`
- 填空题下划线：连续 3+ 下划线自动转为实线下划线样式
- 代码块智能处理：识别并正确处理包含 LaTeX 的假代码块

### v1.2.3 (2026-02-27)

- 本地 MathJax 加载稳定性优化，优先使用本地静态资源
- 演示与文档结构优化
- 更新说明页面改为时间轴展示

## ✨ 特性

- 🧮 **专业公式编辑** - 基于 MathJax 引擎，支持完整的 LaTeX 语法
- 🎨 **丰富符号面板** - 240+ 数学符号和 38 个常用公式模板
- 👀 **实时预览** - 所见即所得的公式编辑体验
- 🚀 **Vue 3 / React + TypeScript** - 双框架组件包与共享工具能力
- 📱 **响应式设计** - 完美适配桌面端和移动端
- 🔧 **易于集成** - 简单的 API 设计，轻松集成到现有项目
- 🎨 **主题系统** - 支持亮色/暗色/自动主题，可自定义主题
- 📱 **移动端优化** - 虚拟键盘适配、触摸优化、安全区域支持
- ⚡ **性能优化** - 虚拟列表、LRU 缓存、懒加载、内存泄漏防护

## 📦 安装

### Vue 包

使用 npm：

```bash
npm install vue-mathjax-beautiful
```

使用 yarn：

```bash
yarn add vue-mathjax-beautiful
```

使用 pnpm：

```bash
pnpm add vue-mathjax-beautiful
```

### React 包（公式组件）

React 包是独立包，提供公式编辑组件；富文本编辑器能力目前由 Vue 包提供：

```bash
npm install react-mathjax-beautiful
```

```bash
pnpm add react-mathjax-beautiful
```

## 🚀 快速开始

### React 公式编辑器 (MathjaxBeautiful)

```tsx
import { useState } from 'react';
import { MathjaxBeautiful } from 'react-mathjax-beautiful';
import 'react-mathjax-beautiful/style.css';

export function FormulaDemo() {
  const [open, setOpen] = useState(false);
  const [latex, setLatex] = useState('E = mc^2');

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        打开公式编辑器
      </button>
      <MathjaxBeautiful
        open={open}
        onOpenChange={setOpen}
        existingLatex={latex}
        onChange={setLatex}
        onInsert={setLatex}
      />
    </>
  );
}
```

### Vue 公式编辑器 (VueMathjaxBeautiful)

专业的数学公式编辑器，提供丰富的符号面板和实时预览功能。

#### 弹窗模式

```vue
<template>
  <div>
    <button @click="showFormulaEditor">打开公式编辑器</button>

    <!-- 公式编辑器弹窗 -->
    <VueMathjaxBeautiful v-model="showDialog" :existing-latex="formula" @insert="handleInsert" />

    <!-- 显示当前公式 -->
    <div v-if="formula" class="formula-display">当前公式：{{ formula }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { VueMathjaxBeautiful } from 'vue-mathjax-beautiful';

const showDialog = ref(false);
const formula = ref('E = mc^2');

const showFormulaEditor = () => {
  showDialog.value = true;
};

const handleInsert = (latex) => {
  formula.value = latex;
  console.log('插入公式:', latex);
};
</script>
```

#### 内联模式

```vue
<template>
  <div>
    <!-- 直接嵌入页面的公式编辑器 -->
    <VueMathjaxBeautiful :inline-mode="true" :existing-latex="formula" @insert="handleInsert" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { VueMathjaxBeautiful } from 'vue-mathjax-beautiful';

const formula = ref('\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}');

const handleInsert = (latex) => {
  formula.value = latex;
  console.log('应用公式:', latex);
};
</script>
```

### Vue 完整集成示例

```vue
<template>
  <div class="editor-container">
    <!-- 公式编辑器 -->
    <VueMathjaxBeautiful
      :inline-mode="true"
      :existing-latex="currentFormula"
      @insert="handleFormulaInsert"
    />

    <!-- 工具栏 -->
    <div class="toolbar">
      <button @click="showFormulaDialog">打开公式编辑器</button>
      <button @click="clearFormula">清空公式</button>
    </div>

    <!-- 公式编辑器弹窗 -->
    <VueMathjaxBeautiful
      v-model="showDialog"
      :existing-latex="currentFormula"
      @insert="insertFormula"
    />

    <!-- 显示当前公式 -->
    <div v-if="currentFormula" class="formula-display">
      <h3>当前公式：</h3>
      <div v-html="renderedFormula"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { VueMathjaxBeautiful, convertLatexToSvg } from 'vue-mathjax-beautiful';

const showDialog = ref(false);
const currentFormula = ref('E = mc^2');

const renderedFormula = computed(() => {
  // 这里可以集成 MathJax 渲染
  return `$${currentFormula.value}$`;
});

const handleFormulaInsert = (latex) => {
  currentFormula.value = latex;
  console.log('应用公式:', latex);
};

const showFormulaDialog = () => {
  showDialog.value = true;
};

const insertFormula = (latex) => {
  currentFormula.value = latex;
  showDialog.value = false;
  console.log('插入公式:', latex);
};

const clearFormula = () => {
  currentFormula.value = '';
};
</script>

<style scoped>
.editor-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.toolbar {
  margin-top: 16px;
  display: flex;
  gap: 12px;
}

.toolbar button {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar button:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.formula-display {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}
</style>
```

## 📚 API 文档

### 样式入口

```typescript
// Vue 包
import 'vue-mathjax-beautiful/style.css';
// 兼容旧写法：import 'vue-mathjax-beautiful/dist/style.css'

// React 包
import 'react-mathjax-beautiful/style.css';
```

### 组件

| 框架  | 组件                  | 说明                                             |
| ----- | --------------------- | ------------------------------------------------ |
| Vue   | `VueMathjaxBeautiful` | 公式编辑器，支持弹窗模式和内联模式               |
| Vue   | `VueMathjaxEditor`    | 富文本编辑器，内置公式插入、图片插入、格式工具栏 |
| React | `MathjaxBeautiful`    | 公式编辑器，支持弹窗模式和内联模式               |

### VueMathjaxBeautiful Props

| 属性                                                            | 类型                             | 默认值                           | 说明                   |
| --------------------------------------------------------------- | -------------------------------- | -------------------------------- | ---------------------- |
| `v-model`                                                       | `boolean`                        | `false`                          | 控制弹窗显示/隐藏      |
| `existing-latex`                                                | `string`                         | `''`                             | 已有的 LaTeX 公式代码  |
| `inline-mode`                                                   | `boolean`                        | `false`                          | 是否启用内联模式       |
| `theme`                                                         | `'light' \| 'dark'`              | `'light'`                        | 初始主题               |
| `theme-config`                                                  | `VueMathjaxBeautifulThemeConfig` | 内置主题                         | 自定义亮色/暗色主题色  |
| `show-symbols` / `show-preview`                                 | `boolean`                        | `true`                           | 控制符号面板和实时预览 |
| `show-theme-toggle` / `show-language-toggle`                    | `boolean`                        | `true`                           | 控制主题和语言切换按钮 |
| `enabled-categories`                                            | `string[]`                       | `['basic', 'greek', 'advanced']` | 启用的符号分类         |
| `default-category`                                              | `string`                         | `'basic'`                        | 默认符号分类           |
| `placeholder`, `max-length`, `rows`                             | `string` / `number`              | 内置默认值                       | 输入区配置             |
| `insert-button-text`, `cancel-button-text`, `clear-button-text` | `string`                         | 内置文案                         | 按钮文案               |
| `title`, `subtitle`, `wrap-formula`                             | `string` / `boolean`             | 内置默认值                       | 标题和公式包裹控制     |

### VueMathjaxBeautiful Events

| 事件名              | 参数               | 说明                |
| ------------------- | ------------------ | ------------------- |
| `update:modelValue` | `(value: boolean)` | 弹窗显示状态变化    |
| `insert`            | `(latex: string)`  | 插入/应用公式时触发 |
| `change`            | `(latex: string)`  | 输入内容变化时触发  |
| `clear`             | `()`               | 清空内容时触发      |
| `close`             | `()`               | 关闭或取消时触发    |
| `theme-change`      | `(theme: string)`  | 主题切换时触发      |

### React MathjaxBeautiful Props

| 属性                                                             | 类型                  | 默认值                           | 说明                       |
| ---------------------------------------------------------------- | --------------------- | -------------------------------- | -------------------------- |
| `open` / `defaultOpen`                                           | `boolean`             | `false`                          | 控制弹窗显示/隐藏          |
| `onOpenChange`                                                   | `(open) => void`      | -                                | 弹窗显示状态变化回调       |
| `value` / `defaultValue` / `existingLatex`                       | `string`              | `''`                             | 受控/非受控 LaTeX 内容     |
| `inline`                                                         | `boolean`             | `false`                          | 是否启用内联模式           |
| `theme`                                                         | `'light' \| 'dark'`   | `'light'`                        | 初始主题                   |
| `locale`                                                         | `'zh-CN' \| 'en-US'`  | `'zh-CN'`                        | 初始语言                   |
| `readonly`                                                       | `boolean`             | `false`                          | 是否只读                   |
| `showSymbols` / `showPreview`                                    | `boolean`             | `true`                           | 控制符号面板和实时预览     |
| `showThemeToggle` / `showLanguageToggle` / `showClearButton`     | `boolean`             | `true`                           | 控制主题、语言和清空按钮   |
| `showFormulaExamples`                                            | `boolean`             | `true`                           | 是否显示公式模板示例       |
| `enabledCategories`                                              | `string[]`            | `['basic', 'greek', 'advanced']` | 启用的符号分类             |
| `defaultCategory`                                                | `string`              | `'basic'`                        | 默认符号分类               |
| `placeholder`, `maxLength`, `rows`                               | `string` / `number`   | 内置默认值                       | 输入区配置                 |
| `title`, `subtitle`, `insertButtonText`, `cancelButtonText`      | `string`              | 内置文案                         | 标题和按钮文案             |
| `clearButtonText`, `wrapFormula`, `className`, `dialogClassName` | 多类型                | 内置默认值                       | 清空文案、公式包裹和样式类 |

### React MathjaxBeautiful Events

| 回调名            | 参数                    | 说明                |
| ----------------- | ----------------------- | ------------------- |
| `onInsert`        | `(latex: string)`       | 插入/应用公式时触发 |
| `onChange`        | `(latex: string)`       | 输入内容变化时触发  |
| `onClear`         | `()`                    | 清空内容时触发      |
| `onClose`         | `()`                    | 关闭或取消时触发    |
| `onThemeChange`   | `(theme: 'light' \| 'dark')` | 主题切换时触发 |
| `onLocaleChange`  | `(locale: 'zh-CN' \| 'en-US')` | 语言切换时触发 |

### 工具函数

Vue 包和 React 包都从根路径导出 MathJax 加载、LaTeX 处理和安全清洗工具。Vue 包额外包含缓存、主题、移动端和虚拟列表等组件内部工具：

```typescript
// Vue 包
import {
  initMathJax,
  loadMathJax,
  lazyLoadMathJax,
  resetMathJaxLoadState,
  convertLatexToSvg,
  batchConvertLatex,
  matchLatex,
  hasLatexFormula,
  sanitizeHtml,
  escapeHtml,
} from 'vue-mathjax-beautiful';

// React 包同样导出核心 MathJax / LaTeX / 安全工具
import {
  convertLatexToSvg as convertReactLatexToSvg,
  sanitizeHtml as sanitizeReactHtml,
} from 'react-mathjax-beautiful';
```

组件内部写入 HTML/SVG 前会使用 DOMPurify 清洗；如果你在业务里手动使用 `v-html`，建议复用 `sanitizeHtml`。

### 类型

```typescript
import type {
  VueMathjaxBeautifulProps,
  VueMathjaxBeautifulEvents,
  VueMathjaxBeautifulThemeConfig,
  VueMathjaxEditorProps,
  VueMathjaxEditorEvents,
  MathJaxConfig,
  MatchLatexResult,
} from 'vue-mathjax-beautiful';

import type {
  MathjaxBeautifulProps,
  MathjaxBeautifulTheme,
  MathjaxBeautifulLocale,
} from 'react-mathjax-beautiful';
```

## ⌨️ 快捷键

### 公式编辑器快捷键

| 快捷键     | 功能               |
| ---------- | ------------------ |
| `点击符号` | 插入符号到光标位置 |
| `点击模板` | 插入公式模板       |
| `Enter`    | 确认插入公式       |
| `Esc`      | 取消编辑           |

### 公式语法快捷方式

| 语法          | 功能                 |
| ------------- | -------------------- |
| `$公式$`      | 行内公式             |
| `$$公式$$`    | 独立公式（居中显示） |
| `\frac{a}{b}` | 分数                 |
| `x^{上标}`    | 上标                 |
| `x_{下标}`    | 下标                 |
| `\sqrt{内容}` | 根号                 |

## 📖 LaTeX 语法参考

### 基础语法

| 语法                  | 效果                 | 说明     |
| --------------------- | -------------------- | -------- |
| `$E = mc^2$`          | $E = mc^2$           | 行内公式 |
| `$$\int_0^1 x^2 dx$$` | $$\int\_0^1 x^2 dx$$ | 独立公式 |
| `\frac{a}{b}`         | $\frac{a}{b}$        | 分数     |
| `\sqrt{x}`            | $\sqrt{x}$           | 根号     |
| `x^2`                 | $x^2$                | 上标     |
| `x_i`                 | $x\_i$               | 下标     |

### 高级语法

| 语法                  | 效果                  | 说明     |
| --------------------- | --------------------- | -------- |
| `\sum_{i=1}^n`        | $\sum\_{i=1}^n$       | 求和     |
| `\int_{a}^{b}`        | $\int\_{a}^{b}$       | 积分     |
| `\lim_{x \to 0}`      | $\lim\_{x \to 0}$     | 极限     |
| `\alpha \beta \gamma` | $\alpha \beta \gamma$ | 希腊字母 |
| `\sin \cos \tan`      | $\sin \cos \tan$      | 三角函数 |
| `\infty \pm \neq`     | $\infty \pm \neq$     | 特殊符号 |

### 矩阵和方程组

```latex
# 矩阵
\begin{matrix}
a & b \\
c & d
\end{matrix}

# 带括号的矩阵
\begin{pmatrix}
1 & 2 \\
3 & 4
\end{pmatrix}

# 方程组
\begin{cases}
x + y = 5 \\
x - y = 1
\end{cases}
```

### 常用公式模板

#### 代数

- 二次方程：`ax^2 + bx + c = 0`
- 求根公式：`x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}`
- 因式分解：`(a+b)^2 = a^2 + 2ab + b^2`

#### 几何

- 圆的面积：`S = \pi r^2`
- 球的体积：`V = \frac{4}{3}\pi r^3`
- 勾股定理：`a^2 + b^2 = c^2`

#### 微积分

- 导数定义：`f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}`
- 积分：`\int_a^b f(x) dx`
- 牛顿-莱布尼茨公式：`\int_a^b f'(x) dx = f(b) - f(a)`

## 🎯 使用场景

- 📚 **教育平台** - 在线数学课程、习题编辑、教学课件
- 📝 **学术写作** - 数学论文、研究报告、学位论文
- 💻 **技术文档** - API 文档、算法说明、技术规范
- 🧮 **科学计算** - 数据分析报告、实验记录、计算说明
- 📖 **知识管理** - 数学笔记、公式收集、学习资料
- 🎓 **在线考试** - 数学试题编辑、答案解析、评分系统
- 🔬 **科研工具** - 数学建模、公式推导、计算验证

## 🔧 高级配置

以下高级配置示例以 Vue 包为主；React 包可通过同名 props、`className`、`dialogClassName` 和 `onXxx` 回调实现对应能力。

### Vue 自定义样式

```vue
<template>
  <VueMathjaxBeautiful v-model="showDialog" class="custom-formula-editor" @insert="handleInsert" />
</template>

<style>
/* 自定义公式编辑器样式 */
.custom-formula-editor .latex-input {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 14px;
}

.custom-formula-editor .symbol-button {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.custom-formula-editor .symbol-button:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.custom-formula-editor .formula-preview {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-top: 12px;
}
</style>
```

### Vue 事件处理和数据持久化

```vue
<script setup>
import { ref, watch, onMounted } from 'vue';

const currentFormula = ref('');
const formulaHistory = ref([]);

// 监听公式变化
watch(currentFormula, (newValue, oldValue) => {
  console.log('公式从', oldValue, '变为', newValue);

  // 自动保存到本地存储
  localStorage.setItem('current-formula', newValue);

  // 保存到历史记录
  if (newValue && newValue.trim().length > 0) {
    formulaHistory.value = [...new Set([...formulaHistory.value, newValue])];
    localStorage.setItem('formula-history', JSON.stringify(formulaHistory.value));
  }
});

// 加载保存的公式
const loadSavedFormula = () => {
  const savedFormula = localStorage.getItem('current-formula');
  const savedHistory = localStorage.getItem('formula-history');

  if (savedFormula) {
    currentFormula.value = savedFormula;
  }

  if (savedHistory) {
    try {
      formulaHistory.value = JSON.parse(savedHistory);
    } catch (error) {
      console.warn('加载公式历史失败:', error);
    }
  }
};

// 导出公式为不同格式
const exportFormula = (format) => {
  switch (format) {
    case 'latex':
      return currentFormula.value;
    case 'svg':
      // 这里可以集成 LaTeX 转 SVG 的功能
      return convertLatexToSvg(currentFormula.value);
    case 'png':
      // 这里可以集成 LaTeX 转 PNG 的功能
      return convertLatexToPng(currentFormula.value);
    default:
      return currentFormula.value;
  }
};

// 清空历史记录
const clearHistory = () => {
  formulaHistory.value = [];
  localStorage.removeItem('formula-history');
};

onMounted(() => {
  loadSavedFormula();
});
</script>
```

### Vue 与其他库集成

```vue
<script setup>
// 与 Element Plus 集成
import { ElMessage, ElMessageBox } from 'element-plus';

const handleInsert = async (latex) => {
  try {
    // 验证 LaTeX 语法
    if (await validateLatex(latex)) {
      currentFormula.value = latex;
      ElMessage.success('公式应用成功');
    } else {
      ElMessage.error('LaTeX 语法错误');
    }
  } catch (error) {
    ElMessage.error('应用失败: ' + error.message);
  }
};

// 与 Ant Design Vue 集成
import { message, Modal } from 'ant-design-vue';

const showFormulaHelp = () => {
  Modal.info({
    title: 'LaTeX 语法帮助',
    width: 600,
    content: `
      <div>
        <h4>常用语法：</h4>
        <ul>
          <li>分数：\\frac{分子}{分母}</li>
          <li>根号：\\sqrt{内容}</li>
          <li>上标：x^{上标}</li>
          <li>下标：x_{下标}</li>
          <li>积分：\\int_{a}^{b}</li>
          <li>求和：\\sum_{i=1}^{n}</li>
        </ul>
      </div>
    `,
  });
};
</script>
```

## ❓ 常见问题

### Q: 如何插入复杂的数学公式？

A: 有多种方式：

1. **使用公式编辑器**：Vue 使用 `VueMathjaxBeautiful`，React 使用 `MathjaxBeautiful`，都支持弹窗和内联模式
2. **直接输入 LaTeX**：在公式编辑器中直接输入 LaTeX 代码
3. **使用符号面板**：公式编辑器提供 240+ 个符号和 38 个公式模板
4. **复制粘贴**：从其他 LaTeX 编辑器复制公式代码
5. **预设模板**：使用内置的常用公式模板快速开始

### Q: 支持哪些 LaTeX 语法？

A: 支持完整的 MathJax LaTeX 语法，包括：

**基础语法**：

- 四则运算：`+`, `-`, `\times`, `\div`
- 分数：`\frac{a}{b}`
- 根号：`\sqrt{x}`, `\sqrt[n]{x}`
- 上下标：`x^2`, `x_i`, `x_i^j`

**高级语法**：

- 积分：`\int`, `\iint`, `\iiint`, `\oint`
- 求和：`\sum`, `\prod`
- 极限：`\lim`, `\limsup`, `\liminf`
- 希腊字母：`\alpha`, `\beta`, `\gamma` 等
- 特殊符号：`\infty`, `\partial`, `\nabla` 等

**结构化内容**：

- 矩阵：`\begin{matrix}...\end{matrix}`
- 方程组：`\begin{cases}...\end{cases}`
- 多行公式：`\begin{align}...\end{align}`

### Q: 如何自定义公式编辑器样式？

A: 可以通过以下方式自定义：

1. **CSS 类名覆盖**：

```css
/* Vue 包 */
.vue-mathjax-beautiful .latex-input {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 14px;
  border: 2px solid #3b82f6;
}

.vue-mathjax-beautiful .symbol-button {
  border-radius: 8px;
  transition: all 0.3s ease;
}

/* React 包 */
.rmb-editor .rmb-input {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 14px;
}

.rmb-editor .rmb-symbol-button {
  border-radius: 8px;
  transition: all 0.3s ease;
}
```

1. **Props 属性 / className**：

```vue
<VueMathjaxBeautiful v-model="showDialog" class="custom-formula-editor" @insert="handleInsert" />
```

```tsx
<MathjaxBeautiful open={open} onOpenChange={setOpen} className="custom-formula-editor" />
```

1. **主题定制**：

```css
:root {
  --formula-border-color: #3b82f6;
  --formula-focus-color: #1d4ed8;
  --symbol-bg-color: #f8fafc;
}
```

### Q: 是否支持移动端？

A: 完全支持！组件特性：

- **响应式设计**：自动适配不同屏幕尺寸
- **触摸优化**：支持触摸操作和手势
- **移动端键盘**：优化移动设备输入体验
- **性能优化**：针对移动设备进行了性能优化
- **符号面板适配**：移动端符号面板布局优化

### Q: 如何处理大量数学公式的性能问题？

A: 组件内部已经做了多项优化：

1. **异步渲染**：公式渲染采用异步处理，不阻塞 UI
2. **渲染缓存**：相同公式会被缓存，避免重复渲染
3. **按需加载**：MathJax 资源按需加载
4. **符号分类**：符号按类别组织，提高查找效率
5. **模板缓存**：常用公式模板预加载

**性能优化建议**：

```javascript
// 批量处理公式时，使用防抖
import { debounce } from 'lodash-es';

const debouncedRender = debounce((formula) => {
  // 渲染公式
}, 300);
```

### Q: 如何导出数学公式？

A: 支持多种导出格式：

1. **LaTeX 格式**：

```javascript
const exportLatex = () => {
  return currentFormula.value; // 直接返回 LaTeX 代码
};
```

1. **SVG 格式**：

```javascript
const exportSVG = async () => {
  // 使用 MathJax 将公式转换为 SVG
  const svg = await convertLatexToSvg(currentFormula.value);
  return svg;
};
```

1. **PNG 格式**：

```javascript
const exportPNG = async () => {
  // 将公式转换为 PNG 图片
  const png = await convertLatexToPng(currentFormula.value);
  return png;
};
```

1. **PDF 格式**：

```javascript
// 结合 jsPDF 或 Puppeteer
const exportPDF = async () => {
  const svg = await exportSVG();
  // 转换为 PDF
};
```

### Q: 如何集成到现有项目中？

A: 根据项目框架安装对应包。

1. **Vue 项目**：

```bash
pnpm add vue-mathjax-beautiful
```

```vue
<script setup>
import { ref } from 'vue';
import { VueMathjaxBeautiful } from 'vue-mathjax-beautiful';
import 'vue-mathjax-beautiful/style.css';

const open = ref(false);
const latex = ref('E = mc^2');
</script>

<template>
  <VueMathjaxBeautiful v-model="open" :existing-latex="latex" @insert="latex = $event" />
</template>
```

也可以全局注册：

```javascript
// main.ts
import { VueMathjaxBeautiful } from 'vue-mathjax-beautiful';

app.component('VueMathjaxBeautiful', VueMathjaxBeautiful);
```

1. **React 项目**：

```bash
pnpm add react-mathjax-beautiful
```

```tsx
import { useState } from 'react';
import { MathjaxBeautiful } from 'react-mathjax-beautiful';
import 'react-mathjax-beautiful/style.css';

export function FormulaEditor() {
  const [open, setOpen] = useState(false);
  const [latex, setLatex] = useState('E = mc^2');

  return (
    <MathjaxBeautiful
      open={open}
      onOpenChange={setOpen}
      existingLatex={latex}
      onInsert={setLatex}
    />
  );
}
```

## 🛠️ 开发

### 本地开发

```bash
# 克隆项目
git clone https://github.com/zzq-github/mathjax-beautiful.git

# 进入项目目录
cd mathjax-beautiful

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 启动示例站，顶部可切换 Vue / React
pnpm dev:vue

# 启动同一个示例站并默认用于 React 演示
pnpm dev:react

# 构建组件库
pnpm build

# 运行测试
pnpm test

# 类型检查
pnpm type-check

# 代码格式化
pnpm format
```

### 项目结构

```
vue-mathjax-beautiful/
├── packages/
│   ├── shared/               # 跨框架共享工具、数据和类型
│   ├── react/                # React 公式组件包
│   └── core/                 # Vue 核心组件包
│       ├── src/
│       │   ├── components/   # Vue 组件
│       │   │   ├── VueMathjaxBeautiful/      # 公式编辑器
│       │   │   └── VueMathjaxEditor/         # 编辑器组件
│       │   ├── composables/  # 组合式函数
│       │   │   ├── useVirtualList.ts   # 虚拟列表
│       │   │   ├── useTheme.ts         # 主题系统
│       │   │   ├── useMobile.ts        # 移动端优化
│       │   │   └── useI18n.ts          # 国际化
│       │   ├── data/         # 数据文件
│       │   │   ├── formulas.ts   # 公式模板
│       │   │   └── symbols.ts    # 符号数据
│       │   ├── utils/        # 工具函数
│       │   │   ├── latex.ts      # LaTeX 处理
│       │   │   ├── lazyLoad.ts   # MathJax 懒加载
│       │   │   ├── cache.ts      # LRU 缓存
│       │   │   └── logger.ts     # 日志工具
│       │   ├── styles/       # 样式文件
│       │   │   ├── index.scss    # 主样式
│       │   │   ├── mobile.scss   # 移动端样式
│       │   │   └── variables.scss # 变量定义
│       │   ├── types/        # TypeScript 类型
│       │   └── index.ts      # 入口文件
│       ├── package.json
│       └── vite.config.ts
├── examples/
│   └── playground/           # Vue 驱动的示例站，内置 Vue / React 切换演示
│   │   ├── src/
│   │   │   ├── components/   # 演示组件
│   │   │   ├── react/        # React 公式组件 island
│   │   │   ├── views/        # 页面视图
│   │   │   ├── App.vue       # 主应用
│   │   │   └── main.ts       # 入口文件
│   │   └── package.json
├── tests/                    # 测试文件
├── README.md                 # 项目文档
├── LICENSE                   # 许可证
└── package.json             # 根配置文件
```

### 贡献指南

我们欢迎所有形式的贡献！

#### 报告问题

- 使用 [GitHub Issues](https://github.com/zzq-github/mathjax-beautiful/issues) 报告 bug
- 提供详细的复现步骤和环境信息
- 如果可能，请提供最小复现示例

#### 提交代码

1. Fork 本项目
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add some amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 打开 Pull Request

#### 开发规范

- 使用 TypeScript 编写代码
- 遵循 ESLint 规则
- 编写单元测试
- 更新相关文档

## 📄 许可证

本项目基于 [MIT 许可证](LICENSE) 开源。

## 🙏 贡献者与致谢

感谢为项目贡献代码、反馈问题、完善修复方案和验证结果的每一位参与者。

- [@David-TechNomad](https://github.com/David-TechNomad)：通过 [PR #10](https://github.com/zzq-github/mathjax-beautiful/pull/10) 贡献符号按钮宽度、高度和间距的自定义能力，改善组件在不同布局中的适配体验。
- [@shtns](https://github.com/shtns)：反馈本地图片无法显示和插入公式后无法继续编辑的问题，帮助发现并跟进 [Issue #7](https://github.com/zzq-github/mathjax-beautiful/issues/7) 与 [Issue #8](https://github.com/zzq-github/mathjax-beautiful/issues/8)。
- **ChatGPT / Codex 辅助**：协助定位 Issue #7、#8 的图片地址清洗、公式插入和光标恢复问题，梳理修复方案，并辅助完成回归测试与真实浏览器验证；相关修复见 [PR #11](https://github.com/zzq-github/mathjax-beautiful/pull/11)。

### 开源依赖

- [MathJax](https://www.mathjax.org/) - 强大的数学公式渲染引擎
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [React](https://react.dev/) - 用于构建用户界面的 JavaScript 库
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集
- [Vite](https://vitejs.dev/) - 现代化的构建工具

## 📮 联系我们

- 📧 Email: <your-email@example.com>
- 🐛 Issues: [GitHub Issues](https://github.com/zzq-github/mathjax-beautiful/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/zzq-github/mathjax-beautiful/discussions)
- 📖 文档: [在线文档](https://zzq-github.github.io/mathjax-beautiful)

## ⭐ Star History

如果这个项目对您有帮助，请给我们一个 ⭐️！

[!\[Star History Chart\](https://api.star-history.com/svg?repos=zzq-github/mathjax-beautiful\&type=Date null)](https://star-history.com/#zzq-github/mathjax-beautiful&Date)

<!--
## 💖 赞赏支持

如果这个项目对您有帮助，欢迎请作者喝杯咖啡 ☕️

<div align="center">
  <div>
    <img src="https://img.shields.io/badge/微信支付-00C853?style=for-the-badge&logo=wechat&logoColor=white" alt="微信支付" />
    <br><br>
    <img width="200" src="./packages/core/src/assets/zsm.jpg" alt="微信赞赏码" />
    <br><br>
    <small>微信扫码赞赏</small>
  </div>
</div>

<div align="center">
  <p>
    <em>您的支持是我持续开发的动力！</em> 🚀
    <br>
    <small>赞赏金额不限，心意最重要 ❤️</small>
  </p>
</div>
-->

---

**MathJax Beautiful** - 让 Vue / React 数学公式编辑变得简单而美好！
