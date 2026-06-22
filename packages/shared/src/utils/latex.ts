/**
 * 匹配LaTeX公式的正则表达式
 * 支持以下格式：
 * 1. $...$        - 行内公式（不支持多行）
 * 2. $$...$$      - 行间公式（支持多行）
 * 3. \(...\)      - 行内公式（支持多行）
 * 4. \[...\]      - 行间公式（支持多行）
 * 5. \begin{equation}...\end{equation} - 编号公式环境
 * 6. \begin{equation*}...\end{equation*} - 无编号公式环境
 * 7. \begin{align}...\end{align}       - 对齐公式环境
 * 8. \begin{align*}...\end{align*}     - 无编号对齐环境
 * 9. \begin{gather}...\end{gather}     - 聚集公式环境
 * 10. \begin{displaymath}...\end{displaymath} - 显示数学环境
 */

import type { MathJaxConfig, MathJaxInstance } from '../types/global';
import { logger } from './logger';

// 数学块会话存储（替代原来的动态属性）
interface MathBlockSession {
  blocks: string[];
  timestamp: number;
}

const mathBlockSessions = new Map<string, MathBlockSession>();
let currentSessionId: string | null = null;

const LATEX_PATTERNS = [
  // 行内公式 $...$，但不匹配 $$...$
  // 允许 $ 后面有空格，以及 $ 前面有空格
  // 支持多行内容（如 \\ 换行符）
  {
    pattern: /(?<!\$)\$(?!\$)\s*([\s\S]+?)\s*\$(?!\$)/g,
    wrapper: (content: string) => `\\(${content.trim()}\\)`,
    isInline: true,
  },
  // 行间公式 $$...$$
  {
    pattern: /\$\$([\s\S]+?)\$\$/g,
    wrapper: (content: string) => `\\[${content}\\]`,
    isInline: false,
  },
  // 行内公式 \(...\)
  {
    pattern: /\\\(([\s\S]+?)\\\)/g,
    wrapper: (content: string) => `\\(${content}\\)`,
    isInline: true,
  },
  // 行间公式 \[...\]
  {
    pattern: /\\\[([\s\S]+?)\\\]/g,
    wrapper: (content: string) => `\\[${content}\\]`,
    isInline: false,
  },
  // equation 环境
  {
    pattern: /\\begin\{equation\}([\s\S]+?)\\end\{equation\}/g,
    wrapper: (content: string) => `\\[${content}\\]`,
    isInline: false,
  },
  // equation* 环境（无编号）
  {
    pattern: /\\begin\{equation\*\}([\s\S]+?)\\end\{equation\*\}/g,
    wrapper: (content: string) => `\\[${content}\\]`,
    isInline: false,
  },
  // align 环境
  {
    pattern: /\\begin\{align\}([\s\S]+?)\\end\{align\}/g,
    wrapper: (content: string) => `\\[${content}\\]`,
    isInline: false,
  },
  // align* 环境（无编号）
  {
    pattern: /\\begin\{align\*\}([\s\S]+?)\\end\{align\*\}/g,
    wrapper: (content: string) => `\\[${content}\\]`,
    isInline: false,
  },
  // gather 环境
  {
    pattern: /\\begin\{gather\}([\s\S]+?)\\end\{gather\}/g,
    wrapper: (content: string) => `\\[${content}\\]`,
    isInline: false,
  },
  // displaymath 环境
  {
    pattern: /\\begin\{displaymath\}([\s\S]+?)\\end\{displaymath\}/g,
    wrapper: (content: string) => `\\[${content}\\]`,
    isInline: false,
  },
];

/**
 * 匹配LaTeX公式的结果类型
 */
export interface MatchLatexResult {
  formula: string;
  content: string;
  start: number;
  end: number;
  wrapper: string;
  isInline: boolean;
}

/**
 * 匹配内容中的LaTeX公式
 * @param {string} content - 要处理的内容
 * @returns {Array} - 匹配到的公式数组，每个元素包含：{formula, start, end, isInline}
 */
export function matchLatex(content: string): MatchLatexResult[] {
  if (!content) return [];

  const matches: MatchLatexResult[] = [];

  LATEX_PATTERNS.forEach(({ pattern, wrapper, isInline }) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      matches.push({
        formula: match[0], // 原始公式文本
        content: match[1], // 公式内容
        start: match.index, // 起始位置
        end: match.index + match[0].length, // 结束位置
        wrapper: wrapper(match[1]), // 处理后的公式
        isInline, // 是否为行内公式
      });
    }
  });

  // 按起始位置排序
  return matches.sort((a, b) => a.start - b.start);
}

/**
 * 清理MathML标签
 * @param {HTMLElement} element - DOM元素
 * @param {string} tagName - 要清理的标签名
 */
export function clearMathTags(element: HTMLElement, tagName: string) {
  const tags = element.getElementsByTagName(tagName);
  while (tags.length > 0) {
    const tag = tags[0];
    if (tag.parentNode) {
      tag.parentNode.removeChild(tag);
    }
  }
}

/**
 * 检测是否为纯LaTeX代码（不包含分隔符）
 * @param {string} content - 要检测的内容
 * @returns {boolean} - 是否为纯LaTeX代码
 */
function isPureLatexCode(content: string): boolean {
  if (!content) return false;

  // 如果已经包含LaTeX分隔符，则不是纯LaTeX代码
  if (
    content.includes('$') ||
    content.includes('\\(') ||
    content.includes('\\[') ||
    content.includes('\\begin{') ||
    content.includes('<svg')
  ) {
    return false;
  }

  // 检查可能导致LaTeX解析错误的符号（移除 < 和 > 因为它们在LaTeX中是合法的）
  const problematicChars = ['&', '%', '#'];
  if (problematicChars.some((char) => content.includes(char))) {
    return false;
  }

  // 检查是否包含HTML标签（但不包括单独的 < 和 > 符号）
  if (/<[a-zA-Z][^>]*>/.test(content)) {
    return false;
  }

  // 如果内容太长（超过100个字符），很可能是普通文本而不是LaTeX公式
  if (content.length > 100) {
    return false;
  }

  // 如果包含空格且长度较长，很可能是普通文本
  if (content.includes(' ') && content.length > 30) {
    return false;
  }

  // 检测LaTeX反斜杠命令
  const latexBackslashCommands = [
    '\\sum',
    '\\int',
    '\\frac',
    '\\sqrt',
    '\\alpha',
    '\\beta',
    '\\gamma',
    '\\delta',
    '\\theta',
    '\\pi',
    '\\sigma',
    '\\lambda',
    '\\mu',
    '\\nu',
    '\\xi',
    '\\rho',
    '\\tau',
    '\\phi',
    '\\chi',
    '\\psi',
    '\\omega',
    '\\Gamma',
    '\\Delta',
    '\\Theta',
    '\\Lambda',
    '\\Xi',
    '\\Pi',
    '\\Sigma',
    '\\Phi',
    '\\Psi',
    '\\Omega',
    '\\infty',
    '\\partial',
    '\\nabla',
    '\\pm',
    '\\mp',
    '\\times',
    '\\div',
    '\\cdot',
    '\\ast',
    '\\star',
    '\\circ',
    '\\bullet',
    '\\cap',
    '\\cup',
    '\\subset',
    '\\supset',
    '\\subseteq',
    '\\supseteq',
    '\\in',
    '\\ni',
    '\\leq',
    '\\geq',
    '\\ll',
    '\\gg',
    '\\neq',
    '\\equiv',
    '\\sim',
    '\\simeq',
    '\\approx',
    '\\cong',
    '\\propto',
    '\\parallel',
    '\\perp',
    '\\angle',
    '\\triangle',
    '\\square',
    '\\diamond',
    '\\bigcirc',
    '\\bigtriangleup',
    '\\bigtriangledown',
    '\\lim',
    '\\max',
    '\\min',
    '\\sup',
    '\\inf',
    '\\left',
    '\\right',
    '\\overline',
    '\\underline',
  ];

  // 首先检查是否包含反斜杠命令
  const hasBackslashCommand = latexBackslashCommands.some((cmd) => content.includes(cmd));
  if (hasBackslashCommand) {
    return true;
  }

  // 检测LaTeX特殊符号，但需要更严格的条件
  // 上标^：必须后面跟着字母、数字或花括号
  const superscriptPattern = /\^[a-zA-Z0-9{]/;
  if (superscriptPattern.test(content)) {
    return true;
  }

  // 下标_：必须后面跟着字母、数字或花括号，并且不是连续的下划线
  const subscriptPattern = /_[a-zA-Z0-9{]/;
  if (subscriptPattern.test(content) && !content.includes('____')) {
    return true;
  }

  // 花括号：如果包含单独的花括号（不在URL或普通文本中）
  if (
    (content.includes('{') || content.includes('}')) &&
    !content.includes('http') &&
    !content.includes('www') &&
    content.length <= 50
  ) {
    // 检查是否包含HTML实体（如&nbsp;），如果是则不是LaTeX
    if (content.includes('&')) {
      return false;
    }

    // 检查是否是简单的集合表示（如 {1, 2, 3} 或 { }）
    const setPattern = /^\s*\{\s*([0-9,\s]*)\s*\}\s*$/;
    if (setPattern.test(content.trim())) {
      return false;
    }

    // 检查是否包含LaTeX特有的符号或命令
    const hasLatexSymbols = /\\[a-zA-Z]|[\^_\\]/.test(content);
    if (!hasLatexSymbols) {
      return false;
    }

    return true;
  }

  // 检测数学比较符号
  const mathComparisonPattern = /[<>=≤≥≠±∞]/;
  if (mathComparisonPattern.test(content) && content.length <= 50) {
    // 检查是否包含HTML实体（如&nbsp;），如果是则不是LaTeX
    if (content.includes('&')) {
      return false;
    }

    // 检查是否是简单的数学表达式（如 x + 12 = 35）
    const simpleMathPattern = /^[a-zA-Z0-9\s+\-*/=]+$/;
    if (simpleMathPattern.test(content.trim())) {
      return false;
    }

    // 检查是否包含LaTeX特有的符号或命令
    const hasLatexSymbols = /\\[a-zA-Z]|[\^_\\]/.test(content);
    if (!hasLatexSymbols) {
      return false;
    }

    return true;
  }

  return false;
}

/**
 * 预处理LaTeX内容，处理HTML实体编码
 * @param {string} content - LaTeX内容
 * @returns {string} - 处理后的内容
 */
function preprocessLatexContent(content: string): string {
  if (!content) return '';

  // 处理HTML实体编码
  const htmlEntities: { [key: string]: string } = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
  };

  let result = content;
  Object.entries(htmlEntities).forEach(([entity, char]) => {
    result = result.replace(new RegExp(entity, 'g'), char);
  });

  return result;
}

/**
 * 恢复公式内部被错误处理的转义字符
 * JavaScript 会将 \t 解释为制表符、\f 解释为换页符等
 * 需要将这些控制字符恢复为字面的反斜杠形式
 * @param {string} str - 要处理的字符串
 * @returns {string} - 处理后的字符串
 */
/**
 * 恢复公式内部的转义字符
 * 注意：只在公式分隔符内部调用，避免影响普通文本中的真正制表符/换行符
 *
 * 处理逻辑：
 * 只恢复已知的 LaTeX 命令前缀，而不是所有 \t + 字母的组合
 * 例如：\times, \frac, \text 等常见命令
 */
const restoreEscapedCharsInFormula = (str: string): string => {
  // 常见的以 t/f/n/r/v 开头的 LaTeX 命令前缀
  // \t: times, text, tilde, to, top, triangle, etc.
  // \f: frac, forall, flat, etc.
  // \n: not, nabla, natural, etc.
  // \r: right, rho, etc.
  // \v: vec, varepsilon, varphi, etc.
  const latexCommands = [
    'times',
    'text',
    'textbf',
    'textit',
    'texttt',
    'tilde',
    'to',
    'top',
    'triangle',
    'frac',
    'forall',
    'flat',
    'lfloor',
    'lceil',
    'langle',
    // 'not', 'nabla', 'natural', 'neg', 'neq', 'ni',
    'right',
    'rho',
    'rightarrow',
    'Rightarrow',
    'rceil',
    'rfloor',
    'rangle',
    'vec',
    'varepsilon',
    'varphi',
    'varpi',
    'varrho',
    'varsigma',
    'vartheta',
    'vdash',
  ];

  // 构建正则：匹配制表符/换页符等 + 已知命令
  const commandPattern = new RegExp(
    `\\t(${latexCommands.filter((c) => c.startsWith('t')).join('|')})`,
    'g'
  );
  const fracPattern = new RegExp(
    `\\f(${latexCommands.filter((c) => c.startsWith('f')).join('|')})`,
    'g'
  );
  // const notPattern = new RegExp(`\\n(${latexCommands.filter(c => c.startsWith('n')).join('|')})`, 'g');
  const rightPattern = new RegExp(
    `\\r(${latexCommands.filter((c) => c.startsWith('r')).join('|')})`,
    'g'
  );
  const vecPattern = new RegExp(
    `\\v(${latexCommands.filter((c) => c.startsWith('v')).join('|')})`,
    'g'
  );

  return (
    str
      .replace(commandPattern, '\\t$1') // \times -> \\times
      .replace(fracPattern, '\\f$1') // \frac -> \\frac
      // .replace(notPattern, '\\n$1')      // \not -> \\not
      .replace(rightPattern, '\\r$1') // \right -> \\right
      .replace(vecPattern, '\\v$1')
  ); // \vec -> \\vec
};

/**
 * 预处理 Unicode 数学符号，将其转换为 LaTeX 格式
 * 用于处理数据源中直接使用 Unicode 符号而非 LaTeX 命令的情况
 * @param {string} content - 要处理的内容
 * @returns {string} - 处理后的内容
 */
function preprocessUnicodeMathSymbols(content: string): string {
  if (!content) return '';

  let result = content;

  // 处理平方根符号 √(x) 或 √x -> $\sqrt{x}$
  // 注意：需要避免处理已经在公式分隔符 $...$ 内的内容

  // 格式1: √[n](x) -> $\sqrt[n]{x}$ (n次方根) - 先处理这个更具体的模式
  result = result.replace(/√\[(\d+)\]\(([^)]+)\)/g, (match, n, inner) => {
    return `$\\sqrt[${n}]{${inner}}$`;
  });

  // 格式2: √(内容) -> $\sqrt{内容}$
  // 需要检查是否不在 $...$ 内
  result = result.replace(/√\(([^)]+)\)/g, (match, inner) => {
    return `$\\sqrt{${inner}}$`;
  });

  // 格式3: √数字 -> $\sqrt{数字}$
  // 匹配 √ 后面跟着数字，但不匹配已经处理过的 $\sqrt{数字}$
  result = result.replace(/√(\d+)(?!\s*\})/g, (match, num) => {
    return `$\\sqrt{${num}}$`;
  });

  // 格式4: √字母 -> $\sqrt{字母}$ (单个字母变量)
  result = result.replace(/√([a-zA-Z])(?!\s*\})/g, (match, letter) => {
    return `$\\sqrt{${letter}}$`;
  });

  return result;
}

/**
 * 检测 $数字 后面是否可能是 LaTeX 公式内容
 * @param {string} afterContent - $数字 后面的内容
 * @returns {boolean} - 是否可能是 LaTeX 公式
 */
function isLikelyLatexFormula(afterContent: string): boolean {
  if (!afterContent) return false;

  // 获取前几个字符进行分析
  const preview = afterContent.slice(0, 100);

  // 1. 首先检查是否有结束的 $（说明是公式）
  // 这是最关键的判断：如果后面有配对的 $，很可能是公式
  const dollarIndex = preview.search(/(?<!\$)\$(?!\$)/);
  if (dollarIndex !== -1) {
    // 找到了结束的 $，检查中间内容是否合理
    const betweenContent = preview.slice(0, dollarIndex).trim();

    // 如果中间内容为空或只有空格，这是空公式，不太可能
    if (betweenContent.length === 0) {
      return false;
    }

    // 检查中间内容是否是有效的公式内容
    // 公式内容可能包含：数字、小数点、空格、运算符、LaTeX命令等
    if (isValidFormulaContent(betweenContent)) {
      return true;
    }

    // 如果中间内容有 LaTeX 特征，肯定是公式
    if (hasLatexCharacteristics(betweenContent)) {
      return true;
    }
  }

  // 2. 检查紧跟的内容是否有 LaTeX 特征
  if (hasLatexCharacteristics(preview)) {
    return true;
  }

  // 3. 检查是否是纯数字公式的情况（如 $3.15$）
  // 如果第一个字符是 $，说明是 $数字$ 格式
  if (preview[0] === '$') {
    return true;
  }

  return false;
}

/**
 * 检查内容是否是有效的公式内容
 * 公式内容可能包含：数字、小数点、空格、运算符、括号等
 * @param {string} content - 要检查的内容
 * @returns {boolean} - 是否是有效的公式内容
 */
function isValidFormulaContent(content: string): boolean {
  if (!content || content.length === 0) return false;

  // 允许的公式内容模式
  // 1. 纯数字和小数点：3.14, 42, 3.14159
  if (/^[\d.]+$/.test(content)) {
    return true;
  }

  // 2. 数字和基本运算符：3 + 5, 2 * 4, 10 / 2
  if (/^[\d.+\-*/=\s]+$/.test(content)) {
    return true;
  }

  // 3. 带括号的数学表达式：(3+5), 2(x+1)
  if (/^[\d.+\-*/=()[\]{}\s]+$/.test(content)) {
    return true;
  }

  // 4. 包含变量字母的简单表达式：x, 2x, 3y+1
  if (/^[a-zA-Z\d.+\-*/=()[\]{}\s]+$/.test(content)) {
    return true;
  }

  // 5. 包含比较符号：3 < 5, x >= 0
  if (/^[\d.a-zA-Z<>!=≤≥≠≈\s]+$/.test(content)) {
    return true;
  }

  // 6. 包含百分号：50%
  if (/^[\d.%\s]+$/.test(content)) {
    return true;
  }

  return false;
}

/**
 * 检查内容是否包含 LaTeX 公式特征
 * @param {string} content - 要检查的内容
 * @returns {boolean} - 是否包含 LaTeX 特征
 */
function hasLatexCharacteristics(content: string): boolean {
  if (!content) return false;

  // 常见的 LaTeX 数学命令（简短列表，用于快速判断）
  const latexMathCommands = [
    '\\ne',
    '\\neq',
    '\\times',
    '\\div',
    '\\cdot',
    '\\pm',
    '\\mp',
    '\\le',
    '\\leq',
    '\\ge',
    '\\geq',
    '\\approx',
    '\\equiv',
    '\\sim',
    '\\frac',
    '\\sqrt',
    '\\sum',
    '\\prod',
    '\\int',
    '\\lim',
    '\\alpha',
    '\\beta',
    '\\gamma',
    '\\delta',
    '\\theta',
    '\\pi',
    '\\sigma',
    '\\infty',
    '\\partial',
    '\\nabla',
    '\\in',
    '\\notin',
    '\\subset',
    '\\supset',
    '\\cup',
    '\\cap',
    '\\rightarrow',
    '\\leftarrow',
    '\\Rightarrow',
    '\\Leftarrow',
    '\\log',
    '\\ln',
    '\\sin',
    '\\cos',
    '\\tan',
    '\\left',
    '\\right',
    '\\quad',
    '\\qquad',
    '\\text',
    '\\mathbf',
    '\\mathit',
    '\\mathrm',
    '\\begin',
    '\\end',
    '\\boxed',
    '\\overline',
    '\\underline',
    '\\vec',
    '\\hat',
    '\\tilde',
    '\\bar',
    '\\dot',
    '\\ddot',
  ];

  // 检查是否包含 LaTeX 命令
  for (const cmd of latexMathCommands) {
    if (content.includes(cmd)) {
      return true;
    }
  }

  // 检查是否有 LaTeX 特殊结构
  // 上下标：^ 或 _ 后跟数字或花括号
  if (/[\^_]\d/.test(content) || /[\^_]\{/.test(content)) {
    return true;
  }

  // 花括号包裹的内容（LaTeX 常见结构）
  if (/\{[^}]+\}/.test(content)) {
    return true;
  }

  // 数学运算符和符号（Unicode）
  if (/[≤≥≠≈≡×÷±∞∑∏∫√∂∇∈∉⊂⊃∪∩]/.test(content)) {
    return true;
  }

  // 反斜杠后跟字母（LaTeX 命令的通用模式）
  if (/\\[a-zA-Z]/.test(content)) {
    return true;
  }

  return false;
}

/**
 * 预处理货币美元符号，避免与 LaTeX 公式分隔符冲突
 * 将 $数字 格式的货币符号转换为占位符，处理完公式后再恢复
 *
 * 改进策略：
 * 1. 先保护所有 $$...$$ 行间公式
 * 2. 对 $数字 进行智能判断：
 *    - 如果后面紧跟 LaTeX 命令或结束的 $，则是公式
 *    - 如果后面是空格、标点、换行，则是货币
 * 3. 保护 $...$ 行内公式
 *
 * @param {string} content - 要处理的内容
 * @returns {string} - 处理后的内容
 */
function protectCurrencyDollar(content: string): string {
  if (!content) return '';

  let protectedContent = content;

  // 第一步：保护 $$...$$ 行间公式（使用临时标记）
  const displayMathBlocks: string[] = [];
  const DISPLAY_MARKER = '\uE006';
  protectedContent = protectedContent.replace(/\$\$[\s\S]*?\$\$/g, (match) => {
    const index = displayMathBlocks.length;
    displayMathBlocks.push(match);
    return `${DISPLAY_MARKER}DISPLAY_${index}${DISPLAY_MARKER}`;
  });

  // 第二步：智能识别货币符号 $数字
  // 货币格式：$ 后面紧跟数字（可能有小数点和千位分隔符）
  // 关键改进：检查后面是否是货币上下文，而不是 LaTeX 公式
  protectedContent = protectedContent.replace(
    /\$(\d+(?:,\d{3})*(?:\.\d+)?)/g,
    (match, number, offset, fullString) => {
      // 获取 $数字 后面的内容
      const afterContent = fullString.slice(offset + match.length);

      // 检查后面是否可能是 LaTeX 公式
      if (isLikelyLatexFormula(afterContent)) {
        // 这是 LaTeX 公式的一部分，不处理
        return match;
      }

      // 检查后面是否是货币上下文
      // 货币后面通常是：空格、标点符号、换行、结束
      const firstChar = afterContent[0];
      if (firstChar) {
        // 如果后面是字母、反斜杠、$ 符号，则可能是公式
        if (/[a-zA-Z\\$]/.test(firstChar)) {
          return match; // 可能是公式，不处理
        }

        // 如果后面是数字（没有空格），如 $24$ 这种，是公式
        if (/\d/.test(firstChar)) {
          return match; // 是公式，不处理
        }

        // 如果后面是数学运算符，是公式
        if (/[+\-*/=<>]/.test(firstChar)) {
          return match; // 是公式，不处理
        }
      }

      // 这是货币符号，进行保护
      return `___CURRENCY_DOLLAR___${number}`;
    }
  );

  // 第三步：保护 $...$ 行内公式
  // 此时货币符号已经被替换，不会干扰公式匹配
  const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const latexBlocks: string[] = [];
  const START_MARKER = '\uE004';
  const END_MARKER = '\uE005';

  // 使用循环处理，确保捕获所有公式
  let prevContent = '';
  while (prevContent !== protectedContent) {
    prevContent = protectedContent;
    protectedContent = protectedContent.replace(/(?<!\$)\$(?!\$)([\s\S]*?)\$(?!\$)/, (match) => {
      const index = latexBlocks.length;
      latexBlocks.push(match);
      return `${START_MARKER}CUR_${sessionId}_${index}${END_MARKER}`;
    });
  }

  // 恢复 LaTeX 公式
  latexBlocks.forEach((block, index) => {
    const placeholder = `${START_MARKER}CUR_${sessionId}_${index}${END_MARKER}`;
    protectedContent = protectedContent.split(placeholder).join(block);
  });

  // 恢复行间公式
  displayMathBlocks.forEach((block, index) => {
    const placeholder = `${DISPLAY_MARKER}DISPLAY_${index}${DISPLAY_MARKER}`;
    protectedContent = protectedContent.split(placeholder).join(block);
  });

  return protectedContent;
}

/**
 * 恢复货币美元符号
 * @param {string} content - 要处理的内容
 * @returns {string} - 处理后的内容
 */
function restoreCurrencyDollar(content: string): string {
  if (!content) return '';
  return content.replace(/___CURRENCY_DOLLAR___/g, '$');
}

/**
 * 处理填空题下划线：将连续的下划线字符转换为实线下划线样式
 * 只处理连续3个及以上的下划线字符，避免影响普通文本中的单个下划线
 * @param {string} content - 原始内容
 * @return {string} - 处理后的内容
 */
function processFillBlankUnderline(content: string): string {
  if (!content) return '';

  // 将连续的下划线字符（至少3个）转换为带实线下划线的span
  // 这样填空题的空白位置会显示为实线下划线
  return content.replace(/_{3,}/g, (match) => {
    return `<span style="text-decoration: underline; text-decoration-style: solid;">${match}</span>`;
  });
}

/**
 * 转换LaTeX公式为SVG
 * @param {string} content - 包含LaTeX公式的内容
 * @returns {Promise<string>} - 转换后的内容
 */
export async function convertLatexToSvg(content: string): Promise<string> {
  if (!content) return '';

  // 检查是否在客户端环境且 MathJax 可用
  if (typeof window === 'undefined' || !window.MathJax?.tex2svgPromise) {
    return content;
  }

  try {
    // 如果内容中包含SVG公式，则先转换为LaTeX代码，重新转换为SVG
    if (content?.includes('<svg') && content?.includes('data-latex')) {
      content = extractLatexFromSvg(content);
    }

    // 保护货币美元符号，避免被错误解析为公式分隔符
    content = protectCurrencyDollar(content);

    // 恢复被错误处理的转义字符（如 \frac 变成 rac）
    content = restoreEscapedCharsInFormula(content);

    // 预处理HTML实体编码
    content = preprocessLatexContent(content);

    // 预处理 Unicode 数学符号（如 √ -> \sqrt）
    content = preprocessUnicodeMathSymbols(content);

    // 如果是纯LaTeX代码（不包含分隔符），自动添加行内公式分隔符
    if (isPureLatexCode(content)) {
      content = `$${content}$`;
    }

    // 检查是否包含任何LaTeX公式
    const hasLatex =
      content.includes('\\(') ||
      content.includes('\\)') ||
      content.includes('\\[') ||
      content.includes('\\]') ||
      content.includes('$') ||
      content.includes('\\begin{');

    if (!hasLatex) {
      // 恢复货币美元符号
      return processFillBlankUnderline(restoreCurrencyDollar(content));
    }

    const matches = matchLatex(content);
    if (!matches.length) {
      // 恢复货币美元符号
      return processFillBlankUnderline(restoreCurrencyDollar(content));
    }

    // 创建一个副本以进行替换
    let result = content;
    let offset = 0;

    // 使用MathJax转换每个公式
    for (const match of matches) {
      try {
        // 检测是否是纯下划线公式（填空题答案位置）
        // 例如：$\_\_\_\_$ 或 $____$ 这种格式
        const cleanContent = match.content.replace(/\\_/g, '_').trim();
        if (/^_+$/.test(cleanContent)) {
          // 这是纯下划线，不使用 MathJax 渲染
          // 直接转换为带实线下划线样式的 span
          const underlineHtml = `<span style="text-decoration: underline; text-decoration-style: solid;">${cleanContent}</span>`;

          // 计算新的位置
          const start = match.start + offset;
          const end = match.end + offset;

          // 替换原文本
          result = result.substring(0, start) + underlineHtml + result.substring(end);

          // 更新偏移量
          offset += underlineHtml.length - match.formula.length;
          continue;
        }

        // 预处理公式内容
        const processedContent = preprocessLatexContent(match.content);

        const svg = await window.MathJax.tex2svgPromise(processedContent, {
          display: !match.isInline,
          scale: 1.0,
          em: 16,
          ex: 8,
          containerWidth: 1200,
        });

        // 获取SVG元素
        const svgElement = svg.getElementsByTagName('svg')[0];

        // 修复SVG显示问题，特别是数学符号的显示
        fixSvgDisplay(svgElement, match.content);

        // 添加原始LaTeX公式作为属性
        svgElement.setAttribute('data-latex', match.content);
        svgElement.setAttribute('data-latex-type', match.isInline ? 'inline' : 'display');

        // 添加样式属性
        svgElement.setAttribute('contenteditable', 'false');
        svgElement.style.cursor = 'pointer';
        svgElement.style.display = 'inline-block';
        svgElement.style.margin = '0 4px';
        svgElement.style.fontSize = '16px';
        svgElement.style.verticalAlign = 'middle';

        // 获取处理后的SVG HTML，前后添加空格
        const svgHtml = ' ' + svgElement.outerHTML + ' ';

        // 计算新的位置（考虑之前替换造成的偏移）
        const start = match.start + offset;
        const end = match.end + offset;

        // 替换原文本
        result = result.substring(0, start) + svgHtml + result.substring(end);

        // 更新偏移量
        offset += svgHtml.length - match.formula.length;
      } catch {
        // 如果转换失败，保留原始文本
        continue;
      }
    }

    // 恢复货币美元符号
    result = restoreCurrencyDollar(result);

    // 处理填空题下划线：将连续的下划线字符转换为实线下划线样式
    result = processFillBlankUnderline(result);

    return result;
  } catch {
    // 即使出错，也尝试恢复货币美元符号并处理下划线
    return processFillBlankUnderline(restoreCurrencyDollar(content));
  }
}

/**
 * 批量转换LaTeX公式
 * @param {Array<{content: string}>} contents - 要处理的内容数组
 * @returns {Promise<Array>} - 处理后的内容数组
 */
export async function batchConvertLatex(
  contents: { content: string }[]
): Promise<{ content: string }[]> {
  if (!Array.isArray(contents)) return contents;

  try {
    return await Promise.all(
      contents.map(async (item) => {
        if (!item || typeof item.content !== 'string') return item;
        const convertedContent = await convertLatexToSvg(item.content);
        return { ...item, content: convertedContent };
      })
    );
  } catch {
    return contents;
  }
}

// 从SVG公式中转换为LaTeX代码
export const extractLatexFromSvg = (content: string): string => {
  if (!content) return '';

  // 如果内容中没有SVG，直接返回
  if (!content.includes('<svg')) {
    return content;
  }

  // 只在客户端环境中使用DOM操作
  if (typeof window === 'undefined') {
    // 服务器端使用正则表达式处理
    return content
      .replace(
        /<svg[^>]*data-latex="([^"]*)"[^>]*data-latex-type="([^"]*)"[^>]*>[\s\S]*?<\/svg>/g,
        (match, latexCode, latexType) => {
          return latexType === 'inline' ? `$${latexCode}$` : `$$${latexCode}$$`;
        }
      )
      .replace(/<svg[^>]*data-latex="([^"]*)"[^>]*>[\s\S]*?<\/svg>/g, (match, latexCode) => {
        // 如果没有data-latex-type，默认为行间公式
        return `$$${latexCode}$$`;
      });
  }

  try {
    // 创建临时DOM元素来解析HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;

    // 查找所有带有data-latex属性的SVG元素
    const svgElements = tempDiv.querySelectorAll('svg[data-latex]');

    svgElements.forEach((svg) => {
      const latexCode = svg.getAttribute('data-latex');
      if (latexCode) {
        // 根据data-latex-type属性判断是行内还是行间公式
        const latexType = svg.getAttribute('data-latex-type');
        let latexFormat: string;

        if (latexType === 'inline') {
          latexFormat = `$${latexCode}$`; // 行内公式
        } else {
          latexFormat = `$$${latexCode}$$`; // 行间公式（默认）
        }

        // 创建文本节点替换SVG
        const textNode = document.createTextNode(latexFormat);
        svg.parentNode?.replaceChild(textNode, svg);
      }
    });

    return tempDiv.innerHTML;
  } catch {
    return content;
  }
};

/**
 * 修复SVG显示问题，特别是数学符号的显示
 * @param {SVGElement} svgElement - SVG元素
 * @param {string} latexContent - LaTeX内容
 */
function fixSvgDisplay(svgElement: SVGSVGElement, latexContent: string) {
  if (!svgElement || !latexContent) return;

  // 检查是否是数学比较符号
  const mathSymbols = ['\\geq', '\\leq', '\\ne', '\\approx', '\\equiv', '\\sim'];
  const isMathSymbol = mathSymbols.some((symbol) => latexContent.includes(symbol));

  if (isMathSymbol) {
    // 获取当前的viewBox
    const viewBox = svgElement.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(' ');
      if (parts.length === 4) {
        const [, , width, height] = parts;
        const numHeight = parseFloat(height);

        // 对于数学符号，确保有足够的显示空间
        if (numHeight < 800) {
          const newHeight = Math.max(800, numHeight * 1.2);
          const newViewBox = `${parts[0]} ${parts[1]} ${width} ${newHeight}`;
          svgElement.setAttribute('viewBox', newViewBox);
        }
      }
    }

    // 调整SVG的高度属性
    const currentHeight = svgElement.getAttribute('height');
    if (currentHeight) {
      const heightValue = parseFloat(currentHeight);
      if (heightValue < 2.5) {
        svgElement.setAttribute('height', '2.6ex');
      }
    }
  }
}

/**
 * 检测内容中是否包含LaTeX公式
 * @param {string} content - 要检测的内容
 * @returns {boolean} - 是否包含LaTeX公式
 */
export function hasLatexFormula(content: string): boolean {
  if (!content) return false;

  return LATEX_PATTERNS.some(({ pattern }) => pattern.test(content));
}

/**
 * 保护数学公式块，防止 MarkdownIt 破坏公式结构
 * MarkdownIt 会把 $$...$$ 内的 \\（LaTeX换行符）解析成段落，导致矩阵等结构被破坏
 *
 * 注意：此函数使用静态存储，在流式传输场景下需要特别注意：
 * - 每次调用会覆盖之前的存储
 * - 必须在同一个渲染周期内调用 restoreMathBlocks
 *
 * @param {string} content - 要处理的内容
 * @returns {string} - 处理后的内容（包含占位符）
 */
export function protectMathBlocks(content: string): string {
  if (!content) return '';

  // 使用唯一的会话ID，避免流式传输时的冲突
  const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  let result = content;

  // 存储被保护的数学公式块
  const mathBlocks: string[] = [];

  // 使用 Unicode 私有区字符作为占位符标记，避免被 Markdown/HTML 解析
  // \uE000 和 \uE001 是 BMP 私有使用区的字符，不会被任何标准解析器处理
  const START_MARKER = '\uE000'; // 
  const END_MARKER = '\uE001'; // 

  const makePlaceholder = (id: string, idx: number) =>
    `${START_MARKER}MATH_BLOCK_${id}_${idx}${END_MARKER}`;
  const makeNewlinePlaceholder = (id: string) => `${START_MARKER}LATEX_NL_${id}${END_MARKER}`;

  // 保护 $$...$$ 块级公式（支持多行）
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (match, mathContent) => {
    const index = mathBlocks.length;
    // 先恢复被错误处理的转义字符（只在公式内部）
    let protectedContent = restoreEscapedCharsInFormula(mathContent);
    // 将 \\ 替换为临时标记，防止被 MarkdownIt 解析
    protectedContent = protectedContent.replace(/\\\\/g, makeNewlinePlaceholder(sessionId));
    // 对单个反斜杠进行保护，防止 \frac 等命令被 MarkdownIt 破坏
    protectedContent = protectedContent.replace(
      /\\/g,
      makeNewlinePlaceholder(sessionId).replace('LATEX_NL', 'LATEX_BS')
    );
    mathBlocks.push(`$$${protectedContent}$$`);
    return makePlaceholder(sessionId, index);
  });

  // 保护 $...$ 行内公式（允许前后有空格，支持多行内容如 \\ 换行）
  result = result.replace(/(?<!\$)\$(?!\$)\s*([\s\S]+?)\s*\$(?!\$)/g, (match, mathContent) => {
    const index = mathBlocks.length;
    // 先恢复被错误处理的转义字符（只在公式内部）
    let protectedContent = restoreEscapedCharsInFormula(mathContent);
    // 将 \\ 替换为临时标记，防止被 MarkdownIt 解析
    protectedContent = protectedContent.replace(/\\\\/g, makeNewlinePlaceholder(sessionId));
    // 对单个反斜杠进行保护，防止 \frac 等命令被 MarkdownIt 破坏
    protectedContent = protectedContent.replace(
      /\\/g,
      makeNewlinePlaceholder(sessionId).replace('LATEX_NL', 'LATEX_BS')
    );
    mathBlocks.push(`$${protectedContent}$`);
    return makePlaceholder(sessionId, index);
  });

  // 保护 \[...\] 块级公式
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (match, mathContent) => {
    const index = mathBlocks.length;
    // 先恢复被错误处理的转义字符（只在公式内部）
    let protectedContent = restoreEscapedCharsInFormula(mathContent);
    protectedContent = protectedContent.replace(/\\\\/g, makeNewlinePlaceholder(sessionId));
    // 对单个反斜杠进行保护，防止 \frac 等命令被 MarkdownIt 破坏
    protectedContent = protectedContent.replace(
      /\\/g,
      makeNewlinePlaceholder(sessionId).replace('LATEX_NL', 'LATEX_BS')
    );
    mathBlocks.push(`\\[${protectedContent}\\]`);
    return makePlaceholder(sessionId, index);
  });

  // 保护 \(...\) 行内公式
  result = result.replace(/\\\(([\s\S]+?)\\\)/g, (match, mathContent) => {
    const index = mathBlocks.length;
    // 先恢复被错误处理的转义字符（只在公式内部）
    let protectedContent = restoreEscapedCharsInFormula(mathContent);
    // 对单个反斜杠进行保护，防止 \frac 等命令被 MarkdownIt 破坏
    protectedContent = protectedContent.replace(
      /\\/g,
      makeNewlinePlaceholder(sessionId).replace('LATEX_NL', 'LATEX_BS')
    );
    mathBlocks.push(`\\(${protectedContent}\\)`);
    return makePlaceholder(sessionId, index);
  });

  // 保护 \begin{...}...\end{...} 数学环境（如 bmatrix, cases, aligned 等）
  const mathEnvironments = [
    'bmatrix',
    'pmatrix',
    'vmatrix',
    'Vmatrix',
    'matrix',
    'cases',
    'aligned',
    'gather',
    'split',
    'multline',
    'array',
    'equation',
    'eqnarray',
  ];
  mathEnvironments.forEach((env) => {
    const envPattern = new RegExp(`\\\\begin\\{${env}\\}([\\s\\S]*?)\\\\end\\{${env}\\}`, 'g');
    result = result.replace(envPattern, (match) => {
      const index = mathBlocks.length;
      // 先恢复被错误处理的转义字符（只在公式内部）
      let protectedContent = restoreEscapedCharsInFormula(match);
      protectedContent = protectedContent.replace(/\\\\/g, makeNewlinePlaceholder(sessionId));
      // 对单个反斜杠进行保护，防止 \frac 等命令被 MarkdownIt 破坏
      protectedContent = protectedContent.replace(
        /\\/g,
        makeNewlinePlaceholder(sessionId).replace('LATEX_NL', 'LATEX_BS')
      );
      mathBlocks.push(protectedContent);
      return makePlaceholder(sessionId, index);
    });
  });

  // 存储到模块级变量，供 restoreMathBlocks 使用
  mathBlockSessions.set(sessionId, { blocks: mathBlocks, timestamp: Date.now() });

  // 清理过期的会话（超过30秒）
  const now = Date.now();
  mathBlockSessions.forEach((session, key) => {
    if (now - session.timestamp > 30000) {
      mathBlockSessions.delete(key);
    }
  });

  // 将当前会话ID存储，供恢复时使用
  currentSessionId = sessionId;

  return result;
}

/**
 * 恢复数学公式块
 * @param {string} content - 包含占位符的内容
 * @returns {string} - 恢复后的内容
 */
export function restoreMathBlocks(content: string): string {
  if (!content) return '';

  // Unicode 私有区字符
  const START_MARKER = '\uE000';
  const END_MARKER = '\uE001';

  // 获取当前会话ID
  const sessionId = currentSessionId;
  if (!sessionId) {
    // 如果没有会话ID，尝试清理内容中可能残留的占位符
    const placeholderPattern = new RegExp(
      `${START_MARKER}MATH_BLOCK_[a-z0-9]+_\\d+${END_MARKER}`,
      'g'
    );
    const newlinePattern = new RegExp(`${START_MARKER}LATEX_NL_[a-z0-9]+${END_MARKER}`, 'g');
    return content.replace(placeholderPattern, '').replace(newlinePattern, '\\\\');
  }

  const session = mathBlockSessions.get(sessionId);
  if (!session) {
    // 如果会话不存在，清理占位符
    const placeholderPattern = new RegExp(
      `${START_MARKER}MATH_BLOCK_${sessionId}_\\d+${END_MARKER}`,
      'g'
    );
    const newlinePattern = new RegExp(`${START_MARKER}LATEX_NL_${sessionId}${END_MARKER}`, 'g');
    return content.replace(placeholderPattern, '').replace(newlinePattern, '\\\\');
  }

  const mathBlocks = session.blocks;
  let result = content;

  // 恢复所有数学公式块
  mathBlocks.forEach((block: string, index: number) => {
    // 恢复 \\ 换行符
    const newlinePattern = new RegExp(`${START_MARKER}LATEX_NL_${sessionId}${END_MARKER}`, 'g');
    // 恢复单个反斜杠（用于保护 \frac 等命令）
    const backslashPattern = new RegExp(`${START_MARKER}LATEX_BS_${sessionId}${END_MARKER}`, 'g');
    let restoredBlock = block.replace(newlinePattern, '\\\\');
    restoredBlock = restoredBlock.replace(backslashPattern, '\\');
    const placeholderPattern = new RegExp(
      `${START_MARKER}MATH_BLOCK_${sessionId}_${index}${END_MARKER}`,
      'g'
    );
    result = result.replace(placeholderPattern, restoredBlock);
  });

  // 清理当前会话
  mathBlockSessions.delete(sessionId);
  currentSessionId = null;

  return result;
}

/**
 * 清理内容中所有残留的数学块占位符
 * 用于处理流式传输时可能残留的未匹配占位符
 * @param {string} content - 要清理的内容
 * @returns {string} - 清理后的内容
 */
export function cleanupMathBlockPlaceholders(content: string): string {
  if (!content) return '';

  let result = content;

  // Unicode 私有区字符
  const START_MARKER = '\uE000';
  const END_MARKER = '\uE001';

  // 清理所有可能的占位符格式
  // 格式0: \uE002MATHindex\uE003（preprocessLatexDocument 中的公式保护占位符）
  result = result.replace(/\uE002MATH\d+\uE003/g, '');

  // 格式1: \uE000MATH_BLOCK_sessionId_index\uE001（新格式）
  const newPlaceholderPattern = new RegExp(
    `${START_MARKER}MATH_BLOCK_[a-z0-9]+_\\d+${END_MARKER}`,
    'g'
  );
  result = result.replace(newPlaceholderPattern, '');
  // 格式2: \uE000LATEX_NL_sessionId\uE001（换行符占位符）
  const newNewlinePattern = new RegExp(`${START_MARKER}LATEX_NL_[a-z0-9]+${END_MARKER}`, 'g');
  result = result.replace(newNewlinePattern, '\\\\');
  // 格式2b: \uE000LATEX_BS_sessionId\uE001（反斜杠占位符）
  const newBackslashPattern = new RegExp(`${START_MARKER}LATEX_BS_[a-z0-9]+${END_MARKER}`, 'g');
  result = result.replace(newBackslashPattern, '\\');
  // 格式3: 旧格式 [[MATH_BLOCK_index]]（之前的版本）
  result = result.replace(/\[\[MATH_BLOCK_[a-z0-9]+_\d+\]\]/g, '');
  result = result.replace(/\[\[LATEX_NL_[a-z0-9]+\]\]/g, '\\\\');
  // 格式4: 旧格式 <<<MATH_BLOCK_index>>>（兼容旧代码）
  result = result.replace(/<<<MATH_BLOCK_\d+>>>/g, '');
  result = result.replace(/<<<LATEX_NEWLINE>>>/g, '\\\\');
  // 格式5: \x00 格式（兼容之前的版本）- 禁用控制字符检查
  // eslint-disable-next-line no-control-regex
  result = result.replace(/\x00MATH_BLOCK_[a-z0-9]+_\d+\x00/g, '');
  // eslint-disable-next-line no-control-regex
  result = result.replace(/\x00LATEX_NEWLINE_[a-z0-9]+\x00/g, '\\\\');
  // 格式6: replacement character 格式
  result = result.replace(/\ufffdMATH_BLOCK_[a-z0-9]+_\d+\ufffd/g, '');
  result = result.replace(/\ufffdLATEX_NEWLINE_[a-z0-9]+\ufffd/g, '\\\\');
  // 格式7: 裸格式（没有任何包裹的情况）
  result = result.replace(/MATH_BLOCK_[a-z0-9]+_\d+/g, '');
  result = result.replace(/LATEX_NL_[a-z0-9]+/g, '');
  result = result.replace(/LATEX_BS_[a-z0-9]+/g, '\\');

  return result;
}

/**
 * 预处理LaTeX文档结构，将其转换为Markdown格式
 * 用于处理AI生成的完整LaTeX文档（包含\documentclass等）
 * @param {string} content - LaTeX文档内容
 * @returns {string} - 转换后的Markdown内容
 */
export function preprocessLatexDocument(content: string): string {
  if (!content) return '';

  let result = content;

  // ========== 首先保护公式分隔符内的内容 ==========
  // 这样可以确保公式内的 LaTeX 命令不会被错误转换
  // 使用 Unicode 私有区字符作为占位符，避免被其他处理影响
  const mathBlocks: string[] = [];
  const PLACEHOLDER_START = '\uE002'; // 
  const PLACEHOLDER_END = '\uE003'; // 

  const makePlaceholder = (index: number) => `${PLACEHOLDER_START}MATH${index}${PLACEHOLDER_END}`;

  // 保护 $$...$$ 块级公式
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
    const index = mathBlocks.length;
    mathBlocks.push(match);
    return makePlaceholder(index);
  });

  // 保护 $...$ 行内公式（但不匹配 $$）
  result = result.replace(/(?<!\$)\$(?!\$)([^$\n]+)\$/g, (match) => {
    const index = mathBlocks.length;
    mathBlocks.push(match);
    return makePlaceholder(index);
  });

  // 保护 \[...\] 块级公式
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (match) => {
    const index = mathBlocks.length;
    mathBlocks.push(match);
    return makePlaceholder(index);
  });

  // 保护 \(...\) 行内公式
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (match) => {
    const index = mathBlocks.length;
    mathBlocks.push(match);
    return makePlaceholder(index);
  });

  // 检测是否包含需要处理的LaTeX命令
  const latexCommands = [
    '\\documentclass',
    '\\title',
    '\\author',
    '\\date',
    '\\maketitle',
    '\\begin{document}',
    '\\section',
    '\\subsection',
    '\\subsubsection',
    '\\chapter',
    '\\paragraph',
    '\\textbf',
    '\\textit',
    '\\emph',
    '\\underline',
    '\\texttt',
    '\\textsc',
    '\\textrm',
    '\\textsf',
    '\\textsl',
    '\\textup',
    '\\textcolor',
    '\\begin{itemize}',
    '\\begin{enumerate}',
    '\\begin{description}',
    '\\item',
    '\\medskip',
    '\\bigskip',
    '\\smallskip',
    '\\par',
    '\\newline',
    '\\centering',
    '\\begin{center}',
    '\\begin{quote}',
    '\\begin{abstract}',
    '\\begin{theorem}',
    '\\begin{proof}',
    '\\begin{definition}',
    '\\begin{example}',
    '\\begin{note}',
    '\\begin{remark}',
    '\\begin{figure}',
    '\\begin{table}',
    '\\begin{tabular}',
    '\\begin{cases}',
    '\\begin{aligned}',
    '\\begin{gather}',
    '\\begin{split}',
    '\\begin{multline}',
    '\\begin{array}',
    '\\begin{matrix}',
    '\\begin{pmatrix}',
    '\\begin{bmatrix}',
    '\\begin{vmatrix}',
    '\\begin{Vmatrix}',
    // 行距命令（网页不支持，需要移除）
    '\\onehalfspacing',
    '\\doublespacing',
    '\\singlespacing',
    '\\setstretch',
    '\\linespread',
    '\\caption',
    '\\label',
    '\\ref',
    '\\cite',
    '\\footnote',
    '\\noindent',
    '\\indent',
    '\\hfill',
    '\\vfill',
    '\\quad',
    '\\qquad',
    '\\hspace',
    '\\vspace',
    '\\LaTeX',
    '\\TeX',
    '\\ldots',
    '\\dots',
    '\\cdot',
    '\\times',
    '\\div',
    '\\pm',
    '\\mp',
    '\\leq',
    '\\geq',
    '\\neq',
    '\\approx',
    '\\equiv',
    '\\in',
    '\\notin',
    '\\subset',
    '\\supset',
    '\\subseteq',
    '\\supseteq',
    '\\cup',
    '\\cap',
    '\\setminus',
    '\\emptyset',
    '\\forall',
    '\\exists',
    '\\infty',
    '\\alpha',
    '\\beta',
    '\\gamma',
    '\\delta',
    '\\theta',
    '\\lambda',
    '\\mu',
    '\\pi',
    '\\sigma',
    '\\omega',
    '\\sum',
    '\\prod',
    '\\int',
    '\\frac',
    '\\sqrt',
    '\\overline',
    '\\vec',
    '\\hat',
    '\\tilde',
    '\\bar',
    '\\dot',
    '\\ddot',
    '\\text',
    '\\mbox',
    '\\mathbf',
    '\\mathit',
    '\\mathrm',
    '\\mathbb',
    '\\mathcal',
    '\\mathfrak',
    '\\left',
    '\\right',
    // 箭头符号
    '\\rightarrow',
    '\\leftarrow',
    '\\Rightarrow',
    '\\Leftarrow',
    '\\leftrightarrow',
    '\\Leftrightarrow',
    '\\uparrow',
    '\\downarrow',
    '\\Uparrow',
    '\\Downarrow',
    // 三角函数
    '\\sin',
    '\\cos',
    '\\tan',
    '\\cot',
    '\\sec',
    '\\csc',
    '\\arcsin',
    '\\arccos',
    '\\arctan',
    // 极限和对数
    '\\lim',
    '\\log',
    '\\ln',
    '\\exp',
    '\\max',
    '\\min',
    '\\sup',
    '\\inf',
    // 其他常用符号
    '\\angle',
    '\\triangle',
    '\\partial',
    '\\nabla',
    // 圆圈符号（摄氏度等）
    '\\circ',
  ];

  const hasLatexCommands = latexCommands.some((cmd) => content.includes(cmd));

  if (!hasLatexCommands) return content;

  // ========== 辅助函数：处理嵌套花括号 ==========
  const extractBraceContent = (
    str: string,
    startIndex: number
  ): { content: string; endIndex: number } | null => {
    if (str[startIndex] !== '{') return null;
    let depth = 0;
    let i = startIndex;
    while (i < str.length) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') depth--;
      if (depth === 0) {
        return {
          content: str.substring(startIndex + 1, i),
          endIndex: i,
        };
      }
      i++;
    }
    return null;
  };

  // ========== 辅助函数：处理支持嵌套的LaTeX命令 ==========
  const processNestedCommand = (
    text: string,
    command: string,
    wrapper: (content: string) => string
  ): string => {
    const cmdPattern = new RegExp(`\\\\${command.replace('\\', '\\\\')}\\s*\\{`, 'g');
    let result = text;
    let match;

    // 循环处理直到没有更多匹配
    let maxIterations = 100; // 防止无限循环
    while (maxIterations-- > 0) {
      cmdPattern.lastIndex = 0;
      match = cmdPattern.exec(result);
      if (!match) break;

      const startIndex = match.index;
      const braceStartIndex = match.index + match[0].length - 1;
      const extracted = extractBraceContent(result, braceStartIndex);

      if (extracted) {
        const replacement = wrapper(extracted.content);
        result =
          result.substring(0, startIndex) + replacement + result.substring(extracted.endIndex + 1);
      } else {
        // 如果无法提取花括号内容，跳过这个匹配
        break;
      }
    }

    return result;
  };

  // ========== 1. 移除LaTeX文档类声明 ==========
  result = result.replace(/\\documentclass\s*(\[[^\]]*\])?\s*\{[^}]*\}/g, '');

  // ========== 2. 移除usepackage声明 ==========
  result = result.replace(/\\usepackage\s*(\[[^\]]*\])?\s*\{[^}]*\}/g, '');

  // ========== 3. 移除文档设置命令 ==========
  result = result.replace(/\\geometry\s*\{[^}]*\}/g, '');
  result = result.replace(/\\setstretch\s*\{[^}]*\}/g, '');
  result = result.replace(
    /\\(pagestyle|thispagestyle|pagenumbering|setlength|renewcommand|newcommand|definecolor)\s*(\[[^\]]*\])?\s*\{[^}]*\}/g,
    ''
  );

  // ========== 3.5 处理标题命令 ==========
  // \title{...} -> # ... (一级标题)
  result = result.replace(/\\title\s*\{([^}]*)\}/g, '\n# $1\n');
  // \author{...} -> 斜体作者行
  result = result.replace(/\\author\s*\{([^}]*)\}/g, (match, author) => {
    return author.trim() ? `\n*${author.trim()}*\n` : '';
  });
  // \date{...} -> 日期行
  result = result.replace(/\\date\s*\{([^}]*)\}/g, (match, date) => {
    return date.trim() ? `\n${date.trim()}\n` : '';
  });
  // \maketitle -> 移除（标题已由上面的命令处理）
  result = result.replace(/\\maketitle\s*/g, '\n');

  // ========== 4. 移除\begin{document}和\end{document} ==========
  result = result.replace(/\\begin\{document\}/g, '');
  result = result.replace(/\\end\{document\}/g, '');

  // ========== 5. 转换章节命令为Markdown标题 ==========
  result = result.replace(/\\chapter\s*\*\s*\{([^}]*)\}/g, '\n# $1\n');
  result = result.replace(/\\chapter\s*\{([^}]*)\}/g, '\n# $1\n');
  result = result.replace(/\\section\s*\*\s*\{([^}]*)\}/g, '\n## $1\n');
  result = result.replace(/\\section\s*\{([^}]*)\}/g, '\n## $1\n');
  result = result.replace(/\\subsection\s*\*\s*\{([^}]*)\}/g, '\n### $1\n');
  result = result.replace(/\\subsection\s*\{([^}]*)\}/g, '\n### $1\n');
  result = result.replace(/\\subsubsection\s*\*\s*\{([^}]*)\}/g, '\n#### $1\n');
  result = result.replace(/\\subsubsection\s*\{([^}]*)\}/g, '\n#### $1\n');
  result = result.replace(/\\paragraph\s*\{([^}]*)\}/g, '\n##### $1\n');
  result = result.replace(/\\subparagraph\s*\{([^}]*)\}/g, '\n###### $1\n');

  // ========== 6. 处理文本格式命令（支持嵌套）==========
  // 使用 processNestedCommand 处理可能嵌套的命令
  result = processNestedCommand(result, 'textbf', (c) => `**${c}**`);
  result = processNestedCommand(result, 'textit', (c) => `*${c}*`);
  result = processNestedCommand(result, 'emph', (c) => `*${c}*`);
  result = processNestedCommand(result, 'underline', (c) => `<u>${c}</u>`);
  result = processNestedCommand(result, 'texttt', (c) => `\`${c}\``);
  result = processNestedCommand(
    result,
    'textsc',
    (c) => `<span style="font-variant: small-caps">${c}</span>`
  );
  result = processNestedCommand(result, 'textrm', (c) => c);
  result = processNestedCommand(result, 'textsf', (c) => c);
  result = processNestedCommand(result, 'textsl', (c) => `*${c}*`);
  result = processNestedCommand(result, 'textup', (c) => c);

  // \textcolor{color}{text} -> text（移除颜色命令，保留文本）
  result = result.replace(/\\textcolor\s*\{[^}]*\}\s*\{([^}]*)\}/g, '$1');

  // ========== 7. 处理数学字体命令（支持嵌套）==========
  result = processNestedCommand(result, 'mathbf', (c) => `**${c}**`);
  result = processNestedCommand(result, 'mathit', (c) => `*${c}*`);
  result = processNestedCommand(result, 'mathrm', (c) => c);
  result = processNestedCommand(result, 'mathbb', (c) => c);
  result = processNestedCommand(result, 'mathcal', (c) => c);
  result = processNestedCommand(result, 'mathfrak', (c) => c);

  // ========== 8. 处理换行和间距命令 ==========
  result = result.replace(/\\\\\s*/g, '\n\n');
  result = result.replace(/\\newline\s*/g, '\n');
  result = result.replace(/\\par\s*/g, '\n\n');
  result = result.replace(/\\medskip\s*/g, '\n\n');
  result = result.replace(/\\bigskip\s*/g, '\n\n');
  result = result.replace(/\\smallskip\s*/g, '\n');
  result = result.replace(/\\vspace\s*\{[^}]*\}/g, '\n');
  result = result.replace(/\\hspace\s*\{[^}]*\}/g, ' ');
  result = result.replace(/\\quad\s*/g, '  ');
  result = result.replace(/\\qquad\s*/g, '    ');
  result = result.replace(/\\hfill\s*/g, ' ');
  result = result.replace(/\\vfill\s*/g, '\n');
  result = result.replace(/\\noindent\s*/g, '');
  result = result.replace(/\\indent\s*/g, '');

  // ========== 9. 移除行距命令（网页不支持） ==========
  result = result.replace(/\\onehalfspacing\s*/g, '');
  result = result.replace(/\\doublespacing\s*/g, '');
  result = result.replace(/\\singlespacing\s*/g, '');
  result = result.replace(/\\setstretch\s*\{[^}]*\}/g, '');
  result = result.replace(/\\linespread\s*\{[^}]*\}/g, '');

  // ========== 10. 处理列表环境 ==========
  // 无序列表
  result = result.replace(/\\begin\{itemize\}/g, '\n');
  result = result.replace(/\\end\{itemize\}/g, '\n');

  // 有序列表 - 需要特殊处理以保持编号
  const enumeratePattern = /\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g;
  result = result.replace(enumeratePattern, (match, content) => {
    // 处理 enumerate 内部的 \item
    let itemIndex = 0;
    return content.replace(/\\item\s*/g, () => {
      itemIndex++;
      return `${itemIndex}. `;
    });
  });

  // 描述列表
  result = result.replace(/\\begin\{description\}/g, '\n');
  result = result.replace(/\\end\{description\}/g, '\n');

  // 处理 \item 命令，移除前面的缩进（防止 Markdown 解析为代码块）
  // Markdown 规则：4个或更多空格开头会被解析为代码块
  // 需要在行首的 \item 前面的缩进移除
  result = result.replace(/^[ \t]+\\item\s*/gm, '- ');
  // 处理非行首的 \item
  result = result.replace(/\\item\s*/g, '- ');
  // 处理带标签的item: \item[label] -> **label**
  result = result.replace(/^[ \t]+\\item\s*\[([^\]]*)\]\s*/gm, '- **$1**: ');
  result = result.replace(/\\item\s*\[([^\]]*)\]\s*/g, '- **$1**: ');

  // ========== 10. 处理引用和特殊环境 ==========
  // 使用 HTML 标签而不是 Markdown 语法，避免 > 符号被错误解析
  result = result.replace(/\\begin\{quote\}/g, '\n<blockquote>');
  result = result.replace(/\\end\{quote\}/g, '</blockquote>\n');
  result = result.replace(/\\begin\{abstract\}/g, '\n<blockquote><strong>Abstract:</strong>\n');
  result = result.replace(/\\end\{abstract\}/g, '\n</blockquote>\n');
  result = result.replace(/\\begin\{theorem\}/g, '\n<blockquote><strong>Theorem:</strong>\n');
  result = result.replace(/\\end\{theorem\}/g, '\n</blockquote>\n');
  result = result.replace(/\\begin\{proof\}/g, '\n<blockquote><strong>Proof:</strong>\n');
  result = result.replace(/\\end\{proof\}/g, '\n</blockquote>\n');
  result = result.replace(/\\begin\{definition\}/g, '\n<blockquote><strong>Definition:</strong>\n');
  result = result.replace(/\\end\{definition\}/g, '\n</blockquote>\n');
  result = result.replace(/\\begin\{example\}/g, '\n<blockquote><strong>Example:</strong>\n');
  result = result.replace(/\\end\{example\}/g, '\n</blockquote>\n');
  result = result.replace(/\\begin\{note\}/g, '\n<blockquote><strong>Note:</strong>\n');
  result = result.replace(/\\end\{note\}/g, '\n</blockquote>\n');
  result = result.replace(/\\begin\{remark\}/g, '\n<blockquote><strong>Remark:</strong>\n');
  result = result.replace(/\\end\{remark\}/g, '\n</blockquote>\n');

  // ========== 11. 处理居中环境 ==========
  result = result.replace(/\\begin\{center\}/g, '\n');
  result = result.replace(/\\end\{center\}/g, '\n');
  result = result.replace(/\\centering\s*/g, '');

  // ========== 12. 处理表格环境 ==========
  result = result.replace(/\\begin\{figure\}[\s\S]*?\\end\{figure\}/g, (match) => {
    // 提取caption
    const captionMatch = match.match(/\\caption\s*\{([^}]*)\}/);
    return captionMatch ? `\n*[Figure: ${captionMatch[1]}]*\n` : '';
  });
  result = result.replace(/\\begin\{table\}/g, '\n');
  result = result.replace(/\\end\{table\}/g, '\n');
  result = result.replace(/\\begin\{tabular\}[^}]*\}/g, '\n');
  result = result.replace(/\\end\{tabular\}/g, '\n');
  result = result.replace(/\\hline\s*/g, '|');
  result = result.replace(/\\caption\s*\{([^}]*)\}/g, '\n*$1*\n');

  // ========== 13. 处理引用和脚注 ==========
  result = result.replace(/\\label\s*\{[^}]*\}/g, '');
  result = result.replace(/\\ref\s*\{([^}]*)\}/g, '[$1]');
  result = result.replace(/\\cite\s*\{([^}]*)\}/g, '[$1]');
  result = result.replace(/\\footnote\s*\{([^}]*)\}/g, '^[1]');

  // ========== 14. 处理常见LaTeX符号和命令 ==========
  result = result.replace(/\\LaTeX\s*/g, 'LaTeX');
  result = result.replace(/\\TeX\s*/g, 'TeX');
  result = result.replace(/\\ldots\s*/g, '...');
  result = result.replace(/\\dots\s*/g, '...');
  result = result.replace(/\\cdots\s*/g, '···');

  // ========== 15. 处理数学符号（转换为Unicode或保留） ==========
  // 关系符号
  result = result.replace(/\\leq\s*/g, '≤');
  result = result.replace(/\\geq\s*/g, '≥');
  result = result.replace(/\\neq\s*/g, '≠');
  result = result.replace(/\\ne\s*/g, '≠');
  result = result.replace(/\\approx\s*/g, '≈');
  result = result.replace(/\\equiv\s*/g, '≡');
  result = result.replace(/\\sim\s*/g, '∼');
  result = result.replace(/\\simeq\s*/g, '≃');
  result = result.replace(/\\cong\s*/g, '≅');
  result = result.replace(/\\propto\s*/g, '∝');

  // 集合符号
  // 注意：\in 需要确保是LaTeX命令格式（前面有反斜杠，后面有边界）
  result = result.replace(/\\in(?![a-zA-Z])/g, '∈');
  result = result.replace(/\\notin\s*/g, '∉');
  result = result.replace(/\\subset\s*/g, '⊂');
  result = result.replace(/\\supset\s*/g, '⊃');
  result = result.replace(/\\subseteq\s*/g, '⊆');
  result = result.replace(/\\supseteq\s*/g, '⊇');
  result = result.replace(/\\cup\s*/g, '∪');
  result = result.replace(/\\cap\s*/g, '∩');
  // \setminus 使用 ∖ 符号（不是普通反斜杠）
  result = result.replace(/\\setminus\s*/g, '∖');
  result = result.replace(/\\emptyset\s*/g, '∅');
  result = result.replace(/\\varnothing\s*/g, '∅');

  // 逻辑符号
  result = result.replace(/\\forall\s*/g, '∀');
  result = result.replace(/\\exists\s*/g, '∃');
  result = result.replace(/\\neg\s*/g, '¬');
  result = result.replace(/\\land\s*/g, '∧');
  result = result.replace(/\\lor\s*/g, '∨');
  result = result.replace(/\\implies\s*/g, '⇒');
  result = result.replace(/\\iff\s*/g, '⇔');

  // 运算符号
  result = result.replace(/\\cdot\s*/g, '·');
  result = result.replace(/\\times\s*/g, '×');
  result = result.replace(/\\div\s*/g, '÷');
  result = result.replace(/\\pm\s*/g, '±');
  result = result.replace(/\\mp\s*/g, '∓');
  // 圆圈符号（用于摄氏度等）
  result = result.replace(/\\circ\s*/g, '°');

  // 处理 \t（制表符，不是有效的 LaTeX 命令，移除或转换为空格）
  result = result.replace(/\\t(?![a-zA-Z])/g, ' ');

  // 其他符号
  result = result.replace(/\\infty\s*/g, '∞');
  result = result.replace(/\\partial\s*/g, '∂');
  result = result.replace(/\\nabla\s*/g, '∇');
  result = result.replace(/\\sum\s*/g, 'Σ');
  result = result.replace(/\\prod\s*/g, 'Π');
  result = result.replace(/\\int\s*/g, '∫');

  // 箭头符号
  result = result.replace(/\\rightarrow\s*/g, '→');
  result = result.replace(/\\leftarrow\s*/g, '←');
  result = result.replace(/\\Rightarrow\s*/g, '⇒');
  result = result.replace(/\\Leftarrow\s*/g, '⇐');
  result = result.replace(/\\leftrightarrow\s*/g, '↔');
  result = result.replace(/\\Leftrightarrow\s*/g, '⇔');
  result = result.replace(/\\uparrow\s*/g, '↑');
  result = result.replace(/\\downarrow\s*/g, '↓');
  result = result.replace(/\\Uparrow\s*/g, '⇑');
  result = result.replace(/\\Downarrow\s*/g, '⇓');

  // 三角函数和角度
  result = result.replace(/\\sin\s*/g, 'sin');
  result = result.replace(/\\cos\s*/g, 'cos');
  result = result.replace(/\\tan\s*/g, 'tan');
  result = result.replace(/\\cot\s*/g, 'cot');
  result = result.replace(/\\sec\s*/g, 'sec');
  result = result.replace(/\\csc\s*/g, 'csc');
  result = result.replace(/\\arcsin\s*/g, 'arcsin');
  result = result.replace(/\\arccos\s*/g, 'arccos');
  result = result.replace(/\\arctan\s*/g, 'arctan');
  result = result.replace(/\\angle\s*/g, '∠');

  // 极限和对数
  result = result.replace(/\\lim\s*/g, 'lim');
  result = result.replace(/\\log\s*/g, 'log');
  result = result.replace(/\\ln\s*/g, 'ln');
  result = result.replace(/\\exp\s*/g, 'exp');
  result = result.replace(/\\max\s*/g, 'max');
  result = result.replace(/\\min\s*/g, 'min');
  result = result.replace(/\\sup\s*/g, 'sup');
  result = result.replace(/\\inf\s*/g, 'inf');

  // 括号缩放
  result = result.replace(/\\left\s*(?=[([{])/g, '');
  result = result.replace(/\\right\s*(?=[)\]}])/g, '');

  // 上下标 Unicode 转换（简单情况）
  // 上标数字
  const superscriptMap: { [key: string]: string } = {
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
    '+': '⁺',
    '-': '⁻',
    '=': '⁼',
    '(': '⁽',
    ')': '⁾',
    n: 'ⁿ',
    i: 'ⁱ',
  };
  // 下标数字
  const subscriptMap: { [key: string]: string } = {
    '0': '₀',
    '1': '₁',
    '2': '₂',
    '3': '₃',
    '4': '₄',
    '5': '₅',
    '6': '₆',
    '7': '₇',
    '8': '₈',
    '9': '₉',
    '+': '₊',
    '-': '₋',
    '=': '₌',
    '(': '₍',
    ')': '₎',
    a: 'ₐ',
    e: 'ₑ',
    h: 'ₕ',
    i: 'ᵢ',
    j: 'ⱼ',
    k: 'ₖ',
    l: 'ₗ',
    m: 'ₘ',
    n: 'ₙ',
    o: 'ₒ',
    p: 'ₚ',
    r: 'ᵣ',
    s: 'ₛ',
    t: 'ₜ',
    u: 'ᵤ',
    v: 'ᵥ',
    x: 'ₓ',
  };

  // 处理简单上标 ^{...} 或 ^x（单个字符）
  result = result.replace(/\^\{([0-9+\-=()]+)\}/g, (_, chars) => {
    return chars
      .split('')
      .map((c: string) => superscriptMap[c] || c)
      .join('');
  });
  result = result.replace(/\^([0-9+\-=()n])/g, (_, char) => superscriptMap[char] || `^${char}`);

  // 处理简单下标 _{...} 或 _x（单个字符）
  result = result.replace(/_\{([0-9+\-=()a-z]+)\}/g, (_, chars) => {
    return chars
      .split('')
      .map((c: string) => subscriptMap[c] || c)
      .join('');
  });
  result = result.replace(/_([0-9+\-=()a-z])/g, (_, char) => subscriptMap[char] || `_${char}`);

  // 希腊字母
  result = result.replace(/\\alpha\s*/g, 'α');
  result = result.replace(/\\beta\s*/g, 'β');
  result = result.replace(/\\gamma\s*/g, 'γ');
  result = result.replace(/\\delta\s*/g, 'δ');
  result = result.replace(/\\epsilon\s*/g, 'ε');
  result = result.replace(/\\varepsilon\s*/g, 'ε');
  result = result.replace(/\\zeta\s*/g, 'ζ');
  result = result.replace(/\\eta\s*/g, 'η');
  result = result.replace(/\\theta\s*/g, 'θ');
  result = result.replace(/\\vartheta\s*/g, 'θ');
  result = result.replace(/\\iota\s*/g, 'ι');
  result = result.replace(/\\kappa\s*/g, 'κ');
  result = result.replace(/\\lambda\s*/g, 'λ');
  result = result.replace(/\\mu\s*/g, 'μ');
  result = result.replace(/\\nu\s*/g, 'ν');
  result = result.replace(/\\xi\s*/g, 'ξ');
  result = result.replace(/\\pi\s*/g, 'π');
  result = result.replace(/\\varpi\s*/g, 'π');
  result = result.replace(/\\rho\s*/g, 'ρ');
  result = result.replace(/\\varrho\s*/g, 'ρ');
  result = result.replace(/\\sigma\s*/g, 'σ');
  result = result.replace(/\\varsigma\s*/g, 'ς');
  result = result.replace(/\\tau\s*/g, 'τ');
  result = result.replace(/\\upsilon\s*/g, 'υ');
  result = result.replace(/\\phi\s*/g, 'φ');
  result = result.replace(/\\varphi\s*/g, 'φ');
  result = result.replace(/\\chi\s*/g, 'χ');
  result = result.replace(/\\psi\s*/g, 'ψ');
  result = result.replace(/\\omega\s*/g, 'ω');

  // 大写希腊字母
  result = result.replace(/\\Gamma\s*/g, 'Γ');
  result = result.replace(/\\Delta\s*/g, 'Δ');
  result = result.replace(/\\Theta\s*/g, 'Θ');
  result = result.replace(/\\Lambda\s*/g, 'Λ');
  result = result.replace(/\\Xi\s*/g, 'Ξ');
  result = result.replace(/\\Pi\s*/g, 'Π');
  result = result.replace(/\\Sigma\s*/g, 'Σ');
  result = result.replace(/\\Phi\s*/g, 'Φ');
  result = result.replace(/\\Psi\s*/g, 'Ψ');
  result = result.replace(/\\Omega\s*/g, 'Ω');

  // ========== 16. 处理数学结构命令（支持嵌套）==========
  // 注意：\frac, \sqrt 等数学命令如果在 $...$ 或 $$...$$ 等公式分隔符内，
  // 应该保留给 MathJax 渲染，而不是在这里转换为 Unicode 字符
  // 这些命令的转换已移除，由 MathJax 正确渲染

  // 保留 \frac 和 \sqrt 命令，让 MathJax 处理
  // 以下代码已被移除，因为会导致公式渲染问题：
  // - \frac{a}{b} -> (a/b)
  // - \sqrt{x} -> √(x)
  // - \sqrt[n]{x} -> ⁿ√(x)

  // 向量和修饰符号（支持嵌套）
  result = processNestedCommand(result, 'vec', (c) => `${c}⃗`);
  result = processNestedCommand(result, 'hat', (c) => `${c}̂`);
  result = processNestedCommand(result, 'tilde', (c) => `${c}̃`);
  result = processNestedCommand(result, 'bar', (c) => `${c}̄`);
  result = processNestedCommand(result, 'dot', (c) => `${c}̇`);
  result = processNestedCommand(result, 'ddot', (c) => `${c}̈`);
  result = processNestedCommand(result, 'overline', (c) => `${c}̄`);

  // 注意：underline 已在上面处理过了

  // ========== 17. 处理特殊命令 ==========
  // \text{...} 在数学模式中的文本（支持嵌套）
  result = processNestedCommand(result, 'text', (c) => c);

  // \mbox{...}
  result = processNestedCommand(result, 'mbox', (c) => c);

  // \left 和 \right（移除，因为用于自动调整括号大小）
  result = result.replace(/\\left\s*/g, '');
  result = result.replace(/\\right\s*/g, '');

  // ========== 18. 处理更多数学环境 ==========
  // \begin{cases}...\end{cases} -> 条件表达式
  result = result.replace(/\\begin\{cases\}/g, '\n```\n');
  result = result.replace(/\\end\{cases\}/g, '\n```\n');

  // \begin{aligned}...\end{aligned} -> 对齐环境
  result = result.replace(/\\begin\{aligned\}/g, '\n');
  result = result.replace(/\\end\{aligned\}/g, '\n');

  // \begin{gather}...\end{gather} -> 聚集环境
  result = result.replace(/\\begin\{gather\}/g, '\n');
  result = result.replace(/\\end\{gather\}/g, '\n');

  // \begin{split}...\end{split} -> 分割环境
  result = result.replace(/\\begin\{split\}/g, '\n');
  result = result.replace(/\\end\{split\}/g, '\n');

  // \begin{multline}...\end{multline} -> 多行环境
  result = result.replace(/\\begin\{multline\}/g, '\n');
  result = result.replace(/\\end\{multline\}/g, '\n');

  // \begin{array}...\end{array} -> 数组环境
  result = result.replace(/\\begin\{array\}[^}]*\}/g, '\n');
  result = result.replace(/\\end\{array\}/g, '\n');

  // \begin{matrix}...\end{matrix} -> 矩阵环境（无括号）
  result = result.replace(/\\begin\{matrix\}/g, '\n');
  result = result.replace(/\\end\{matrix\}/g, '\n');

  // \begin{pmatrix}...\end{pmatrix} -> 圆括号矩阵
  result = result.replace(/\\begin\{pmatrix\}/g, '\n⎛\n');
  result = result.replace(/\\end\{pmatrix\}/g, '\n⎞\n');

  // \begin{bmatrix}...\end{bmatrix} -> 方括号矩阵
  result = result.replace(/\\begin\{bmatrix\}/g, '\n[\n');
  result = result.replace(/\\end\{bmatrix\}/g, '\n]\n');

  // \begin{vmatrix}...\end{vmatrix} -> 竖线矩阵（行列式）
  result = result.replace(/\\begin\{vmatrix\}/g, '\n|\n');
  result = result.replace(/\\end\{vmatrix\}/g, '\n|\n');

  // \begin{Vmatrix}...\end{Vmatrix} -> 双竖线矩阵
  result = result.replace(/\\begin\{Vmatrix\}/g, '\n‖\n');
  result = result.replace(/\\end\{Vmatrix\}/g, '\n‖\n');

  // 处理矩阵中的 & 分隔符和 \\ 换行符
  // 注意：只替换不在 HTML 实体中的 &（避免破坏 &nbsp; 等）
  // 使用负向回顾确保 & 前面不是字母（HTML实体格式如 &nbsp;）
  result = result.replace(/(?<![a-zA-Z])\s*&\s*(?![a-zA-Z;])/g, ' | ');
  result = result.replace(/\\\\\s*(?=\n)/g, '\n');

  // ========== 20. 处理原始内容中的 > 符号 ==========
  // 将行首的 > 转义，避免被 Markdown 解析为引用块
  // 但保留 HTML 标签中的 >
  result = result.replace(/^>[ \t]+/gm, '&gt; ');
  // 处理列表项后面的 > (如 "- item\n> description")
  result = result.replace(/(\n[ \t]*)>[ \t]+/g, '$1&gt; ');

  // ========== 21. 清理多余的空行和空白 ==========
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.trim();

  // ========== 22. 恢复被保护的公式内容 ==========
  // 将占位符替换回原始的公式内容
  mathBlocks.forEach((block, index) => {
    const placeholder = makePlaceholder(index);
    result = result.replace(placeholder, block);
  });

  return result;
}

/**
 * 检测内容是否主要包含数学公式
 * @param {string} content - 要检测的内容
 * @returns {boolean} - 是否为数学内容
 */
export function isMathContent(content: string): boolean {
  if (!content || content.trim().length === 0) return false;

  const mathIndicators = [
    // LaTeX 命令
    /\\frac\{/,
    /\\sqrt\{/,
    /\\sum/,
    /\\int/,
    /\\prod/,
    /\\lim/,
    /\\frac/,
    /\\partial/,
    /\\nabla/,
    /\\infty/,
    /\\alpha|\\beta|\\gamma|\\delta|\\theta|\\lambda|\\mu|\\pi|\\sigma|\\omega/,
    // 关系符号
    /\\leq|\\geq|\\neq|\\approx|\\equiv/,
    // 集合符号
    /\\in[^a-zA-Z]|\\subset|\\supset|\\cup|\\cap/,
    // 数学环境
    /\\begin\{equation\}/,
    /\\begin\{align\}/,
    /\\begin\{gather\}/,
    /\\begin\{matrix\}/,
    /\\begin\{cases\}/,
    // 分隔符内的复杂公式
    /\$\$[\s\S]{10,}\$\$/,
    /\\\[[\s\S]{10,}\\\]/,
  ];

  // 计算匹配的指示器数量
  let matchCount = 0;
  for (const pattern of mathIndicators) {
    if (pattern.test(content)) {
      matchCount++;
      if (matchCount >= 2) return true; // 至少匹配2个数学指示器
    }
  }

  // 检查是否有高密度的数学符号
  const mathSymbolPattern = /[∈∉⊂⊃⊆⊇∪∩∑∏∫∂∇∞≈≠≤≥≡∀∃]/g;
  const symbolMatches = content.match(mathSymbolPattern);
  if (symbolMatches && symbolMatches.length >= 3) {
    return true;
  }

  // 检查是否主要是公式内容（$ 或 \( \) 包裹的内容占比）
  const formulaPattern = /(?<!\$)\$(?!\$)[^$]+\$(?!\$)|\\\([^)]+\\\)/g;
  const formulaMatches = content.match(formulaPattern);
  if (formulaMatches) {
    const formulaLength = formulaMatches.reduce((sum, m) => sum + m.length, 0);
    if (formulaLength / content.length > 0.3) {
      return true;
    }
  }

  return false;
}

/**
 * 智能处理内容，根据内容类型选择最佳处理方式
 * @param {string} content - 要处理的内容
 * @returns {string} - 处理后的内容
 */
export function smartProcessContent(content: string): string {
  if (!content) return '';

  // 先进行 LaTeX 文档预处理
  let result = preprocessLatexDocument(content);

  // 如果检测到主要是数学内容，确保公式分隔符正确
  if (isMathContent(result)) {
    // 确保公式周围有适当空格
    result = result.replace(/([^\s$])\$/g, '$1 $');
    result = result.replace(/\$([^\s])/g, ' $1');
  }

  return result;
}

/**
 * 处理 Markdown 表格中的 LaTeX 公式
 * @param {string} tableContent - Markdown 表格内容
 * @returns {string} - 处理后的表格内容
 */
export function processMarkdownTable(tableContent: string): string {
  if (!tableContent) return '';

  // 表格行的正则：| ... | ... |
  const tableRowPattern = /^\|(.+)\|$/gm;

  return tableContent.replace(tableRowPattern, (rowMatch) => {
    // 处理每个单元格中的公式
    return rowMatch.replace(/\$([^$]+)\$/g, (match, formula) => {
      // 对公式进行预处理
      const processed = preprocessLatexDocument(formula);
      return `$${processed}$`;
    });
  });
}

/**
 * 清理 LaTeX 公式中的无效语法
 * @param {string} formula - LaTeX 公式
 * @returns {string} - 清理后的公式
 */
export function sanitizeLatexFormula(formula: string): string {
  if (!formula) return '';

  let result = formula;

  // 移除未闭合的环境
  const envPattern = /\\begin\{([^}]+)\}(?![\s\S]*?\\end\{\1\})/g;
  result = result.replace(envPattern, '');

  // 修复未闭合的花括号
  let braceCount = 0;
  let cleaned = '';
  for (let i = 0; i < result.length; i++) {
    if (result[i] === '{') braceCount++;
    else if (result[i] === '}') braceCount--;

    if (braceCount >= 0) {
      cleaned += result[i];
    }
  }

  // 添加缺失的闭合括号
  while (braceCount > 0) {
    cleaned += '}';
    braceCount--;
  }

  return cleaned;
}

/**
 * 将 LaTeX 符号转换为更易读的形式（用于纯文本显示）
 * @param {string} content - 包含 LaTeX 的内容
 * @returns {string} - 转换后的内容
 */
export function latexToReadable(content: string): string {
  if (!content) return '';

  // 使用 preprocessLatexDocument 进行基本转换
  let result = preprocessLatexDocument(content);

  // 额外的可读性优化
  const readableMap: { [key: string]: string } = {
    '\\pm': '±',
    '\\mp': '∓',
    '\\times': '×',
    '\\div': '÷',
    '\\cdot': '·',
    '\\ast': '*',
    '\\leq': '≤',
    '\\geq': '≥',
    '\\neq': '≠',
    '\\approx': '≈',
    '\\equiv': '≡',
    '\\sim': '~',
    '\\propto': '∝',
    '\\infty': '∞',
    '\\partial': '∂',
    '\\nabla': '∇',
    '\\forall': '∀',
    '\\exists': '∃',
    '\\in': '∈',
    '\\notin': '∉',
    '\\subset': '⊂',
    '\\supset': '⊃',
    '\\subseteq': '⊆',
    '\\supseteq': '⊇',
    '\\cup': '∪',
    '\\cap': '∩',
    '\\emptyset': '∅',
    '\\rightarrow': '→',
    '\\leftarrow': '←',
    '\\Rightarrow': '⇒',
    '\\Leftarrow': '⇐',
    '\\leftrightarrow': '↔',
    '\\Leftrightarrow': '⇔',
    '\\alpha': 'α',
    '\\beta': 'β',
    '\\gamma': 'γ',
    '\\delta': 'δ',
    '\\epsilon': 'ε',
    '\\theta': 'θ',
    '\\lambda': 'λ',
    '\\mu': 'μ',
    '\\pi': 'π',
    '\\sigma': 'σ',
    '\\omega': 'ω',
    '\\phi': 'φ',
    '\\sum': 'Σ',
    '\\prod': 'Π',
    '\\int': '∫',
    '\\sqrt': '√',
    '\\frac': '/',
    '\\angle': '∠',
    '\\triangle': '△',
    '\\square': '□',
    '\\ldots': '...',
    '\\cdots': '···',
  };

  Object.entries(readableMap).forEach(([latex, readable]) => {
    result = result.replace(new RegExp(latex.replace(/\\/g, '\\\\'), 'g'), readable);
  });

  return result;
}

/**
 * 处理 HTML 中 code 标签内的 markdown 语法
 * MarkdownIt 默认不解析 code 标签内的内容，此函数用于后处理
 * @param {string} html - 包含 code 标签的 HTML 内容
 * @returns {string} - 处理后的 HTML 内容
 */
export function processMarkdownInCode(html: string): string {
  if (!html) return '';

  // 统一使用正则处理（客户端和服务端都适用）
  return html.replace(/<code([^>]*)>([\s\S]*?)<\/code>/g, (match, attrs, content) => {
    // 跳过 pre 标签内的 code（真正的代码块）
    // 注意：这个正则无法检测父元素，但通常 pre>code 的 code 内容不需要处理

    const processed = processInlineMarkdown(content);

    // 如果处理后的内容包含 HTML 标签（说明有 markdown 被转换）
    // 则移除 code 标签，直接返回处理后的内容
    if (processed !== content && /<[a-z]+[^>]*>/i.test(processed)) {
      return processed;
    }

    return `<code${attrs}>${processed}</code>`;
  });
}

/**
 * 处理内联 markdown 语法（用于 code 标签内的内容）
 * @param {string} content - 要处理的内容
 * @returns {string} - 处理后的 HTML 内容
 */
function processInlineMarkdown(content: string): string {
  if (!content) return '';

  let result = content;

  // 解码 HTML 实体（MarkdownIt 会把特殊字符转义）
  result = result
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ast;/g, '*') // * 的 HTML 实体
    .replace(/&#42;/g, '*') // * 的数字实体
    .replace(/&lowbar;/g, '_') // _ 的 HTML 实体
    .replace(/&#95;/g, '_'); // _ 的数字实体

  // 处理加粗 **text** 或 __text__
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // 处理斜体 *text* 或 _text_（注意不要匹配 ** 或 __）
  result = result.replace(/(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  result = result.replace(/(?<!_)_(?!_)([^_]+)(?<!_)_(?!_)/g, '<em>$1</em>');

  // 处理删除线 ~~text~~
  result = result.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // 处理链接 [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  return result;
}

/**
 * 预处理内容中的假代码块（反引号包裹但实际是普通文本）
 * AI 生成的内容可能用反引号包裹了本应渲染的 markdown 内容或 LaTeX 命令
 * @param {string} content - 要处理的内容
 * @returns {string} - 处理后的内容
 */
export function preprocessFakeCodeBlocks(content: string): string {
  if (!content) return '';

  // 检测单行反引号内容是否包含 markdown 语法或 LaTeX 命令
  // 如果包含，则移除反引号让内容正常渲染
  const inlineCodePattern = /`([^`\n]+)`/g;

  return content.replace(inlineCodePattern, (match, codeContent) => {
    // 解码可能存在的 HTML 实体
    const decodedContent = codeContent
      .replace(/&ast;/g, '*')
      .replace(/&#42;/g, '*')
      .replace(/&lowbar;/g, '_')
      .replace(/&#95;/g, '_');

    // 检测是否包含 markdown 语法
    const hasMarkdownSyntax =
      /\*\*[^*]+\*\*/.test(decodedContent) || // **bold**
      /(?<!\*)\*[^*]+\*(?!\*)/.test(decodedContent) || // *italic*
      /__[^_]+__/.test(decodedContent) || // __bold__
      /(?<!_)_[^_]+_(?!_)/.test(decodedContent) || // _italic_
      /\[[^\]]+\]\([^)]+\)/.test(decodedContent) || // [link](url)
      /~~[^~]+~~/.test(decodedContent); // ~~strikethrough~~

    // 检测是否包含 LaTeX 命令
    // 常见的 LaTeX 命令列表
    const latexCommands = [
      // 文本格式命令
      '\\textbf',
      '\\textit',
      '\\emph',
      '\\underline',
      '\\texttt',
      '\\textsc',
      '\\textrm',
      '\\textsf',
      '\\textsl',
      '\\textup',
      '\\textcolor',
      // 数学字体命令
      '\\mathbf',
      '\\mathit',
      '\\mathrm',
      '\\mathbb',
      '\\mathcal',
      '\\mathfrak',
      // 数学结构命令
      '\\frac',
      '\\sqrt',
      '\\overline',
      '\\vec',
      '\\hat',
      '\\tilde',
      '\\bar',
      '\\dot',
      '\\ddot',
      // 数学符号
      '\\sum',
      '\\prod',
      '\\int',
      '\\lim',
      '\\infty',
      '\\partial',
      '\\nabla',
      '\\alpha',
      '\\beta',
      '\\gamma',
      '\\delta',
      '\\theta',
      '\\lambda',
      '\\mu',
      '\\pi',
      '\\sigma',
      '\\omega',
      '\\Gamma',
      '\\Delta',
      '\\Theta',
      '\\Lambda',
      '\\Xi',
      '\\Pi',
      '\\Sigma',
      '\\Phi',
      '\\Psi',
      '\\Omega',
      '\\leq',
      '\\geq',
      '\\neq',
      '\\approx',
      '\\equiv',
      '\\sim',
      '\\propto',
      '\\in',
      '\\notin',
      '\\subset',
      '\\supset',
      '\\subseteq',
      '\\supseteq',
      '\\cup',
      '\\cap',
      '\\rightarrow',
      '\\leftarrow',
      '\\Rightarrow',
      '\\Leftarrow',
      '\\leftrightarrow',
      '\\Leftrightarrow',
      '\\times',
      '\\div',
      '\\cdot',
      '\\pm',
      '\\mp',
      '\\angle',
      '\\triangle',
      '\\square',
      '\\emptyset',
      // 环境命令
      '\\begin',
      '\\end',
      // 其他常用命令
      '\\item',
      '\\label',
      '\\ref',
      '\\cite',
      '\\footnote',
      '\\quad',
      '\\qquad',
      '\\hspace',
      '\\vspace',
      '\\text',
      '\\mbox',
    ];

    const hasLatexCommand = latexCommands.some((cmd) => decodedContent.includes(cmd));

    // 检测是否包含 LaTeX 数学环境分隔符
    const hasLatexDelimiter =
      decodedContent.includes('\\(') ||
      decodedContent.includes('\\)') ||
      decodedContent.includes('\\[') ||
      decodedContent.includes('\\]') ||
      /\$[^$]+\$/.test(decodedContent) || // $...$ 行内公式
      /\$\$[^$]+\$\$/.test(decodedContent); // $$...$$ 行间公式

    // 如果包含 markdown 语法、LaTeX 命令或 LaTeX 分隔符，移除反引号
    if (hasMarkdownSyntax || hasLatexCommand || hasLatexDelimiter) {
      return decodedContent;
    }

    // 否则保留反引号
    return match;
  });
}

/**
 * 预处理多行代码块内的 markdown 语法
 * 处理 ```code 或 ```text 等非语法高亮的代码块
 * @param {string} content - 要处理的内容
 * @returns {string} - 处理后的内容
 */
export function preprocessCodeBlocks(content: string): string {
  if (!content) return '';

  // 处理非语法高亮的代码块（```text, ```plaintext, ```none 等）
  // 这些代码块内的内容应该被当作普通文本处理，而不是代码
  const plainCodeBlockPattern = /```(?:text|plaintext|none|raw)\s*\n([\s\S]*?)```/g;

  let result = content.replace(plainCodeBlockPattern, (match, codeContent) => {
    // 检测是否包含 markdown 语法
    const hasMarkdownSyntax =
      /\*\*[^*]+\*\*/.test(codeContent) ||
      /(?<!\*)\*[^*]+\*(?!\*)/.test(codeContent) ||
      /__[^_]+__/.test(codeContent) ||
      /(?<!_)_[^_]+_(?!_)/.test(codeContent) ||
      /\[[^\]]+\]\([^)]+\)/.test(codeContent);

    // 如果包含 markdown 语法，移除代码块标记
    if (hasMarkdownSyntax) {
      return codeContent;
    }

    return match;
  });

  // 同时处理单行反引号
  result = preprocessFakeCodeBlocks(result);

  return result;
}

const DEFAULT_MATHJAX_CONFIG: MathJaxConfig = {
  tex: {
    inlineMath: [
      ['$', '$'],
      ['\\(', '\\)'],
    ],
    displayMath: [
      ['$$', '$$'],
      ['\\[', '\\]'],
    ],
  },
  svg: {
    fontCache: 'global',
    displayAlign: 'left',
    scale: 1.0,
    mtextInheritFont: true,
    merrorInheritFont: true,
    mathmlSpacing: false,
    displayIndent: '0',
  },
  chtml: {
    scale: 1.0,
    mtextInheritFont: true,
    merrorInheritFont: true,
  },
};

const MATHJAX_SCRIPT_ID = 'vue-mathjax-beautiful-mathjax-script';
const MATHJAX_SCRIPT_ATTR = 'data-vue-mathjax-beautiful';

let mathJaxInitPromise: Promise<void> | null = null;
let mathJaxScriptLoadPromise: Promise<void> | null = null;

function isMathJaxAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.MathJax?.tex2svgPromise;
}

function mergeMathJaxConfig(
  ...configs: Array<Partial<MathJaxInstance> | MathJaxConfig | undefined>
): Partial<MathJaxInstance> {
  const merged: Partial<MathJaxInstance> = {};

  configs.forEach((config) => {
    if (!config) return;

    Object.assign(merged, config);
    merged.tex = { ...merged.tex, ...config.tex };
    merged.svg = { ...merged.svg, ...config.svg };
    merged.chtml = { ...merged.chtml, ...config.chtml };
    merged.options = { ...merged.options, ...config.options };
  });

  return merged;
}

function ensureMathJaxConfig(config?: MathJaxConfig): void {
  if (isMathJaxAvailable()) return;

  window.MathJax = mergeMathJaxConfig(DEFAULT_MATHJAX_CONFIG, window.MathJax, config);
}

async function waitForMathJaxReady(timeoutMs = 10000): Promise<void> {
  const startedAt = Date.now();

  while (!isMathJaxAvailable() && Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!isMathJaxAvailable()) {
    logger.error('MathJax initialization failed', {
      exists: !!window.MathJax,
      tex2svgPromise: !!window.MathJax?.tex2svgPromise,
      startup: !!window.MathJax?.startup,
      keys: window.MathJax ? Object.keys(window.MathJax) : [],
    });
    throw new Error('MathJax tex2svgPromise not available after initialization');
  }
}

/**
 * 初始化并加载MathJax
 * @param config - MathJax配置
 * @returns Promise
 */
export async function initMathJax(config?: MathJaxConfig): Promise<void> {
  if (typeof window === 'undefined') return;
  if (isMathJaxAvailable()) return;

  if (!mathJaxInitPromise) {
    ensureMathJaxConfig(config);
    mathJaxInitPromise = (async () => {
      await loadMathJax();
      await waitForMathJaxReady();
    })();
  }

  try {
    await mathJaxInitPromise;
  } catch (error) {
    mathJaxInitPromise = null;
    logger.error('Failed to initialize MathJax', error);
    throw error;
  }
}

/**
 * 本地MathJax默认路径（将 node_modules/mathjax/es5 复制到 public/mathjax）
 */
const MATHJAX_LOCAL_URLS = ['/mathjax/tex-svg.js', '/mathjax/es5/tex-svg.js'];

function getBundledAppBaseUrl(): string | null {
  if (typeof document === 'undefined') return null;

  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'));
  const entryScript = scripts.find((script) => {
    try {
      return new URL(script.src, window.location.href).pathname.includes('/assets/');
    } catch {
      return false;
    }
  });

  if (!entryScript) return null;

  const entryUrl = new URL(entryScript.src, window.location.href);
  const assetsIndex = entryUrl.pathname.lastIndexOf('/assets/');
  if (assetsIndex < 0) return null;

  entryUrl.pathname = entryUrl.pathname.slice(0, assetsIndex + 1);
  entryUrl.search = '';
  entryUrl.hash = '';

  return entryUrl.href;
}

function getLocalMathJaxUrls(): string[] {
  const urls: string[] = [];
  const appBaseUrl = getBundledAppBaseUrl();

  if (appBaseUrl) {
    urls.push(new URL('mathjax/es5/tex-svg.js', appBaseUrl).href);
  }

  urls.push('mathjax/es5/tex-svg.js', ...MATHJAX_LOCAL_URLS);

  return [...new Set(urls)];
}

/**
 * 可用的MathJax CDN列表
 */
const MATHJAX_CDNS = [
  'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js',
  'https://unpkg.com/mathjax@3/es5/tex-svg.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg.min.js',
];

/**
 * 尝试从单个URL加载MathJax
 */
function loadMathJaxFromUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${url}"]`);
    if (existingScript) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.id = MATHJAX_SCRIPT_ID;
    script.setAttribute(MATHJAX_SCRIPT_ATTR, 'true');

    const timeout = setTimeout(() => {
      logger.warn(`MathJax loading timeout for: ${url}`);
      reject(new Error(`Timeout loading MathJax from ${url}`));
    }, 10000); // 10秒超时

    script.onload = () => {
      clearTimeout(timeout);
      resolve();
    };

    script.onerror = (error) => {
      clearTimeout(timeout);
      logger.warn(`Failed to load MathJax from: ${url}`, error);
      reject(new Error(`Failed to load MathJax from ${url}`));
    };

    document.head.appendChild(script);
  });
}

function isMathJaxScript(script: HTMLScriptElement): boolean {
  if (script.getAttribute(MATHJAX_SCRIPT_ATTR) === 'true') return true;

  const src = script.getAttribute('src');
  if (!src) return false;

  try {
    const url = new URL(src, window.location.href);
    const href = url.href.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    return (
      pathname.includes('/mathjax/es5/') ||
      pathname.endsWith('/mathjax/tex-svg.js') ||
      href.includes('cdn.jsdelivr.net/npm/mathjax@') ||
      href.includes('unpkg.com/mathjax@') ||
      href.includes('cdnjs.cloudflare.com/ajax/libs/mathjax/')
    );
  } catch {
    return src.includes('/mathjax/es5/') || src.endsWith('/mathjax/tex-svg.js');
  }
}

function hasExistingMathJaxScript(): boolean {
  return Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]')).some(isMathJaxScript);
}

function removeOwnedMathJaxScript(): void {
  document
    .querySelectorAll(`script[${MATHJAX_SCRIPT_ATTR}="true"]`)
    .forEach((script) => script.remove());
}

/**
 * 加载MathJax脚本（带备用CDN）
 * @param urls - MathJax脚本URL数组
 * @returns Promise
 */
export async function loadMathJax(urls: string | string[] = getLocalMathJaxUrls()): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('MathJax can only be loaded in browser environment');
  }

  if (isMathJaxAvailable()) return;
  ensureMathJaxConfig();

  if (mathJaxScriptLoadPromise) {
    await mathJaxScriptLoadPromise;
    return;
  }

  if (hasExistingMathJaxScript()) {
    return;
  }

  // 如果只传入了一个字符串，转换为数组
  const urlList = Array.isArray(urls) ? urls : [urls];

  // 添加默认的备用CDN
  const allUrls = [...urlList, ...getLocalMathJaxUrls(), ...MATHJAX_CDNS];

  // 去重
  const uniqueUrls = [...new Set(allUrls)];

  mathJaxScriptLoadPromise = (async () => {
    // 依次尝试每个CDN
    for (const url of uniqueUrls) {
      try {
        await loadMathJaxFromUrl(url);
        return;
      } catch (error) {
        logger.warn(`Failed to load from: ${url}`, error);
        removeOwnedMathJaxScript();
      }
    }

    throw new Error('Failed to load MathJax from all available CDNs');
  })();

  try {
    await mathJaxScriptLoadPromise;
  } catch (error) {
    mathJaxScriptLoadPromise = null;
    throw error;
  }
}
