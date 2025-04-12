---
outline: deep
---

# 什么是 JSX

## JSX 的转换

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
    'div',
    {
      className: 'app-class',
    },
    'App'
  );
}
```

代码中的尖括号标签会被编译成 `React.createElement`，这就是为什么 React 17 之前必须在 jsx 文件顶部显式使用 `import React from 'react'`的原因。

在 React 17 之后，`React.createElement`方法被替换成了 `jsx`方法，并且 babel 会自动在 jsx 文件顶部引入这个方法，所以 React 17 之后，文件顶部不需要显式使用 `import React from 'react'`了，还是刚才的代码，React 17 以后，会被编译成这样：

```js
import { jsx as _jsx } from 'react/jsx-runtime'; // 这行是babel自动做的

function App() {
  return /*#__PURE__*/ _jsx('div', {
    className: 'app-class',
    children: 'App',
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
} from 'react/jsx-runtime';

function App() {
  return /*#__PURE__*/ _jsxs('div', {
    className: 'app-class',
    children: [
      /*#__PURE__*/ _jsx(MyComponent, {}),
      /*#__PURE__*/ _jsxs(_Fragment, {
        children: [
          /*#__PURE__*/ _jsx('span', {
            children: 'Hello',
          }),
          /*#__PURE__*/ _jsx('span', {
            children: 'World',
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
