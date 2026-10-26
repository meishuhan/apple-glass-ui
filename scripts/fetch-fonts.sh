#!/usr/bin/env bash
# 生成自托管字体：Inter（英文数字）+ 思源黑体 Noto Sans SC（中文，101 个 unicode-range 小文件，可变字重）
# 来源：npm @fontsource-variable/*（SIL OFL 1.1，可商用与分发）。用法：fetch-fonts.sh <输出目录，如 src/main/resources/static/css>
set -euo pipefail
OUT="${1:?用法: fetch-fonts.sh <输出目录>}"
INTER=5.3.0; NOTO=5.3.1
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
( cd "$T" && npm pack --silent "@fontsource-variable/inter@$INTER" "@fontsource-variable/noto-sans-sc@$NOTO" >/dev/null
  mkdir inter noto && tar xzf fontsource-variable-inter-*.tgz -C inter && tar xzf fontsource-variable-noto-sans-sc-*.tgz -C noto )
mkdir -p "$OUT/fonts"
cp "$T"/noto/package/files/*.woff2 "$OUT/fonts/"
cp "$T"/inter/package/files/inter-latin-wght-normal.woff2 "$T"/inter/package/files/inter-latin-ext-wght-normal.woff2 "$OUT/fonts/"
cp "$T/noto/package/LICENSE" "$OUT/fonts/LICENSE-NotoSansSC-OFL.txt"; cp "$T/inter/package/LICENSE" "$OUT/fonts/LICENSE-Inter-OFL.txt"
python3 - "$T" "$OUT" <<'PY'
import re, sys
t, out = sys.argv[1:3]
css = "/* 自托管字体（SIL OFL 1.1）：Inter + Noto Sans SC，来源 @fontsource-variable */\n"
inter = open(f"{t}/inter/package/wght.css").read()
for m in re.finditer(r'(/\* inter-(latin|latin-ext)-wght-normal \*/\s*@font-face \{.*?\})', inter, flags=re.S):
    css += m.group(1).replace('url(./files/', 'url(./fonts/') + "\n\n"
css += open(f"{t}/noto/package/wght.css").read().replace('url(./files/', 'url(./fonts/')
open(f"{out}/fonts.css", "w").write(css)
PY
echo "完成：$OUT/fonts.css 与 $OUT/fonts/（$(du -sh "$OUT/fonts" | cut -f1)）。页面中加载 fonts.css，并把 font-family 设为 \"Inter Variable\", \"Noto Sans SC Variable\", system-ui, sans-serif"
