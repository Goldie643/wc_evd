import sys
import uproot
import pandas as pd
import numpy as np
import http.server
import socketserver

class WCEVDRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, df):
        self.df = df
        return
    
    def __call__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def make_event_json(self):
        json = self.df.iloc[2].to_json()

        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()

        self.wfile.write(bytes(json, "utf8"))
        
        return

    def do_GET(self):
        if self.path == '/':
            self.path = 'index.html'
        elif self.path == "/event.json":
            return self.make_event_json()
        
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
    "BONSAI.bz" : "z"
})

df["x_dir"] = np.cos(df["BONSAI.btheta"])
df["y_dir"] = np.sin(df["BONSAI.btheta"])
df["z_dir"] = np.sin(df["BONSAI.bphi"])

# Create an object of the above class
handler = WCEVDRequestHandler(df)

PORT = 8000
my_server = socketserver.TCPServer(("", PORT), handler)

# Star the server
print("Server started at localhost:" + str(PORT))
my_server.serve_forever()
