# bailout 和 eagerState

React 的每次更新渲染都是从根节点开始的，虽然使用虚拟 DOM 进行 diff 并复用节点已经提升了性能，但毕竟大部分时候，一次更新中发生变更的节点只占很少一部分，所以如果能跳过不变节点的 diff，直接复用节点，就能大幅提升性能。

## bailout

以 FunctionComponent 举例，在 beginWork 节点通过 renderWithHooks 得到子 ReactElement，然后进入 reconcilerChildren 阶段，bailout 策略就发生在 renderWithHooks 的时候，用来跳过下一层子节点的对比或跳过整棵子树的对比。

在之前 renderWithHooks 之前，会先进行几个判断：

:::info

- 判断当前节点新旧 type 是否相等
- 判断当前节点新旧 props 是否相等
- 判断当前节点本身是否发生了更新
- 判断当前节点依赖的 context 是否发生了更新

:::

1. 判断 type 是否相等，就是判断 wip.type === current.type，为什么不判断 key 呢，因为 key 的作用是是告诉节点该如何更新，而 bailout 策略是需要知道是否需要更新。
2. 判断 props 是否相等，就是判断 wip.pendingProps === current.memoizedProps，默认使用全等比较，在使用了 React.memo 后，会变为浅比较，也可以自定义对比方法。
3. 判断节点本身是否发生了更新和 context 是否发生了更新，都是通过判断旧节点的 lanes 是否包含当前正在被调度的 lane 来实现的。

满足了这四点条件后，该节点就会被判定为可以 bailout，就会直接复用旧克隆所有子节点，不会进入 renderWithHooks 和后续 reconcilerChildren 流程，beginWork 方法直接返回 fiber.child。

但其实还有可以优化的点，比如每次调用 useState 的 dispatch 的时候都会在节点上添加一个 lane，但有可能更新后的状态和更新前的一样。所以在运行 renderWithHooks 后，如果发现所有 useState 的 memoizedState 全都没变，则证明这个节点还是不需要更新，可以 bailout，不进入 reconcilerChildren。

但这样还不够，在通常情况下，如果一个父节点没有发生更新，则他的子节点也有很大概率没有发生更新，所以会继续 wip.childLanes（这个是在向上回溯过程中从子节点冒泡上来的），wip.childLanes 不包含当前正在被调度的优先级，就说明整棵子树都不需要更新了，整棵子树都会被 bailout（beginWork 方法返回 null）

## 总结一下 bailout

bailout 策略的目的是复用当前节点的下一层子节点或整棵子树。

React 的性能优化，除了避免写出一些低效率的业务代码外，其他的性能优化本质上都是在为触发 bailout 策略创造条件。

1. 在列表渲染中使用确定的 key 来帮助 React 识别节点的移动和复用，避免无谓的重建，因为父节点一旦重建，就无法触发 bailout 复用子节点，子节点必定会进入 beginWork。
2. 如果父组件更新了，那传入子组件的 props 一定会是一个全新的（即使每项都没改变），所以===不可能相等，这时就可以使用 React.memo 来对 props 进行浅比较，但是在浅比较的时候，如果某个传入的 prop 是一个引用对象，在比较时又会不相等，这时就可以使用 useMemo 和 useCallback 将属性进行缓存，而且需要注意不要写内联对象属性，因为永远无法比较相等。
3. 针对 context：将不变的属性和变化的属性分割开，比如一些配置类型的属性（开局后永远不会变的）和一些状态类属性。
4. 针对 lanes：将组件的状态下沉，避免不必要的高层节点被标记 lanes，这样会引起整棵子树的重新协调。

## eagerState

eagerState 在某些情况下可以直接拦截掉一次更新，具体的时机是：当更新了组件的某个状态，并且更新队列中只有着一项更新的时候，就会在 dispatchUpdateState 的时候提前计算出最新的 state，如果发现 state 没有变，就直接拦截本次更新。

举个例子：

```jsx
import { useState } from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
  const [num, setNum] = useState(0);

  console.log(num);

  return (
    <div onClick={() => setNum(0)}>
      <Child num={num} />
    </div>
  );
};

const Child = ({ num }) => {
  console.log('Child render');

  return <div>Child{num}</div>;
};

ReactDOM.createRoot(document.querySelector('#root')).render(<App />);
```

每次点击按钮，会触发 dispatchUpdateState，如果更新链表上没有其他的更新（证明这个是第一个更新，实际使用时大部分都是这种情况），就会直接计算出新的状态，如果新的状态和旧的状态相同，就会直接跳出，不生成新的 update。

## eagerState 一个诡异的现象

```jsx
import { useState } from 'react';
import { StrictMode, createContext, useContext } from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
  const [num, setNum] = useState(0);

  console.log(num);

  return (
    <div onClick={() => setNum(1)}>
      <Child num={num} />
    </div>
  );
};

const Child = ({ num }) => {
  console.log('Child render');

  return <div>Child{num}</div>;
};

ReactDOM.createRoot(document.querySelector('#root')).render(<App />);
```

这段代码中，第一次点击打印 1、Child render，第二次点击打印 1，后续再点击就不会再输出了。
