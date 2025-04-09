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
    nav: [{ text: "React", link: "/react/什么是jsx" }],

    sidebar: [
      {
        text: "React",
        items: [
          { text: "什么是JSX？", link: "/react/什么是jsx" },
          { text: "什么是Fiber架构？", link: "/react/什么是Fiber架构" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
});
