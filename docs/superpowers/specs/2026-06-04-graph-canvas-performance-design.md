# Graph Canvas 大图交互性能优化设计

日期：2026-06-04

## 背景

当前知识图谱画布基于 React Flow 渲染，核心代码集中在 `web/src/components/GraphCanvas.tsx`、`web/src/components/GraphCanvas/useGraphCanvasNodes.ts`、`web/src/components/GraphCanvas/useGraphCanvasEdges.ts`、`web/src/components/GraphCanvas/graphUtils.ts` 以及拖拽、框选、对齐辅助线相关 hooks。

现有实现已经把画布逻辑拆成多个 hook，并在 `createGraphNodes` 中尝试复用上一轮 node 对象。但大图交互时，选点、选边、搜索过滤、拖拽状态、引用选择模式等高频状态仍会进入节点和边的派生流程，容易导致整张图的 React Flow node/edge 对象被重新计算，进而放大 React 渲染、DOM diff、富文本内容解析和边线绘制成本。

本次优化优先解决大图画布交互流畅度，目标场景包括拖拽、多选拖拽、框选、缩放、选点、选边。

## 目标

- 在约 500 个节点 / 800 条边的画布上，拖拽、选点、选边、框选时减少明显卡顿。
- selection、edge selection、drag interaction active 等高频交互状态变化时，尽量只改变受影响的节点或边对象。
- 节点内容、图片、保存位置、尺寸等低频结构数据与交互视觉状态分层，避免交互操作触发富文本内容和节点主体 data 的无意义重建。
- 拖拽过程中的临时状态保留在 React Flow、refs 或局部 overlay 中，拖拽结束后再提交 workspace transaction 和 history。
- 保持现有行为、文件格式、File System Access API 设计决策和跨 mac / win 可运行性不变。

## 非目标

- 不改变浏览器文件打开和保存依赖 File System Access API 的产品决策。
- 不重写 React Flow 或替换渲染引擎。
- 不在本轮实现完整虚拟化或 canvas/WebGL 渲染。
- 不顺手重构与大图交互性能无直接关系的 UI 样式、文件持久化或项目管理模块。

## 推荐方案：激进渲染分层

将 `GraphCanvas` 的派生模型拆成三个层次：静态图数据层、交互视觉层、拖拽临时层。

### 静态图数据层

新增或演进当前 `useGraphCanvasNodes` 为稳定节点模型，例如 `useGraphCanvasNodeModel`。它只依赖低频结构数据：

- `graph.nodes`
- `images`
- `nodePositions`
- `nodeSizes`
- 节点创建、快速编辑、引用选择、resize 等稳定 handler

该层负责生成 React Flow nodes 的主体结构，包括 id、type、parentId、position、size、imageBlob、node 原始数据和节点组件所需的稳定回调。它不直接依赖 `selectedNodeIds`、`selectedEdgeId`、`isDraggingNodes` 等高频交互状态。

如果数组引用必须变化，也要尽量复用数组中的 node 对象；只有节点自身结构、尺寸、位置、图片或核心 handler 变化时，才返回新的 node 对象。

### 交互视觉层

新增轻量交互模型，例如 `useGraphCanvasInteractionModel`，专门计算 lookup 数据：

- `selectedNodeIdSet`
- `connectedNodeIds`
- `dimmedNodeIds`
- `disabledNodeIds`
- `matchingNodeIds`
- `visibleNodeIds`
- `selectedEdgeId`
- `citationSelectionActive`

该层不解析节点内容，也不重建节点主体 data。它只输出用于判断 className、opacity、selectable、draggable、edge style 的轻量集合。

节点和边对象更新时，以“受影响对象最少”为原则：

- 单选从 A 切到 B，只应让 A 和 B 的 selected 视觉状态变化。
- 选中边时，只应让该边、上一条选中边、连接节点和上一次连接节点相关对象变化。
- 搜索和过滤可能影响较多节点，但仍应复用未变化节点对象，并避免节点内容主体 data 重建。
- citation selection 只影响引用不可选节点的 selectable/className，不应触发富文本内容重新解析。

### 边模型层

演进 `useGraphCanvasEdges` 为 `useGraphCanvasEdgeModel`，拆分边结构和边视觉状态。

边结构包括：

- `id`
- `source`
- `target`
- `type`
- `direction`
- `color`
- `style`

边视觉包括：

- selected
- opacity
- strokeWidth
- isInteractionActive
- className

边对象复用原则：

- 边的 source/target/type/direction/color/style 未变时，结构 data 复用。
- selection 切换时，只更新上一条选中边、下一条选中边和因连接态变化而视觉不同的边。
- 拖拽开始/结束只影响需要暂停动画或降低交互成本的轻量字段，避免无差别重建 800 条边的深层 data。

### 拖拽临时层

拖拽中状态继续保留在专用 hooks 中：

- `useGraphCanvasDragAutoPan`
- `useGraphCanvasNodeDragLifecycle`
- `useGraphCanvasAlignmentGuides`
- `useGraphCanvasMarqueeSelection`

优化方向：

- 用 ref 记录拖拽是否已进入移动态，避免每一帧重复 `setIsDraggingNodes(true)`。
- 在拖拽开始时构建当前节点 id 到 node 的 Map，替代拖拽结束时对 selected nodes 的重复 `find`。
- auto pan 和 alignment guides 保持 `requestAnimationFrame` 节流。
- 拖拽过程不提交 workspace reducer；拖拽结束后再调用 `onNodeDragEnd` 或 `onNodesDragEnd`。

## 数据流

`KnowledgeBaseGraphZone` 继续向 `GraphCanvas` 传入 workspace 数据和回调。`GraphCanvas` 内部的数据流调整为：

1. `useGraphCanvasInteractionModel` 根据 graph、selection、search/filter、citation 状态输出轻量 lookup。
2. `useGraphCanvasNodeModel` 根据结构数据生成或复用 React Flow nodes。
3. 节点视觉补丁根据 interaction lookup 只更新受影响 node 对象。
4. `useGraphCanvasEdgeModel` 根据边结构和 interaction lookup 生成或复用 React Flow edges。
5. 拖拽、框选、auto pan、alignment guides 只更新局部 refs 或 overlay 状态。
6. 拖拽结束后提交 workspace transaction，并按现有 history 机制记录。

## 测试策略

优先扩展现有 GraphCanvas 相关测试，而不是引入大而重的端到端测试。

需要覆盖：

- `createGraphNodes` 或新节点模型在 selection 变化时复用未受影响节点对象。
- 选中边切换时，只有必要边对象和连接节点视觉对象变化。
- filter/search/citation mode 的 opacity、className、selectable、draggable 行为与现有断言一致。
- 多选拖拽结束后，`onNodesDragEnd` moves 仍包含正确 from/to。
- 拖拽进入 active 状态只触发必要 state 更新。
- 边样式 normalize、direction、color、interaction width 等既有行为保持不变。

性能验收以可重复基准为主：

- 构造约 500 节点 / 800 边的数据集。
- 对 selection 切换、edge selection 切换、drag start/drag stop、marquee selection 进行对象复用断言或轻量 benchmark。
- 记录优化前后的派生对象变化数量、关键操作耗时和相关 render 次数。若测试环境不适合稳定断言耗时，则以对象复用数量和行为测试作为自动化门槛，手动浏览器 profiling 作为辅助验证。

## 风险与缓解

- React Flow 对 `nodes` 和 `edges` 数组引用变化敏感。缓解方式是即使数组引用变化，也尽量复用数组内对象，并用测试锁定对象复用行为。
- 交互视觉层拆分后，selection、search、filter、citation mode 的组合状态更复杂。缓解方式是先用当前 `graphUtils.test.ts`、`useGraphCanvasEdges.test.tsx` 等测试补齐组合场景，再改实现。
- 大图性能瓶颈可能部分来自 React Flow 内部布局和 DOM 绘制。缓解方式是把本轮目标限定为减少应用层无意义派生和重渲染；若收益不足，再评估虚拟化、节点内容懒渲染或渲染引擎方向。
- 当前工作区可能存在未提交改动。实施时只触碰性能优化相关文件，并在修改前后检查 git 状态，避免覆盖用户改动。

## 实施边界

本设计会进入后续实施计划，不在设计阶段直接修改业务代码。实施阶段若修改 GraphCanvas 架构或代码，应在完成后运行测试，并按项目要求执行 `codegraph init -i` 重新初始化索引，再同步扫描关联项确认修改到位。
