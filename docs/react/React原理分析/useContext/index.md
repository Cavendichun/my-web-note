# useContext

在传统的 React 数据流中，数据和方法是通过 props 和 state 向后代传递的，但如果组件的嵌套层级过深，则在每一层都需要进行取值传值的操作，负担会变得很重，这时就可以使用 useContext 的方式，在某一层级定义一个上下文，使后代都能获取到，不需要进行透传。

## 使用方式

createContext 用来定义一个上下文，返回一个对象，对象中包含一个 Provider，用这个 Provider 包裹需要消费这个上下文的节点，传入 value，被包裹的节点就能获取到该 Provider 所定义的上下文了。

```jsx
import { StrictMode, createContext, useContext } from 'react';
import ReactDOM from 'react-dom/client';

const SizeContext = createContext('default'); // 定义一个size上下文，默认为default

const App = () => {
  return (
    // 提供上下文，把值覆写成large
    <SizeContext.Provider value="large">
      <Child />
    </SizeContext.Provider>
  );
};

const Child = () => {
  const size = useContext(SizeContext); // 消费上下文

  return (
    <>
      {/* 获取到上下文 large */}
      Size is: <b>{size}</b>
    </>
  );
};

ReactDOM.createRoot(document.querySelector('#root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

如果没用用 Provider 包裹，直接使用 useContext 的话，获取到的则是定义上下文时传入的默认值。

```jsx
import { StrictMode, createContext, useContext } from 'react';
import ReactDOM from 'react-dom/client';

const SizeContext = createContext('default');

const App = () => {
  return <Child />; // 没有使用Provider包裹
};

const Child = () => {
  const size = useContext(SizeContext); // 消费了上下文

  return (
    <>
      {/* 获取到了默认上下文 default */}
      Size is: <b>{size}</b>
    </>
  );
};

ReactDOM.createRoot(document.querySelector('#root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

## 嵌套的 Provider

可以看出，Provider 也是一个 ReactElement，可以进行嵌套，那如果出现了嵌套的情况，会怎么样呢？对于嵌套 Provider 中的子节点，获取到的上下文是举例自己最近的父祖辈节点定义的上下文，类似全局作用域和局部作用域中，同时定义了一个变量，但生效的是局部作用域。

```jsx
import { StrictMode, createContext, useContext } from 'react';
import ReactDOM from 'react-dom/client';

const SizeContext = createContext('default');

const App = () => {
  return (
    <>
      <SizeContext.Provider value="extraLarge">
        {/* 获取到 extraLarge */}
        <Child />
        <SizeContext.Provider value="large">
          {/* 获取到 large */}
          <Child />
          <SizeContext.Provider value="small">
            {/* 获取到 small */}
            <Child />
          </SizeContext.Provider>
        </SizeContext.Provider>
      </SizeContext.Provider>
      {/* 获取到 default */}
      <Child />
    </>
  );
};

const Child = () => {
  const size = useContext(SizeContext);

  return (
    <>
      Size is: <b>{size}</b>
    </>
  );
};

ReactDOM.createRoot(document.querySelector('#root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

那么这个就近获取上下文的功能是如何实现的呢？

## Provider 就近分配上下文的原理？

首先，Provider 也是一个 ReactElement，render 阶段中也会进入 beginWork 和 completeWork 两个阶段。

React 中存在一个全局的上下文的栈，当 Provider 进入 beginWork 的时候，会把自己的上下文推到栈中。再继续遍历子节点的时候，useContext 会从栈尾获取上下文，得到的就是距离自己最近的父祖节点的上下文了。

当 Provider 进入 completeWork 的时候，会把栈尾的上下文弹出，这样就能保证嵌套 Provider 获取的上下文和定义的层级一致了。

## context 的更新是如何触发消费者的更新？

首先，每个 fiber 节点上会有一个 dependencies 的属性，保存着该节点用到的上下文，是一个链表。

为什么是链表呢？因为可以对不同的上下文使用 useContext，所有的 useContext 都会保存在 fiber.dependencies 中（所以由此可知，其他的 hook 都会保存在 fiber.memoizedState 中，但 useContext 是个特例，所以他不受 hook 不能条件判断、不能调换顺序等规则的影响）。

当 Provider 节点更新后，会从该 Provider 向下深度优先遍历，查找所有消费了该上下文的节点（查找的规则是：子 fiber 节点的 dependencies 链表中是否包含该上下文），对所有符合条件的节点打上 lane 标记，并使用 scheduleUpdateOnFiber 调度更新，后面就是常规的更新渲染流程了。
