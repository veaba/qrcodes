---
pageType: home

hero:
  name: 多引擎 QRCodes
  text: 高性能 QRCode 库
  tagline: 支持 WASM、Node.js、Bun 和 Rust 的多运行时 QRCode 解决方案
  actions:
    - theme: brand
      text: 开始使用
      link: /guide/
    - theme: alt
      text: GitHub
      link: https://github.com/veaba/qrcodes
  image:
    src: /qrcodes.png
    # src: /favicon-128.png
    # src: /favicon.svg
    alt: qrcodes Logo

features:
  - title: 🚀 高性能
    details: Rust 原生实现比社区主流库 kennytm-qrcode 快 6-19 倍（实测，见基准测试页）。
  - title: 🌐 跨平台
    details: 一套代码，支持浏览器、Node.js、Bun 和原生 Rust 环境。
  - title: 📦 模块化
    details: 按需引入，只打包你需要的功能，支持 Tree Shaking。
  - title: 💾 智能缓存
    details: 内置 LRU 缓存，重复文本生成性能提升 10-100 倍。
  - title: 🎨 丰富样式
    details: 支持圆角、渐变、Logo 区域、多种主题风格。
  - title: 🔧 TypeScript
    details: 完整的类型定义，提供优秀的开发体验。
---

## 许可证

[MIT](https://github.com/veaba/qrcodes/blob/main/LICENSE)

<!--
维护提示：本页 pageType 为 home，rspress 只渲染上方 frontmatter（hero / features），
下方 Markdown 正文不会出现在站点上。因此性能数字等实质内容请勿写在这里
（写了也不会显示），应放在 /guide/ 与 /bench/ 页面。
本页唯一的性能表述是 features[0].details，修改时请与
docs/public/benchmark_speedup_verified.json 的 headline 保持一致，
`node scripts/check-perf-claims.js` 会校验。
-->
