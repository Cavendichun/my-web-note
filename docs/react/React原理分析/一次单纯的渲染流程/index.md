# 一次单纯的渲染流程

先不考虑 lanes 模型、自动批处理、并发更新、bailout、eagerState 等高级特性，单纯总结一次渲染流程。

## 概览

React 的一次渲染流程为：

:::info

- scheduler 调度更新
- render 阶段
- commit 阶段

:::

## 特殊的首次渲染

React 中每个节点都对应一个 FiberNode，在首次渲染的时候，FiberNode 只有两个，FiberRootNode 和 HostFiberNode，FiberRootNode 对应的是整棵 fiber 树的根节点，保存着一些全局信息，HostRootFiber 对应在 html 中定义的根节点的 fiber。

:::info

- FiberRootNode.stateNode = HostRootFiber
- HostRootFiber.current = FiberRootNode

:::

为了复用逻辑，React 希望首次渲染也能接入更新逻辑，所以通过强制给 HostRootFiber 绑定一次 update 来实现，所以下面讨论的都是更新过程。

## 触发重新渲染的方式

触发渲染的方式本质上只有两种：1. 组件状态的变化 2. context 的变化

如果是组件状态的变化，会给发生变化的 fiber 节点生成一个 update 对象，保存在 hook.updateQueue 中（首次渲染其实就是模拟了这种方式，只不过是放在了 fiber.updateQueue 中），然后触发该节点的更新。

如果是 context 的变化，会找到消费 context 的节点，然后触发该节点的更新。

触发更新的方法都统一为 scheduleUpdateOnFiber。

## scheduleUpdateOnFiber

这个方法做的事情是，首先调用 markUpdateOnFiber，从触发更新的节点向上回溯到 HostRootFiber，并在沿途做标记（标记是为了性能优化，后面再说），回溯到根节点后，开始进入 renderRoot。

## renderRoot

renderRoot 的作用就是调用 prepareFreshStack，生成一个 HostFiberRoot 对应的新节点，将这个节点存在全局的 workInProgress 树上，并开启一个 workLoop。

## workLoop

workLoop 就是开始一个深度优先遍历的过程，最终生成一棵新的 fiber 树，生成完成后，用这个新的树进入 commit 阶段来渲染页面，分为两个子阶段，performUnitOfWork 和 completeUnitOfWork。

## performUnitOfWork

performUnitOfWork 的作用是向下遍历节点，对每个节点进行 beginWork 操作。

## completeUnitOfWork

completeUnitOfWork 的作用是检查当前节点是否有右侧的兄弟节点，如果有的话，让兄弟节点进入 workLoop，否则继续向上遍历。

## beginWork

beginWork 先判断当前 fiber 的 tag，执行不同的方法获取到下一级的 ReactElement，比如 HostComponent 的 children 在 props.children 中，HostTextNode 没有 children，FunctionComponent 需要运行 renderWithHooks 拿到 children，Fragment 透传 children 等。

拿到 children 后，将 fiber 和 children 传入 reconcilerChildren 进行一些列的 diff 操作，reconcilerChildren 会将节点打上必要的标记，并绑定好三指针结构，然后将第一个 children 返回给 beginWork

## completeWork

completeWork 会给 fiber 节点按照标记生成对应的真实 dom 节点，存在 fiber.stateNode 中，还会将节点的 flag 向上冒泡到父节点的 subtreeFlags 上。

## reconcilerChildren

reconcilerChildren 是节点的 diff 阶段，diff 是新的 ReactElement 和旧的 FiberNode 之间的比较，分为单节点 diff 和多节点 diff，节点的 diff 会比对节点的 key 和 type 两个属性，来判断是否复用节点。

单节点 diff 指的是新节点的个数为 1 个，会依次遍历旧节点，有几种情况：

:::info

- 新旧节点的 key 不一样，证明不能复用，给旧节点标记 Deletion，继续遍历下一个节点
- 新旧节点的 key 相同，但 type 不同，说明唯一能复用的机会也没有了，结束遍历，给所有旧节点标记 Deletion，生成新节点的 fiber，标记 Placement
- 新旧节点的 key 和 type 都相同，可以复用，克隆节点，更改三指针指向，标记 Placement，剩余节点标记 Deletion

:::

多节点 diff 指的是新节点的个数为多个，最多会经历两轮遍历，第一轮遍历为：

:::info

- 依次对比新旧节点相同位置的节点，若满足复用条件就继续遍历下一个，如果不满足条件或一方没有剩余了，就立即退出遍历

:::

第一轮遍历的目的是将不变的节点快速的排除出来，为第二轮遍历减少样本。

第一轮遍历后，会有几种情况：

:::info

- 新旧节点都没有剩余（最理想情况，全部复用了）
- 新节点有剩余（比较理想，旧节点全部复用，添加新节点即可）
- 旧节点有剩余（比较理想，能复用的都复用了，删除旧节点即可）
- 新旧节点都有剩余（不理想，需要二次比对）

:::

一个一个来看，如果新节点有剩余，就生成所有新节点并标记 Placement，如果旧节点有剩余，就给剩余的旧节点标记 Deletion，如果新旧节点都有剩余的话，过程如下：

:::info

- 先把旧节点放到一个 Map 中，key 是旧节点的 key，如果没有 key 就用 index
- 遍历剩余新节点，从 Map 中拿到能复用的，如果没有能复用的，就新建节点并标记 Placement，如果能复用，复用后把旧节点从 Map 中移除
- 遍历完成后，把剩余的旧节点标记 Deletion
- 遍历第二节点复用的节点，对比 oldIndex 和 newIndex，如果 newIndex > oldIndex，就把节点移动到最后，每个节点都移动完成后，就 diff 结束了

:::

## 过程中存在的性能优化点
