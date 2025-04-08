import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Cavendichun的笔记",
  description: "RISE! OR FALL",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "React", link: "/react/fiber概念" },
    ],

    sidebar: [
      {
        text: "React",
        items: [{ text: "Fiber基本概念", link: "/react/fiber概念" }],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
});
