# 一梦工作室 · 官网样稿

黑白 + 克莱因蓝（#002FA7）的单页静态站点，无构建、无依赖；全站分三部分：动态首屏、介绍区、业务手风琴。

- 在线预览：https://nananatami.github.io/daydreamer/
- 组件设计稿：https://www.figma.com/design/ZDknmwEdfzRni9LjSGbsIQ?node-id=2-35

## 页面

- **动态首屏**：「一梦工作室」标题按网格切片（电脑 6×6、手机 3×6），随面板绕横轴翻转。滚动一步翻一屏：先整屏翻到蓝色介绍面，继续滚动进入业务区；在顶端向上滚动翻回正面。
- **介绍区**：首屏翻面后的克莱因蓝面板，DESIGN × TECHNOLOGY 标题与团队介绍。
- **业务区**：PROJECTS 手风琴；七项业务，每行默认收起，悬停或点击展开一项，详情含介绍与流程示意。
- 系统减少动态偏好下保留翻面与开合功能，仅关闭过渡。

## 本地预览

运行 `node server.cjs`，打开 http://127.0.0.1:51800 。

## 发布

GitHub Pages 从 `main` 分支根目录发布：推送到 `main` 即触发更新（`.nojekyll` 用于直接发布静态文件）。

## 文件

| 路径 | 说明 |
|---|---|
| `index.html` | 页面结构：hero 场景、项目区 |
| `style.css` | 全部样式；翻页参数集中在 `.hero-stage` 块 |
| `main.js` | 翻页控制、网格与交互、锚点导航 |
| `server.cjs` | 本地预览服务器 |
| `assets/fonts/` | 自托管字体与版权说明 |
| `tools/` | 维护脚本（见 tools/README） |
| `_archive/` | 移除文件的留档 |
| `AGENTS.md` | 开发规则 |

## 字体

全部自托管，unicode-range 按需加载：

- 首屏标题 RRPL：单文件子集 `assets/fonts/rrpl-logo.woff2`；改标题后用 `tools/make-hero-font.py` 重建。
- Chathura（Google Fonts）、LXGW ZhiSong CL、USMCCyuanjiantecu（ZeoSeven 分片）：改文字无需重建。

## 许可

- 字体版权说明保留在 `assets/fonts/` 对应 CSS 中。
