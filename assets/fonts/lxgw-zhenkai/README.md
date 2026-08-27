# LXGW ZhenKai

Ling 在咨询师来信、反思文字和短句中使用霞鹜臻楷。浏览器实际加载
`LXGWZhenKaiGB-Regular.woff2`；`LXGWZhenKaiGB-Regular.ttf` 是保留在仓库中的上游源文件。

- 来源：https://github.com/lxgw/LxgwZhenKai
- 版本：v0.825
- 许可：SIL Open Font License 1.1，副本见 `OFL.txt`

上游保留了若干字体名称，并对网页子集另有附加许可。本仓库的 WOFF2 仅随 Ling 客户端作为网页字体加载，不作为可安装桌面字体单独发布；重新分发或改变使用方式时必须继续遵守 `OFL.txt` 中的 Reserved Font Name 和 Additional Permission 条款。

## 运行时子集

WOFF2 不是完整字体，而是从当前仓库静态文本生成的子集。字符采集覆盖仓库中的
`.ts`、`.tsx`、`.css`、`.json`、`.html`、`.mjs` 和 `.md` 文件，排除依赖、Git 数据、
构建产物和发布产物；仅保留源 TTF 实际支持的可打印字符。生成过程保留 hinting 和
OpenType layout features。当前输出约 0.7 MB，完整 WOFF2 约 9 MB，源 TTF 约 17.5 MB。

用户姓名、会谈内容、咨询师动态生成的来信，以及未来新加入但尚未重新生成子集的字符，
可能不在该 WOFF2 中。`--font-letter` 与 `--font-quote` 会按字符回退到已内置的
`Noto Serif SC`，因此内容仍能完整显示；罕见字符可能与相邻臻楷字形略有风格差异。

## 重新生成

以下命令需要 Python FontTools（提供 `pyftsubset`）及其 WOFF2 支持。先在仓库根目录
采集字符，再从源 TTF 生成运行时文件：

```bash
python3 - <<'PY'
from pathlib import Path
from fontTools.ttLib import TTFont

root = Path(".").resolve()
extensions = {".ts", ".tsx", ".css", ".json", ".html", ".mjs", ".md"}
excluded_parts = {".git", ".vite", "node_modules", "dist", "dist-electron", "release"}
source_text = ""

for path in root.rglob("*"):
    if not path.is_file() or path.suffix.lower() not in extensions:
        continue
    if any(part in excluded_parts for part in path.relative_to(root).parts):
        continue
    try:
        source_text += path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        pass

font_path = root / "assets/fonts/lxgw-zhenkai/LXGWZhenKaiGB-Regular.ttf"
font = TTFont(font_path, lazy=True)
supported = set()
for table in font["cmap"].tables:
    if table.isUnicode():
        supported.update(table.cmap)
font.close()

characters = sorted(
    {character for character in source_text if character.isprintable() and ord(character) in supported},
    key=ord,
)
Path("/tmp/ling-lxgw-static-characters.txt").write_text("".join(characters), encoding="utf-8")
print(f"Collected {len(characters)} supported printable characters")
PY

pyftsubset assets/fonts/lxgw-zhenkai/LXGWZhenKaiGB-Regular.ttf \
  --text-file=/tmp/ling-lxgw-static-characters.txt \
  --output-file=assets/fonts/lxgw-zhenkai/LXGWZhenKaiGB-Regular.woff2 \
  --flavor=woff2 \
  --layout-features='*' \
  --notdef-glyph \
  --notdef-outline \
  --recommended-glyphs
```

修改静态文案后应重新运行以上命令，并执行字体主题测试。
