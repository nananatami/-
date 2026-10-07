"""重建首屏标题的单文件字体 assets/fonts/rrpl-logo.woff2。

从 index.html 的 .studio-title 读取标题文字，下载所需子集块，
合并为一个只含这些字形的 woff2。改标题文字后运行即可（纯 Python，跨平台）。

运行（需要 fontTools + brotli，任选一种）：
    uv run --with fonttools --with brotli python tools/make-hero-font.py
    pip install fonttools brotli && python tools/make-hero-font.py
"""

import pathlib
import re
import shutil
import sys
import tempfile
import urllib.parse
import urllib.request

try:
    from fontTools.ttLib import TTFont
    from fontTools.subset import Subsetter, Options
    from fontTools.merge import Merger
except ImportError:
    sys.exit(
        "缺少 fontTools/brotli。先安装（pip install fonttools brotli）或用 uv 拉起：\n"
        "  uv run --with fonttools --with brotli python tools/make-hero-font.py"
    )

api_base = "https://fontsapi.zeoseven.com/155/main/"
title = "一梦工作室"  # title 内可能加标签，不再用正则查找

root = pathlib.Path(__file__).resolve().parent.parent
fonts_dir = root / "assets" / "fonts"
dest = fonts_dir / "rrpl-logo.woff2"

# html = (root / "index.html").read_text(encoding="utf-8")
# match = re.search(r'<div class="studio-title">([^<]+)</div>', html)
# if not match:
#     sys.exit("index.html 里没找到 .studio-title 的标题文字")
# title = match.group(1).strip()
points = sorted(set(map(ord, title)))
print(f"标题：{title}（{len(points)} 个字形）")


def fetch(url, path):
    """下载 URL 到指定路径，返回字节。"""
    request = urllib.request.Request(
        url, headers={"User-Agent": "Mozilla/5.0"}
    )  # 无 UA 会被服务端回 204
    with urllib.request.urlopen(request, timeout=30) as response:
        data = response.read()
    path.write_bytes(data)
    if not data:
        raise ValueError(f"空响应：{url}")
    return data


def includes(rule, points):
    """unicode-range 与目标字符是否有交集。"""
    match = re.search(r"unicode-range:([^;}]+)", rule)
    if not match:
        return True
    for start, end in re.findall(
        r"U\+([0-9a-fA-F]+)(?:-([0-9a-fA-F]+))?", match.group(1)
    ):
        low, high = int(start, 16), int(end or start, 16)
        if any(low <= point <= high for point in points):
            return True
    return False


def main():
    work = pathlib.Path(tempfile.mkdtemp(prefix="hero-font-"))
    try:
        css = fetch(api_base + "result.css", work / "result.css").decode("utf-8")
        urls = []
        for rule in re.findall(r"@font-face\s*\{[^}]+}", css):
            if includes(rule, set(points)):
                for url in re.findall(r"url\([\"\']?([^\)\"\']+)", rule):
                    urls.append(urllib.parse.urljoin(api_base, url))
        urls = list(dict.fromkeys(urls))
        if not urls:
            sys.exit("没找到覆盖这些字的子集块，检查标题里是否有该字体未收录的字")
        print(f"来源块：{len(urls)} 个，开始下载并合并...")

        source_times = None
        parts = []
        for index, url in enumerate(urls, 1):
            blob = work / f"{index}.woff2"
            fetch(url, blob)
            font = TTFont(blob)
            if source_times is None:
                source_times = (font["head"].created, font["head"].modified)
            cmap = set(font.getBestCmap())
            keep = [point for point in points if point in cmap]
            if not keep:
                continue
            options = Options()
            options.drop_tables += ["DSIG"]
            subsetter = Subsetter(options=options)
            subsetter.populate(unicodes=set(keep))
            subsetter.subset(font)
            font.flavor = None
            font.recalcTimestamp = False  # 部件同样固定，否则重复构建仍有差异
            part = work / f"{index}.ttf"
            font.save(part)
            parts.append(part)
        if not parts:
            sys.exit("没有任何子集块包含目标字形")

        merged = Merger().merge([str(part) for part in parts])
        merged.flavor = "woff2"
        merged.recalcTimestamp = False  # 固定时间戳，重复构建字节一致
        merged["head"].created, merged["head"].modified = (
            source_times  # Merger 会盖当前时间戳，回填源值
        )
        merged.save(dest)

        check = TTFont(dest)
        got = set(check.getBestCmap())
        missing = [chr(point) for point in points if point not in got]
        print(
            f"已写入 {dest.relative_to(root)}：{dest.stat().st_size:,} 字节，{len(got)} 个字形"
        )
        if missing:
            print(f'注意：这些字在字体里没有收录，会回退到其它字体 {" ".join(missing)}')
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    main()
