import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Cavendichun的笔记',
  description: 'RISE! OR FALL',
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
      { text: 'React', link: '/react/什么是JSX/index' },
      { text: 'JS进阶', link: '/javascript/手写完整的Promise' },
    ],
    sidebar: {
      '/react/': [
        {
          text: 'React',
          items: [
            {
              text: '手写React',
              items: [
                {
                  text: '准备工作',
                  link: '/react/手写React/准备工作/index.md',
                },
                {
                  text: '实现JSX',
                  link: '/react/手写React/实现JSX/index.md',
                },
              ],
            },
          ],
        },
      ],
      '/javascript/': [
        {
          text: 'JS进阶',
          items: [
            {
              text: '手写完整的Promise',
              link: '/javascript/手写完整的Promise/index',
            },
          ],
        },
      ],
    },
  },
});
