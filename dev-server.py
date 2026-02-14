#!/usr/bin/env python3
"""
TFXS Affiliates — Local Dev Server
Mimics Netlify clean URLs: /login → /login.html, / → /index.html
Usage: python3 dev-server.py [port]
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 9999
DIR = os.path.dirname(os.path.abspath(__file__))

# Build rewrite map from _redirects file
REWRITES = {}
redirects_path = os.path.join(DIR, "_redirects")
if os.path.exists(redirects_path):
    with open(redirects_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            if len(parts) >= 3:
                REWRITES[parts[0]] = parts[1]

class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def do_GET(self):
        # Strip query string for path matching
        path = self.path.split("?")[0].split("#")[0]

        # Check rewrites from _redirects
        if path in REWRITES:
            self.path = REWRITES[path]
            return super().do_GET()

        # If path has no extension and is not a directory, try adding .html
        if "." not in os.path.basename(path) and not path.endswith("/"):
            html_path = os.path.join(DIR, path.lstrip("/") + ".html")
            if os.path.isfile(html_path):
                self.path = path + ".html"
                return super().do_GET()

        return super().do_GET()

    def log_message(self, format, *args):
        # Color-coded logging
        status = args[1] if len(args) > 1 else ""
        color = "\033[32m" if "200" in str(status) else "\033[31m"
        print(f"{color}{args[0]}\033[0m — {self.path}")

print(f"""
╔══════════════════════════════════════════════════╗
║  🔴 TFXS Affiliates v2 — Dev Server             ║
║  http://localhost:{PORT}                          ║
║  Clean URLs enabled (Netlify-compatible)         ║
║  Press Ctrl+C to stop                            ║
╚══════════════════════════════════════════════════╝
""")

with http.server.HTTPServer(("", PORT), CleanURLHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped.")
