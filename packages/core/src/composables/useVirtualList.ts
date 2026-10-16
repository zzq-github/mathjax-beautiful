import { ref, computed, onUnmounted, type Ref } from 'vue';

export interface VirtualListOptions {
  itemHeight: number;
  overscan?: number;
  containerHeight?: number;
}

export interface VirtualGridOptions extends VirtualListOptions {
  columnCount: number;
  gap?: number;
  /**
   * 固定单元格宽度（px）。
   * 传入后按像素定位与定宽渲染，不传则按容器宽度百分比均分。
   */
  itemWidth?: number;
}

/** 支持传入配置对象或返回配置的函数，后者可跟随外部状态（如 props）实时变化 */
export type VirtualGridOptionsSource = VirtualGridOptions | (() => VirtualGridOptions);

export interface VirtualListItem<T> {
  data: T;
  index: number;
}

export interface VirtualGridItem<T> extends VirtualListItem<T> {
  row: number;
  col: number;
}

/**
 * 虚拟列表组合式函数
 * 用于优化大量数据的渲染性能
 */
export function useVirtualList<T>(
  list: Ref<T[]>,
  options: VirtualListOptions
) {
  const { itemHeight, overscan = 5, containerHeight = 300 } = options;
  
  const containerRef = ref<HTMLElement | null>(null);
  const scrollTop = ref(0);
  
  // 计算可见范围
  const visibleRange = computed(() => {
    const totalHeight = list.value.length * itemHeight;
    const start = Math.floor(scrollTop.value / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    
    // 添加 overscan 缓冲
    const startIndex = Math.max(0, start - overscan);
    const endIndex = Math.min(list.value.length, start + visibleCount + overscan);
    
    return {
      start: startIndex,
      end: endIndex,
      totalHeight,
      offsetY: startIndex * itemHeight,
    };
  });
  
  // 可见列表项
  const visibleItems = computed<VirtualListItem<T>[]>(() => {
    const { start, end } = visibleRange.value;
    return list.value.slice(start, end).map((data, index) => ({
      data,
      index: start + index,
    }));
  });
  
  // 处理滚动事件（使用 requestAnimationFrame 节流）
  let rafId: number | null = null;
  const handleScroll = (e: Event) => {
    if (rafId !== null) return;
    
    rafId = requestAnimationFrame(() => {
      const target = e.target as HTMLElement;
      scrollTop.value = target.scrollTop;
      rafId = null;
    });
  };
  
  // 滚动到指定索引
  const scrollToIndex = (index: number) => {
    if (containerRef.value) {
      containerRef.value.scrollTop = index * itemHeight;
    }
  };
  
  // 清理
  onUnmounted(() => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  });
  
  return {
    containerRef,
    visibleItems,
    visibleRange,
    handleScroll,
    scrollToIndex,
  };
}

/**
 * 虚拟网格列表组合式函数
 * 用于优化网格布局的大量数据渲染
 */
export function useVirtualGrid<T>(
  list: Ref<T[]>,
  optionsSource: VirtualGridOptionsSource
) {
  const containerRef = ref<HTMLElement | null>(null);
  const scrollTop = ref(0);
  const containerWidth = ref(0);

  // 配置支持函数形式，从而跟随外部 props 变化实时重算布局
  const options = computed<VirtualGridOptions>(() =>
    typeof optionsSource === 'function' ? optionsSource() : optionsSource
  );

  const itemHeight = computed(() => options.value.itemHeight);
  const columnCount = computed(() => Math.max(1, Math.floor(options.value.columnCount) || 1));
  const gap = computed(() => options.value.gap ?? 8);
  const fixedItemWidth = computed(() => options.value.itemWidth);
  const overscan = computed(() => options.value.overscan ?? 2);
  const containerHeight = computed(() => options.value.containerHeight ?? 300);
  
  // 计算行数
  const rowCount = computed(() => Math.ceil(list.value.length / columnCount.value));
  
  // 计算可见范围
  const visibleRange = computed(() => {
    const rowHeight = itemHeight.value + gap.value;
    const totalHeight = rowCount.value * rowHeight;
    const startRow = Math.floor(scrollTop.value / rowHeight);
    const visibleRowCount = Math.ceil(containerHeight.value / rowHeight);
    
    // 添加 overscan 缓冲
    const startRowIndex = Math.max(0, startRow - overscan.value);
    const endRowIndex = Math.min(rowCount.value, startRow + visibleRowCount + overscan.value);
    
    // 计算可见的 item 索引范围
    const startIndex = startRowIndex * columnCount.value;
    const endIndex = Math.min(list.value.length, endRowIndex * columnCount.value);
    
    return {
      start: startIndex,
      end: endIndex,
      startRow: startRowIndex,
      endRow: endRowIndex,
      totalHeight,
      offsetY: startRowIndex * rowHeight,
    };
  });
  
  // 可见列表项（包含行列位置信息）
  const visibleItems = computed<VirtualGridItem<T>[]>(() => {
    const { start, end } = visibleRange.value;
    const cols = columnCount.value;
    return list.value.slice(start, end).map((data, index) => {
      const actualIndex = start + index;
      return {
        data,
        index: actualIndex,
        row: Math.floor(actualIndex / cols),
        col: actualIndex % cols,
      };
    });
  });
  
  // 计算每个 item 的位置样式
  const getItemStyle = (item: VirtualGridItem<T>) => {
    const height = itemHeight.value;
    const spacing = gap.value;
    const width = fixedItemWidth.value;
    const rowHeight = height + spacing;

    // 指定了固定宽度：按像素定位，保证按钮尺寸与外部组件一致
    if (width && width > 0) {
      return {
        position: 'absolute' as const,
        top: `${item.row * rowHeight}px`,
        left: `${item.col * (width + spacing)}px`,
        width: `${width}px`,
        height: `${height}px`,
      };
    }

    // 未指定宽度：沿用按容器宽度百分比均分的自适应布局
    const cellWidthPercent = 100 / columnCount.value;
    // 实际内容宽度（减去间隙）
    const itemWidthCalc = `calc(${cellWidthPercent}% - ${spacing}px)`;
    
    return {
      position: 'absolute' as const,
      top: `${item.row * rowHeight}px`,
      left: `calc(${item.col * cellWidthPercent}% + ${spacing / 2}px)`,
      width: itemWidthCalc,
      height: `${height}px`,
    };
  };
  
  // 处理滚动事件
  let rafId: number | null = null;
  const handleScroll = (e: Event) => {
    if (rafId !== null) return;
    
    rafId = requestAnimationFrame(() => {
      const target = e.target as HTMLElement;
      scrollTop.value = target.scrollTop;
      rafId = null;
    });
  };
  
  // 更新容器可用宽度
  // 绝对定位子元素以 padding box 为参照，clientWidth 正好等于该宽度
  const updateContainerWidth = () => {
    if (containerRef.value) {
      containerWidth.value = containerRef.value.clientWidth;
    }
  };
  
  // 滚动到指定索引
  const scrollToIndex = (index: number) => {
    if (containerRef.value) {
      const rowHeight = itemHeight.value + gap.value;
      const row = Math.floor(index / columnCount.value);
      containerRef.value.scrollTop = row * rowHeight;
    }
  };
  
  // 清理
  onUnmounted(() => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  });
  
  return {
    containerRef,
    containerWidth,
    scrollTop,
    columnCount,
    visibleItems,
    visibleRange,
    getItemStyle,
    handleScroll,
    scrollToIndex,
    updateContainerWidth,
  };
}

/**
 * 批量渲染控制器
 * 用于控制大量异步渲染任务的执行
 */
export function useBatchRender<T>(
  items: Ref<T[]>,
  renderFn: (item: T) => Promise<void>,
  options: {
    batchSize?: number;
    delay?: number;
    priority?: 'visible-first' | 'sequential';
  } = {}
) {
  const { batchSize = 10, delay = 0, priority = 'sequential' } = options;
  
  const isRendering = ref(false);
  const progress = ref(0);
  const abortController = ref<AbortController | null>(null);
  
  // 渲染队列
  const renderQueue = async (visibleIndices?: Set<number>) => {
    if (isRendering.value) return;
    isRendering.value = true;
    progress.value = 0;
    
    abortController.value = new AbortController();
    const { signal } = abortController.value;
    
    try {
      const total = items.value.length;
      
      // 根据优先级排序
      let indices: number[];
      if (priority === 'visible-first' && visibleIndices) {
        const visible = Array.from(visibleIndices).sort((a, b) => a - b);
        const hidden = items.value
          .map((_, i) => i)
          .filter(i => !visibleIndices.has(i));
        indices = [...visible, ...hidden];
      } else {
        indices = items.value.map((_, i) => i);
      }
      
      // 批量渲染
      for (let i = 0; i < indices.length; i += batchSize) {
        if (signal.aborted) break;
        
        const batch = indices.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (index) => {
            if (!signal.aborted) {
              await renderFn(items.value[index]);
            }
          })
        );
        
        progress.value = Math.min(100, Math.round((i + batch.length) / total * 100));
        
        if (delay > 0 && i + batchSize < indices.length) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } finally {
      isRendering.value = false;
    }
  };
  
  // 中止渲染
  const abort = () => {
    abortController.value?.abort();
    isRendering.value = false;
  };
  
  // 清理
  onUnmounted(() => {
    abort();
  });
  
  return {
    isRendering,
    progress,
    renderQueue,
    abort,
  };
}
