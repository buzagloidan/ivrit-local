"""Render the source policy into the packaged HTML; no third-party Markdown engine."""
from pathlib import Path
import html
import re
ROOT = Path(__file__).resolve().parents[1]
def inline(text):
    escaped = html.escape(text)
    escaped = re.sub(r'\[([^\]]+)\]\((https://[^\s)]+)\)', r'<a href="\2" target="_blank" rel="noopener">\1</a>', escaped)
    escaped = re.sub(r'`([^`]+)`', r'<code>\1</code>', escaped)
    return re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', escaped)
blocks = []
for block in (ROOT / 'PRIVACY.md').read_text().split('\n\n'):
    if block.startswith('# '): blocks.append('<h1>'+inline(block[2:])+'</h1>')
    elif block.startswith('## '): blocks.append('<h2>'+inline(block[3:])+'</h2>')
    elif block.startswith('- '):
        rows = re.split(r'\n- ',block[2:])
        blocks.append('<ul>'+''.join('<li>'+inline(row.replace('\n',' '))+'</li>' for row in rows)+'</ul>')
    else: blocks.append('<p>'+inline(block.replace('\n',' '))+'</p>')
page = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ivrit Local privacy policy</title><link rel="stylesheet" href="panel.css"></head><body><main>'+ '\n'.join(blocks)+'</main></body></html>\n'
(ROOT / 'extension/privacy.html').write_text(page)
