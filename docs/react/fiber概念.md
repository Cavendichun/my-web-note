---
outline: deep
---

# Fiber 基本概念

## 先了解什么是 JSX

我们在书写 React 的时候会使用这样的代码：

```jsx
function App() {
  return <div className="app-class">App</div>;
}
```

在 React 17 之前，会被 babel 编译成如下代码：

```js
function App() {
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className: "app-class",
    },
    "App"
  );
}
```

代码中的尖括号标签会被编译成 `React.createElement`，这就是为什么 React 17 之前必须在 jsx 文件顶部显式使用 `import React from 'react'`的原因。

在 React 17 之后，`React.createElement`方法被替换成了 `jsx`方法，并且 babel 会自动在 jsx 文件顶部引入这个方法，所以 React 17 之后，文件顶部不需要显式使用 `import React from 'react'`了，还是刚才的代码，React 17 以后，会被编译成这样：

```js
import { jsx as _jsx } from "react/jsx-runtime"; // 这行是babel自动做的

function App() {
  return /*#__PURE__*/ _jsx("div", {
    className: "app-class",
    children: "App",
  });
}
```

`jsx`方法接受两个参数，运行后返回一个 `ReactElement`：

- type：组件的类型，如果是具体组件，就是组件名称，如果是 DOM 标签的话，就是标签的字符串
- props：传给组件的参数，有三个特殊 props，分别是 `key`、`ref`、`children`

把刚才的示例多加一些子节点，比如：

```jsx
function App() {
  return (
    <div className="app-class">
      <MyComponent />
      <>
        <span>Hello</span>
        <span>World</span>
      </>
    </div>
  );
}
```

转换后如下：

```js
import {
  jsx as _jsx,
  Fragment as _Fragment,
  jsxs as _jsxs,
} from "react/jsx-runtime";

function App() {
  return /*#__PURE__*/ _jsxs("div", {
    className: "app-class",
    children: [
      /*#__PURE__*/ _jsx(MyComponent, {}),
      /*#__PURE__*/ _jsxs(_Fragment, {
        children: [
          /*#__PURE__*/ _jsx("span", {
            children: "Hello",
          }),
          /*#__PURE__*/ _jsx("span", {
            children: "World",
          }),
        ],
      }),
    ],
  });
}
```

可以看到生成了嵌套的结构，我们可以得出结论，`jsx`的作用是：

- 每个组件都是一个 `ReactElement`
- `ReactElement` 描述了当前组件的 DOM 视图是什么样子

## Fiber 解决了什么问题？

老版本的 React 中，很多都 `ReactElement` 节点构成了一棵虚拟 DOM 树，但是在虚拟 DOM 的 diff 阶段，遇到了一些问题：

- 采用递归的方式，遍历整棵虚拟 DOM 树，由于采用的是递归，所以无法中断（如果半途中断，会让用户看到更新不完整的页面）
- 如果虚拟 DOM 树过大，会出现耗时长的问题，一旦一次 diff 超过了 16.6ms，用户就会感觉到页面卡顿
- 采用递归的方式可能会导致溢出

针对以上问题，出现了 Fiber 架构，每一个 `ReactElement` 节点对应一个 `FiberNode`，`FiberNode` 和 `ReactElement` 的区别是:

- `ReactElement` 专门用来描述 UI，每次重新渲染都会生成新的 `ReactElement`
- `FiberNode` 是一个动态的工作单元，衔接 `ReactElement` 和 diff 流程

Fiber 架构主要特点如下：

- 每个 `FiberNode` 都对应三个指针 `return`、`child`、`sibling`，分别对应：父节点、第一个子节点、右边的兄弟节点
- 每个节点用三个指针，把整棵虚拟 DOM 树变成了一个链表，适合采用 `深度优先遍历`
- 遍历每个 `FiberNode` 的时候，用一个全局指针保存当前节点，可以随时暂停，如果遍历暂停了，下次可以从这个指针的位置继续遍历
- 采用双缓存机制，当前虚拟 Fiber 树不受影响，所有的更新在新 Fiber 树上进行，保证用户不会看到中间态，每次重新渲染完成后，用新的树替代旧树

## Q&A

### Q1 请你介绍一下 React 的 Fiber 架构

在出现 Fiber 架构之前，React 使用递归的方式遍历 ReactElement 组成的虚拟 DOM 树，由于是递归，过程无法中断，diff 时间如果超过 16.6ms，页面就会出现掉帧，并且有可能出现内存溢出。为了解决这个问题，React 使用了 Fiber 结构，特点如下：

- 每个 FiberNode 包含三个指针，整棵 Fiber 树形成一个链表，React 对其进行深度优先遍历
- 遍历时，将当前节点保存在全局指针上，可随时暂停遍历，恢复后从指针处继续
- 采用双缓存机制同在存在两棵 Fiber 树（current 和 wip），保证更新过程中，不会影响当前 Fiber 树

### Q2 ReactElement 和 FiberNode 有什么区别？

ReactElement 描述 UI 该长什么样子，具有简单的数据结构，FiberNode 是运行时的工作单元，保存了组件的状态，hooks 等

ReactElement 属性大体如下：

- type：组件名称或 DOM 标签名
- props：组件或标签的属性，包含关键属性 key、ref、children

FiberNode 属性大致如下：

- alternate：双缓存的另一棵 Fiber 树中的对应节点
- return：父节点
- child：第一个子节点
- sibling：右侧的兄弟节点
- memoizedState： 计算后的状态
- pendingProps：这一次的 props
- hooks: hooks 链表
- flag：节点的副作用

可以看出：memoziedState、pendingProps、hooks、flag 等，都是工作单元的一部分。
