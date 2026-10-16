<script setup lang="ts">
import { ref } from 'vue';
import { VueMathjaxEditor } from '../../packages/core/src';

const content = ref('LEFT RIGHT');
</script>

<template>
  <main style="max-width: 1000px; margin: 24px auto; font-family: sans-serif">
    <h1>富文本插入回归验证</h1>
    <p>使用真实 VueMathjaxEditor 和本地 MathJax，检查图片、公式与光标。</p>
    <VueMathjaxEditor
      v-model="content"
      :formula-editor-props="{ showSymbols: false, showFormulaExamples: false }"
    />
    <h2>同步内容</h2>
    <pre style="white-space: pre-wrap">{{ content }}</pre>
  </main>
</template>
