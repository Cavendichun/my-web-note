# bailout 和 eagerState

React 的每次更新渲染都是从根节点开始的，虽然使用虚拟 DOM 进行 diff 并复用节点已经提升了性能，但毕竟大部分时候，一次更新中发生变更的节点只占很少一部分，所以如果能跳过不变节点的 diff，直接复用节点，就能大幅提升性能。

## bailout

以 FunctionComponent 举例，在 beginWork 节点通过 renderWithHooks 得到子 ReactElement，然后进入 reconcilerChildren 阶段，bailout 策略就发生在 renderWithHooks 的时候。

在之前 renderWithHooks 之前，会先进行几个判断：

:::info

- 判断新旧 key，tyepe 是否相等
- 判断新旧 props 是否相等
- 判断节点本身是否发生了更新
- 判断节点依赖的 context 是否发生了更新

:::

1. 判断 key、type 是否相等，就是判断新的 ReactElement 和旧的 FiberNode 的 key 属性是否相等
2. 判断 props 是否相等，就是判断新的 ReactElement.pendingProps 和旧的 FiberNode.memoizedProps 是否相等，默认使用===进行比较，在使用了 React.memo 后，会变为浅比较，也可以自定义对比方法
3. 判断节点本身是否发生了更新，是通过判断旧节点的 lanes 是否包含当前正在被调度的 lane
4. 判断节点依赖的 context 是否发生了更新，是通过遍历 fiber.dependencies 链表，看链表中的节点的 lanes 时候包含当前正在被调度的 lane

满足了这四点条件后，该节点就会被判定为可以 bailout，就会直接复用旧 fiber，不会进入 renderWithHooks 和后续 reconcilerChildren 流程，beginWork 方法直接返回 fiber.child。

但其实还有可以优化的点，比如每次调用 useState 的 dispatch 的时候都会在节点上添加一个 lane，但有可能更新后的状态和更新前的一样。所以在运行 renderWithHooks 后，如果发现所有 useState 的 memoizedState 全都没变，则证明这个节点还是不需要更新，可以 bailout，不进入 reconcilerChildren。

但这样还不够，在通常情况下，如果一个父节点没有发生更新，则他的子节点也有很大概率没有发生更新，所以会继续检查旧 FiberNode 的 childLanes（这个是在向上回溯过程中从子节点冒泡上来的），如果 childLanes 不包含当前正在被调度的优先级，就说明整棵子树都不需要更新了，整棵子树都会被 bailout（beginWork 方法返回 null）

## 总结一下 bailout

React 的性能优化，除了避免写出一些低效率的业务代码外，其他的性能优化本质上都是在为触发 bailout 策略创造条件。

触发 bailout 的前提是 key、type、props、context、lanes 这几个属性的稳定性。

1. 针对 key 和 type: 在列表渲染中使用确定的 key 来帮助 React 识别节点的移动和复用，避免无谓的重建，因为一旦重建，子节点就无法触发 bailout。
2. 针对 props：如果父组件更新了，那传入子组件的 props 一定会是一个全新的（即使每项都没改变），所以===不可能相等，这时就可以使用 React.memo 来对 props 进行浅比较，但是在浅比较的时候，如果某个传入的 prop 是一个引用对象，在比较时又会不相等，这时就可以使用 useMemo 和 useCallback 将属性进行缓存，而且需要注意不要写内联对象属性，因为永远无法比较相等。
3. 针对 context：将不变的属性和变化的属性分割开，比如一些配置类型的属性（开局后永远不会变的）和一些状态类属性。
4. 针对 lanes：将组件的状态下沉，避免不必要的高层节点被标记 lanes，这样会引起整棵子树的重新协调。

## eagerState
