"""Threaded HTTP server for local TesJEE testing."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os, sys

PORT = 8765
DIR = r"c:\Users\vinit\Desktop\TesJEE\app"
os.chdir(DIR)

class Q(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stdout.write("%s - %s\n" % (self.address_string(), fmt % args))
        sys.stdout.flush()

with ThreadingHTTPServer(("127.0.0.1", PORT), Q) as srv:
    print(f"Serving {DIR} on http://127.0.0.1:{PORT}")
    sys.stdout.flush()
    srv.serve_forever()
