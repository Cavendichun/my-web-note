import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Cavendichun的笔记',
  description: 'RISE! OR FALL',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'React', link: '/react/什么是JSX' },
      { text: 'JS进阶', link: '/javascript/手写完整的Promise' },
    ],

    sidebar: [
      {
        text: 'React',
        items: [{ text: '什么是JSX', link: '/react/什么是JSX' }],
      },
      {
        text: 'JS进阶',
        items: [
          { text: '手写完整的Promise', link: '/javascript/手写完整的Promise' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' },
    ],
  },
});
