# 从 React 的 Suspense 原理联想到消除异步传染性

## 异步代码的传染性

我们在发送网络请求时一般是这样写的：

```js
const fetchUserData = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ name: "丁丁", age: 3 });
    }, 2000);
  });
};

const main = async () => {
  console.log("main start");
  const userData = await fetchUserData();
  console.log(userData);
  console.log("main end");
};

main();
```

但是这样写有一个问题，就是如果一个 async 函数如果被其他函数嵌套的话，那么在嵌套的每一层都需要加 async/await 来等待，这就是异步函数的传染性。

那有没有一种方法能实现不用 async/await，并且让代码仍然能够给按顺序执行呢？

## 从 React.Suspense 找到灵感

React 中，我们会使用 React.Suspense 和 React.lazy 来懒加载一个组件，例如：

```js
import { Suspense, lazy } from "react";

const LazyComponent = lazy(() => import("./LazyComponent.jsx"));

const App = () => {
  return (
    <Suspense fallback={<>loading...</>}>
      <LazyComponent />
    </Suspense>
  );
};

export default App;
```

这样 Suspense 就能够识别到内部组件的加载状态，并判断是否需要展示占位节点了，而这是怎么做到的呢？

了解 Suspense 原理的话，应该能知道，React 在全局维护里一个懒加载的缓存，懒加载的组件加载完成后，会缓存到那里，在没有加载完之前，React 会直接抛出一个错误，错误中包含一个 Promise，等待这个 Promise 的完成，会重新执行一次更新渲染操作。

## 实现我们的功能

顺着 React 的思路，我们发现一个问题，就是 main 函数会被执行两次。所以这种思路只适用于纯函数环境（没有副作用，相同的输入必定得到相同的输出），否则行为可能会不可控。

具体代码实现：

```js
const Suspense = {
  /**
   * exception内容是什么无所谓，只要是一个引用类型就可以
   * 后面比较引用相当就知道是这个Suspense抛出的错误了
   */
  exception: { tag: "SUSPENSE.EXCEPTION" },
  /**
   * 使用WeakMap，因为可能不止一个lazy调用
   * 每个缓存的状态遵循promise的规范
   * - { status: 'pending' }
   * - { status: 'fulfilled', result: xxx }
   * - { status: 'rejected', reason: xxx }
   */
  cache: new WeakMap(),
  // 包裹需要等待的promise，相当于React.lazy方法
  lazy(fn) {
    // 先获取一下缓存
    let cacheItem = this.cache.get(fn);
    // 如果缓存不存在，初始化一下缓存
    if (!cacheItem) {
      cacheItem = { status: "pending" };
      this.cache.set(fn, cacheItem);
    }
    // 检查缓存状态
    let returnValue;
    let thrownErr;
    let promiseException;

    switch (cacheItem.status) {
      // promise成功，把结果返回，并清除缓存
      case "fulfilled":
        returnValue = cacheItem.result;
        this.cache.delete(fn);
        return returnValue;
      // promise失败，把错误抛出，并清除缓存
      case "rejected":
        thrownErr = cacheItem.reason;
        this.cache.delete(fn);
        throw thrownErr;
      /**
       * promise还没有结果，证明是刚刚初始化，需要执行fn
       * 根据不同的结果，同步promise的状态
       * 并且抛一个特殊的错误出去
       */
      case "pending":
        promiseException = fn().then(
          (result) => {
            cacheItem.result = result;
            cacheItem.status = "fulfilled";
          },
          (reason) => {
            cacheItem.reason = reason;
            cacheItem.status = "rejected";
          }
        );
        // 抛错的时候，附带上then这个promise，用来通知run方法
        throw { exception: this.exception, promise: promiseException };
    }
  },
  /**
   * 放主体函数，相当于React.Suspense
   * 还可以传入一个fallback
   */
  run(fn, fallback) {
    try {
      // 进来先执行一下fn，但是在调用了lazy那一步会抛错跳出，被捕获到
      fn();
    } catch (error) {
      // 判断一下是不是我们定制的错误
      if (error.exception && error.exception === this.exception) {
        if (fallback) {
          fallback();
        }
        // promise成功或失败都会进入finally
        error.promise.finally(() => {
          // 再次执行fn，lazy函数据可以命中缓存了
          this.run(fn, fallback);
        });
      }
    }
  },
};

// ---------------- biz code ----------------------
const fetchUserData = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ name: "丁丁", age: 3 });
    }, 2000);
  });
};

const main = () => {
  console.log("main start");
  const userData = Suspense.lazy(fetchUserData);
  console.log(userData);
  document.body.innerText = JSON.stringify(userData);
  console.log("main end");
};

Suspense.run(main, () => {
  document.body.innerText = "loading...";
});
```
