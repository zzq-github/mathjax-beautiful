<template>
  <section
    id="editor"
    class="py-20"
  >
    <div class="container mx-auto px-4">
      <div class="text-center mb-16">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100/80 dark:bg-blue-900/80 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50 mb-6">
          <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span class="text-sm font-medium text-blue-700 dark:text-blue-300">{{ t('demo.title') }}</span>
        </div>
        
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl transition-colors duration-300 mb-4">
          {{ t('demo.title') }}
        </h2>
        <p class="mt-4 text-lg text-gray-600 dark:text-gray-300 transition-colors duration-300 max-w-3xl mx-auto">
          {{ t('demo.description') }}
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-4">
          <div class="flex items-center gap-2 px-4 py-2 bg-purple-100/80 dark:bg-purple-900/80 backdrop-blur-sm border border-purple-200/50 dark:border-purple-700/50 rounded-full">
            <CalculatorIcon class="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span class="text-sm font-medium text-purple-800 dark:text-purple-300">{{ t('demo.professionalEditor') }}</span>
          </div>
        </div>
      </div>

      <!-- 公式编辑器 - 优先展示 -->
      <div class="mb-8 sm:mb-12 overflow-hidden rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-300">
        <div class="bg-gradient-to-r from-purple-50/80 to-pink-50/80 dark:from-purple-900/40 dark:to-pink-900/40 backdrop-blur-sm px-4 sm:px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 transition-colors duration-300">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex-shrink-0 shadow-lg">
                <CalculatorIcon class="h-5 w-5" />
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="text-base sm:text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                  {{ t('demo.formulaEditor.title') }}
                </h3>
                <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300 mt-0.5">
                  {{ t('demo.formulaEditor.description') }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span class="inline-flex items-center rounded-full bg-purple-100/80 dark:bg-purple-900/50 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:text-purple-300 border border-purple-200/50 dark:border-purple-700/50 transition-colors duration-300">
                {{ t('demo.formulaEditor.inlineMode') }}
              </span>
              <span class="inline-flex items-center rounded-full bg-green-100/80 dark:bg-green-900/50 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-300 border border-green-200/50 dark:border-green-700/50 transition-colors duration-300">
                {{ t('demo.formulaEditor.realTimePreview') }}
              </span>
            </div>
          </div>
        </div>
        <div class="p-4 sm:p-6">
          <!-- 使用 VueMathjaxBeautiful 组件 -->
          <VueMathjaxBeautiful
            :inline-mode="true"
            :theme="isDark ? 'dark' : 'light'"
            :theme-config="config?.themeConfig"
            :symbol-width="40"
            :symbol-height="40"
            :symbol-gap="5"
            @insert="$emit('formulaInsert', $event)"
          />
          <div class="mt-6 p-4 bg-blue-50/80 dark:bg-blue-900/40 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50 rounded-xl transition-colors duration-300">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mt-0.5 shadow-sm">
                <span class="text-white text-xs font-bold">💡</span>
              </div>
              <div class="text-sm text-blue-800 dark:text-blue-200 transition-colors duration-300">
                <p class="font-medium mb-2">
                  {{ t('demo.formulaEditor.tips.title') }}
                </p>
                <ul class="space-y-1.5 text-blue-700 dark:text-blue-300 transition-colors duration-300">
                  <li class="flex items-start gap-2">
                    <span class="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <span>{{ t('demo.formulaEditor.tips.clickSymbols') }}</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <span>{{ t('demo.formulaEditor.tips.latexSupport') }}</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <span>{{ t('demo.formulaEditor.tips.realTime') }}</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <span>{{ t('demo.formulaEditor.tips.modes') }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 富文本编辑器 - 暂时隐藏 -->
      <!-- <div class="overflow-hidden rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-300">
        ... 富文本编辑器内容 ...
      </div> -->
    </div>
  </section>
</template>

<script setup lang="ts">
import { Calculator as CalculatorIcon } from 'lucide-vue-next';
import { VueMathjaxBeautiful } from 'vue-mathjax-beautiful';
import { useI18n } from '../../composables/useI18n';

// 国际化功能
const { t } = useI18n();

// Props
defineProps<{
  isDark: boolean;
  config?: {
    themeConfig?: {
      light?: {
        primary?: string;
        secondary?: string;
        accent?: string;
        button?: string;
        buttonHover?: string;
        buttonText?: string;
        dialogBackground?: string;
        inputBackground?: string;
        inputBorder?: string;
      };
      dark?: {
        primary?: string;
        secondary?: string;
        accent?: string;
        button?: string;
        buttonHover?: string;
        buttonText?: string;
        dialogBackground?: string;
        inputBackground?: string;
        inputBorder?: string;
      };
    };
  };
}>();

// Emits
defineEmits<{
  formulaInsert: [latex: string];
}>();
</script> 