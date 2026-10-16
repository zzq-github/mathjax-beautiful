import { createApp } from 'vue';
import { loadMathJax } from '../../packages/core/src';
import App from './App.vue';

await loadMathJax('/mathjax/es5/tex-svg.js');
createApp(App).mount('#app');
