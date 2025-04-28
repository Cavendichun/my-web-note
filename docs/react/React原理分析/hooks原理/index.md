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

在旧版的 React 中，在调用了 dispatch 方法后，方法内部会创建一个 update，判断当前 hook.updateQueue 上是否存在更新，如果不存在更新的话，将 update 存入链表，并调度一次更新。如果存在更新的话，只将 update 存到链表，不需要再次调度更新了，所以在如下代码中：
