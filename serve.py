import sys
import uproot
import pandas as pd
import numpy as np
import http.server
import socketserver

class WCEVDRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, df):
        self.df = df
        self.event_i = 0
        return
    
    def __call__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def make_event_json(self):
        json = self.df.iloc[self.event_i].to_json()

        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()

        self.wfile.write(bytes(json, "utf8"))
        
        return

    def do_GET(self):
        if self.path == '/favicon.ico':
            return

        if self.path == '/':
            self.path = 'index.html'
        elif self.path == "/event.json":
            return self.make_event_json()
        elif self.path == '/next':
            self.event_i += 1
            html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset=\"utf-8\">
                <script>setTimeout(function(){{ window.location.replace('/'); }}, 0);</script>
            </head>
            <body>
                <h1>Loading...</h1>
            </body>
            </html>
            """

            self.wfile.write(bytes(html, "utf8"))

            return
        
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

# Cols needed from file
cols = [
    "BONSAI*",
    "cable",
    "t",
    "q"
]

# Prep the file to plot events from
f = sys.argv[1]
f = uproot.open(f)["wit"]
df = f.pandas.df(cols, flatten=False)
df = df.rename(columns={
    "BONSAI.bx" : "x",
    "BONSAI.by" : "y",
    "BONSAI.bz" : "z",
    "BONSAI.btheta" : "theta",
    "BONSAI.bphi" : "phi"
})

df["x_dir"] = np.cos(df["theta"])
df["y_dir"] = np.sin(df["theta"])
df["z_dir"] = np.sin(df["phi"])

# Create an object of the above class
handler = WCEVDRequestHandler(df)

PORT = 8000
my_server = socketserver.TCPServer(("", PORT), handler)

# Star the server
print("Server started at localhost:" + str(PORT))
my_server.serve_forever()
