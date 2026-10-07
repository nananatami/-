# tools — 维护脚本

不参与页面运行，只在维护字体时用，纯 Python（跨平台）：

- `make-hero-font.py`——重建首屏标题单文件 `assets/fonts/rrpl-logo.woff2`（改标题文字后运行，需要 fontTools + brotli）：`uv run --with fonttools --with brotli python tools/make-hero-font.py`

（下载均带 UA 头——ZeoSeven 对无 UA 请求返回空包。）
