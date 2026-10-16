"""Local development preview with the extension's real content security policy."""
import http.server
import json
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[1]
CSP = json.loads((ROOT / "extension/manifest.json").read_text())["content_security_policy"]["extension_pages"]


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Content-Security-Policy", CSP)
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    os.chdir(ROOT)
    print("Extension preview: http://127.0.0.1:8766/extension/panel.html", flush=True)
    http.server.ThreadingHTTPServer(("127.0.0.1", 8766), Handler).serve_forever()
