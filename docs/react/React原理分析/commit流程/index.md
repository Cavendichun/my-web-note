# Commit 流程

在 render 阶段完成之后，会生成一个新的 wip 树，然后会把 wip 树赋值给 FiberRootNode.finishedWork，调用 commitRoot 方法开始 commit 阶段。commit 阶段是同步的，一旦开始不可中断，因为要保证一次 UI 更新的完整性。

## 三个阶段

commit 流程分为三个子阶段，其中的每个子阶段都是一次深度优先遍历的过程：

:::info

- beforeMutation（UI 变更前）
- mutation（UI 变更）
- layout（UI 变更完成后）

:::

## beforeMutaion

分为 begin 和 complete 两个环节：

begin 环节中，会向下遍历，找到最下面带有 beforeMutationMask 的节点，对其执行 compelte。

complete 环节中，向上遍历，主要工作是执行类组件的 getSnapshotBeforeUpdate 生命周期函数，为什么要在向上遍历的过程中执行呢？因为如果要在父组件中获取子组件的 dom 状态，就必须让父组件的生命周期晚于子组件执行。

complete 环节还有一个工作就是，将所有有依赖变更的 useEffect 注册到根节点的 pendingPassiveEffect 上，开启调度（但这个调度需要 layout 阶段完成后才会执行）。

## mutaion

分为 begin 和 complete 两个环节：

begin 环节中，向下遍历，做的工作除了找到最下面带有 mutaionMask 的节点外，还会将沿途标记 Deletion 的节点进行删除，并删除对应的 ref，对于类组件的删除，执行 componentWillUnmout 的生命周期，对于函数组件的删除，执行 useEffectLayout 返回的 destory 函数。

complete 环节中，主要是根据 tag（Placement，Update 等）对 DOM 执行不同的操作，并更新 ref。

## layout

分为 begin 和 complete 两个环节：

begin 环节中，向下遍历，做的工作主要是找到最下面带有 layoutMask 的节点，对其执行 complete，还有一个工作是，对于 Offscreen 组件，修改它的 display 属性。

complete 中，向上遍历，对于类组件执行 componentDidMount 或 componentDidUpdate 生命周期，对于函数组件，执行 useEffectLayout（先执行所有的销毁函数，再执行所有的更新函数）。

## Layout 阶段结束后

beforeMutaion 阶段被调度的的 useEffect 函数依次执行（先执行所有的销毁函数，再执行所有的更新函数）。

## 为什么 useEffect 是异步执行的，而 useLayoutEffect 不是？

旧版的 useEffect 是同步执行的，但开发者经常用其来进行发送网络请求，但是会阻塞浏览器的渲染，所以需要异步执行。

但是仍然会有 DOM 变化完立刻获取 DOM 状态的需求，所以出现了 useEffectLayout 钩子。
