import sys
import uproot
import pandas as pd
import numpy as np
import http.server
import socketserver

# Cols needed from file
cols = [
    "BONSAI*",
    "cable",
    "t",
    "q"
]


def make_event_json(self):
    # Prep the file to plot events from
    f = sys.argv[1]
    f = uproot.open(f)["wit"]
    df = f.pandas.df(cols, flatten=False)
    # json = df.iloc[0][["cable","t","q"]].to_json()

    df = df.rename(columns={
        "BONSAI.bx" : "x",
        "BONSAI.by" : "y",
        "BONSAI.bz" : "z"
    })

    df["x_dir"] = np.cos(df["BONSAI.btheta"])
    df["y_dir"] = np.sin(df["BONSAI.btheta"])
    df["z_dir"] = np.sin(df["BONSAI.bphi"])

    # json = '{"x" : %i, "y" : %i, "z" : %i,' % 
    # json += '"x_dir" : 0.1, "y_dir" : 0.3, "z_dir" : 0.4}'
    # json = df.iloc[0][["x","y","z","x_dir","y_dir","z_dir"]].to_json()
    json = df.iloc[2].to_json()

    self.send_response(200)
    self.send_header("Content-type", "application/json")
    self.end_headers()

    self.wfile.write(bytes(json, "utf8"))
    
    return

class MyHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.path = 'index.html'
        elif self.path == "/event.json":
            return make_event_json(self)
        
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

# Create an object of the above class
handler_object = MyHttpRequestHandler

PORT = 8000
my_server = socketserver.TCPServer(("", PORT), handler_object)

# Star the server
print("Server started at localhost:" + str(PORT))
my_server.serve_forever()
