import { defineConfig } from 'rspress/config'

export default defineConfig({
  root: './src',
  title: 'Ghost-GL',
  description: 'High-performance virtualized grid layout engine for heavy components',
  lang: 'en',
  locales: [
    { root: '/', lang: 'en', label: 'English' },
    { root: '/zh/', lang: 'zh', label: '中文' },
  ],
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'API', link: '/api/core/overview' },
      { text: 'Packages', link: '/packages/react' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Introduction', link: '/guide/introduction' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' },
            { text: 'Concepts', link: '/guide/concepts' },
          ],
        },
      ],
      '/zh/guide/': [
        {
          text: '指南',
          items: [
            { text: '介绍', link: '/zh/guide/introduction' },
            { text: '安装', link: '/zh/guide/installation' },
            { text: '快速开始', link: '/zh/guide/quick-start' },
            { text: '核心概念', link: '/zh/guide/concepts' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Core Overview', link: '/api/core/overview' },
            { text: 'Adapter Core', link: '/api/adapter-core' },
          ],
        },
      ],
      '/zh/api/': [
        {
          text: 'API 参考',
          items: [
            { text: 'Core 概述', link: '/zh/api/core/overview' },
            { text: 'Adapter Core', link: '/zh/api/adapter-core' },
          ],
        },
      ],
      '/packages/': [
        {
          text: 'Packages',
          items: [
            { text: 'React', link: '/packages/react' },
            { text: 'Vue', link: '/packages/vue' },
            { text: 'React Native', link: '/packages/react-native' },
            { text: 'Lynx', link: '/packages/lynx' },
          ],
        },
      ],
      '/zh/packages/': [
        {
          text: '包',
          items: [
            { text: 'React', link: '/zh/packages/react' },
            { text: 'Vue', link: '/zh/packages/vue' },
            { text: 'React Native', link: '/zh/packages/react-native' },
            { text: 'Lynx', link: '/zh/packages/lynx' },
          ],
        },
      ],
    },
  },
})
