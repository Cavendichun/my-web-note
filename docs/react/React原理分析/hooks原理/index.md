---
outline: deep
---

# Hooks 原理

hooks 的出现，让无状态的函数组件也能拥有类似状态能力（但本质只是个闭包），能够使逻辑复用变得更加的容易。

## Hooks 是如何存储的？

每个函数组件的 Fiber 节点上有一个 memoizedState 属性，这个属性就是用来保存 hooks，hooks 保存形式是一条单向链表。

## 为什么 useState 在更新渲染的时候状态不会被重置？

比如 `const [num, setNum] = useState(0);` 表面上看首次渲染和更新渲染都调用了同一个函数 useState，但是两个节点底层的实现是不一样的。

通过 wip.alternate 是否为空来判断是首次渲染还是更新渲染，如果是首次渲染，调用的是 mountState，mountState 接受一个 action，如果 action 不是函数，就用 action 作为该 hook 的初始值，存在 hook.memoziedState 中，然后返回 [hook.memoizedState, dispatch]。

如果是更新渲染，调用的是 updateState，通过 hook.memoizedState 和 hook.updateQueue 计算出最终值，保存在 hook.memoizedState 中，然后返回 [hook.memoizedState, dispatch]。

所以只有在首次渲染的时候，初始值才会生效。

## 为什么 hook 不能在函数外部被调用？

以 useState 为例，返回的第二个参数 dispatchUpdateState，我们在调用的时候只传了 action，但其实函数内部是绑定了 currentRenderingFiber 的，只有在 renderWithHooks 中调用，currentRenderingFiber 才不为空，检测到为空就会报错。

## 为什么要求 hook 不能写在循环或条件语句中？

首次渲染后，fiber.memoizedState 上保存了 hook 的链表，更新渲染的时候，执行到 hook 函数的的时候，会尝试从 wip.alternate.memoizedState 对应的位置来复用上一次的 hook，在复用的时候，会对比 hook 的类型，如果类型不一致就会报错，当复用到最后一个，发现有一方为空的时候，证明前后两次渲染 hook 数量不一致，无法复用，就会报错。

其实 hook 的复用就是简单判断了类型和个数，如果不使用对应的 lint 来检测的话，是有办法绕过这种检测的，比如：

```js
const [flag, setFlag] = useState(true);

if (flag) {
  const [num1] = useState(1);
}

const [num2] = useState(2);
const [num3] = useState(3);

if (!flag) {
  const [num4] = useState(4);
}
```

在这个例子中，无论 flag 为 true 还是 false，最终 hook 的数量总是三个，并且类型都是 useState，这时 React 的判断规则就不起作用了，这是一种 “合法但不合理” 的方式。

## useState

useState 钩子返回 `[hook.memozizedState, dispatch]`。

首次渲染的时候，判断传入 action 的状态，如果是函数，执行后把结果存入 hook.memoizedState 中，如果不是函数，直接把 action 存入 hook.memoizedState 中。dispatch 函数绑定了当前的 fiber 和 updateQueue。

更新渲染的时候，依次执行 hook.updateQueue 上的更新，拿到最新结果，存在 hook.memoizedState 中，然后返回 [hook.memozizedState, dispatch]。

useReducer 和 useState 的原理相同。

- ### 更新批处理的问题

在旧版的 React 中，会对合成事件中的 dispatch 进行合并处理，原理是：所有的合成事件在执行时都会在全局保存一个执行上下文，在执行完成之前会销毁全局的执行上下文，所有的 dispatch 都夹在中间，相同上下文的更新都之加入更新队列不执行更新操作，销毁执行上下文后，在统一进行一次更新，比如如下代码：

```jsx
import { useState } from "react";

const App = () => {
  const [num, setNum] = useState(0);

  const handleClick = () => {
    setNum((s) => s + 1);
    setNum((s) => s + 1);
    setNum((s) => s + 1);
  };

  return <div onClick={handleClick}>{num}</div>;
};
```

:::info

- 设置执行上下文
- dispatch 加入队列
- dispatch 加入队列
- dispatch 加入队列
- 销毁执行上下文
- 执行一次更新

:::

所以就能解释一个现象，比如如下代码就不能触发批量更新：

```jsx
import { useState } from "react";

const App = () => {
  const [num, setNum] = useState(0);

  const handleClick = () => {
    setTimeout(() => {
      setNum((s) => s + 1);
      setNum((s) => s + 1);
      setNum((s) => s + 1);
    });
  };

  return <div onClick={handleClick}>{num}</div>;
};
```

因为 setTimeout 中的代码已经脱离了合成事件的上下文，所以不会启用批量更新。

在新版的 React 中，出现了自动批处理的概念，和旧版的批量更新不同，自动批处理对所有的 dispatch 都会进行合并，无论调用方式如何，实现原理是：

- 在同一事件中，所有的 dispatch 在调用后都会将新的 update 加入队列中，并标记同一优先级，执行一次调度更新，比如上面的例子中，连续调用了三次 dispatch 就是执行了三次调度更新，调度更新的作用是将三次回调存入一个队列中，并标记当前更新的优先级
- 但因为 dispatch 方法本身是同步的，而调度更新是异步的，所以在所有的 dispatch 执行完成后，三次调度的回调才会开始清空回调队列，开始执行的时候，dispatch 链表中已经有三个更新了
- 回调执行时，ensureRootIsScheduled 会判断回调的优先级，如果高于或等于当前优先级的话，就跳出执行，所以只有第一个回调会被执行，执行的结果是清空三次 update

在新版 React 中如果进行同步更新，可以使用 flushSync，flushSync 的原理是强行标记了一个 SyncLane 并调度一个更新。SyncLane 的更新会进入 lagecy 模式。

## useEffect 和 useLayoutEffect

useEffect 和 useLayout 的存储位置，除了常规的 fiber.memoizedState 单向链表中以外，还会在 fiber.updateQueue 中按顺序保存一份单独的环形链表。

比如对于如下 useEffect

```jsx
const App = () => {
  const [num, setNum] = useState(0);

  useEffect(() => {
    console.log("num changed create");
    return () => {
      console.log("num change destory");
    };
  }, [num]);

  const handleClick = () => {
    setNum((s) => s + 1);
  };

  return <div onClick={handleClick}>{num}</div>;
};
```

首次渲染的时候，hook 的数据结构是这样的：

```js
{
  create: () => {
    console.log("num changed create");
    return () => {
      console.log("num change destory");
    };
  },
  destory: () => {
    console.log("num change destory");
  },
  dep: [num]
}
```

当 num 变化后，使用 Object.is 对比新旧依赖项的值，发现有变化，会给 fiber 标记 PassiveEffect，在 commit 的 beforeMutation 阶段向上遍历的过程中收集所有发生变化的 hook，收集到根节点的 pendingUpdateQueue.update 中，layout 阶段完成后，先清空 pendingUpdateQueue 中的 destory 队列（上一次渲染留下来的清理函数），再清空 pendingUpdateQueue 中的 update 队列，对于执行过程中新生成的 destory 函数，则再次加入到 pendingUpdateQueue.destory 中。

useEffect 是在 beforeMutation 节点通过微任务调度执行的，所以真正的执行事件是在 commit 阶段完成之后，这么设计的原因是因为我们经常会在 useEffect 中做比如请求数据这种操作，不能因为这个阻塞了渲染。

对于 useLayoutEffect，数据结构和 useEffect 相同，执行的实际为 commit 的 layout 阶段的向上遍历过程中（和 componentDidMount 和 componentDidUpdate 同一时机执行，所以可以用 useLayoutEffect 的销毁函数来模拟 componentDidMount/componentDidUpdate）。

useLayoutEffect 的 destory 函数的执行实际则是在真实 DOM 变化之前，即 commit 的 mutation 阶段的向下遍历过程中，和 componentWillUnmount 的执行实际相同。所以可以用 useLayoutEffect 来模拟 componentWillUnmount。

- ### 总结一下 useEffect 和 useLayoutEffect 和他们的销毁函数的执行顺序

首次渲染阶段：

:::info

- useLayoutEffect 在 layout 阶段的 complete 中执行，顺序：子 --> 父
- useLayout 在 layout 阶段完成后执行，因为是在 beforeMutation 的 complete 阶段收集的，所以执行顺序为：子 --> 父

:::

更新渲染阶段：

:::info

- useEffectLayout 在 layout 的 complete 中执行，先执行所有的销毁函数，然后再深度优先遍历一次，执行所有的更新函数，所以执行顺序为：子（销毁）--> 父（销毁）--> 子（更新）--> 父（更新）
- useLayout 在 layout 阶段完成后执行，执行顺序为：子（销毁）--> 父（销毁）--> 子（更新）--> 父（更新）

:::

组件销毁时，有点不太一样，因为组件销毁是发生在 beforeMutation 的 begin 阶段中的，是父 --> 子的，并且都是同步的，所以：

:::info

- useLayoutEffect： 父（销毁）--> 子（销毁）
- useEffect: 父（销毁）--> 子（销毁）

:::

为什么销毁阶段要从父到子呢？因为销毁阶段实际调用了 DOM api 的 removeChild，必须保证子存在，否则就会报错。并且父组件可能保存着对子组件的引用，比如 ref，如果先卸载了子组件的话，父组件卸载时，清空 ref 就会报错。
