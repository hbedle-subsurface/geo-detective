"""Bundle Geo-Detective into one self-contained HTML file (dist/geo-detective.html).

Inlines the CSS, the engine scripts, every built-in case listed in index.html, and every
JSON case in cases/submitted/. The GoatCounter tag is removed so offline copies are not counted.
Usage: python3 tools/build_single_file.py [--no-submitted] [--out path]
"""
import json, re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
args = sys.argv[1:]
out = pathlib.Path(args[args.index('--out') + 1]) if '--out' in args else root / 'dist' / 'geo-detective.html'
html = (root / 'index.html').read_text(encoding='utf-8')

html = re.sub(r'\s*<!-- GoatCounter.*?-->\s*<script data-goatcounter[^>]*></script>', '\n', html, flags=re.S)
html = html.replace('<link rel="stylesheet" href="css/style.css">',
                    '<style>\n' + (root / 'css/style.css').read_text(encoding='utf-8') + '\n</style>')

def inline(m):
    src = m.group(1)
    code = (root / src).read_text(encoding='utf-8').replace('</script', '<\\/script')
    return '<script>/* ' + src + ' */\n' + code + '\n</script>'
html = re.sub(r'<script src="([^"]+)"></script>', inline, html)

if '--no-submitted' not in args:
    extra = []
    for f in sorted((root / 'cases' / 'submitted').glob('*.json')):
        obj = json.loads(f.read_text(encoding='utf-8'))
        extra.append('GW.registerCase(' + json.dumps(obj).replace('</', '<\\/') + ');')
    if extra:
        html = html.replace('<script>GW.start();</script>',
                            '<script>/* cases/submitted */\n' + '\n'.join(extra) + '\n</script>\n  <script>GW.start();</script>')

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding='utf-8')
print('wrote', out, round(out.stat().st_size / 1024), 'KB')
