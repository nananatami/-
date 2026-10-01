"""Cache the official font subsets needed by the current page, preserving notices."""
import concurrent.futures
import pathlib
import re
import subprocess
import urllib.request
import uuid

root = pathlib.Path(__file__).resolve().parent
output = root / 'assets' / 'fonts'
output.mkdir(parents=True, exist_ok=True)
html = (root / 'index.html').read_text(encoding='utf-8')
text = re.sub(r'<[^>]+>', '', html)
families = [
    ('155', '一梦工作室'),
    ('14', text + '开启动画暂停动态'),
    ('628', text + '0123456789×梦✳∞'),
]
jobs = {}
styles = []

def fetch(url):
    temporary = output / (str(uuid.uuid4()) + '.tmp')
    try:
        subprocess.run(['powershell', '-NoProfile', '-File', str(root / 'cache-font-download.ps1'), '-Url', url, '-Destination', str(temporary)], check=True, capture_output=True)
        data = temporary.read_bytes()
        if not data:
            raise ValueError('Empty font response: ' + url)
        return data
    finally:
        temporary.unlink(missing_ok=True)

def includes(rule, points):
    match = re.search(r'unicode-range:([^;}]+)', rule)
    if not match:
        return True
    for start, end in re.findall(r'U\+([0-9a-fA-F]+)(?:-([0-9a-fA-F]+))?', match.group(1)):
        low, high = int(start, 16), int(end or start, 16)
        if any(low <= point <= high for point in points):
            return True
    return False

for font_id, characters in families:
    base = f'https://fontsapi.zeoseven.com/{font_id}/main/'
    css = fetch(base + 'result.css').decode('utf-8')
    styles.extend(re.findall(r'/\*[\s\S]*?\*/', css))
    for rule in re.findall(r'@font-face\s*\{[^}]+\}', css):
        if not includes(rule, set(map(ord, characters))):
            continue
        for url in re.findall(r'url\([\"\']?([^\)\"\']+)', rule):
            resolved = urllib.request.urljoin(base, url)
            filename = font_id + '-' + resolved.rsplit('/', 1)[-1]
            jobs[filename] = resolved
            rule = rule.replace(url, './' + filename)
        styles.append(rule)

jobs['ak-main.woff2'] = 'https://fontsapi.zeoseven.com/ak/main.woff2'
styles.append('@font-face{font-family:"ZSFT-ak";src:url("./ak-main.woff2") format("woff2");font-style:normal;font-weight:400;font-display:swap;}')

def download(item):
    filename, url = item
    file = output / filename
    if not file.exists() or file.stat().st_size == 0:
        file.write_bytes(fetch(url))
    return file.stat().st_size

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    sizes = list(pool.map(download, jobs.items()))
(output / 'fonts.css').write_text('\n'.join(styles), encoding='utf-8')
print(f'Cached {len(jobs)} font files, {sum(sizes):,} bytes.')
