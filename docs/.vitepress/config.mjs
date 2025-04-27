import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Cavendichun的笔记",
  description: "RISE! OR FALL",
  // appearance: false,
  markdown: {
    image: {
      lazyLoading: true,
    },
  },
  themeConfig: {
    aside: {},
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "React", link: "/react/React原理分析/useContext/index.md" },
      { text: "JS进阶", link: "/javascript/手写完整的Promise/index.md" },
    ],
    sidebar: {
      "/react/": [
        {
          text: "React",
          items: [
            {
              text: "React原理分析",
              items: [
                {
                  text: "一次单纯的render流程",
                  link: "/react/React原理分析/一次单纯的渲染流程/index.md",
                },
                {
                  text: "Commit流程",
                  link: "/react/React原理分析/commit流程/index.md",
                },
                {
                  text: "useContext",
                  link: "/react/React原理分析/useContext/index.md",
                },
                {
                  text: "bailout和eagerState",
                  link: "/react/React原理分析/bailout和eagerState/index.md",
                },
              ],
            },
          ],
        },
      ],
      "/javascript/": [
        {
          text: "JS进阶",
          items: [
            {
              text: "手写完整的Promise",
              link: "/javascript/手写完整的Promise/index",
            },
            {
              text: "从React的Suspense原理联想到消除异步传染性",
              link: "/javascript/从React的Suspense原理联想到消除异步传染性/index",
            },
          ],
        },
      ],
    },
  },
});
