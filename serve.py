import sys
import uproot
import http.server
import socketserver
import numpy as np
from urllib import parse

class WCEVDRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, df):
        self.df = df
        self.event_i = 0
        self.loading_page = f"""
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

    # Iterate up the event index to show
    def next(self):
        self.event_i += 1

        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()

        self.wfile.write(bytes(self.loading_page, "utf8"))

        return

    # Iterate down the event index to show
    def prev(self):
        self.event_i -= 1

        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()

        self.wfile.write(bytes(self.loading_page, "utf8"))

        return

    # Get the event with the passed nevsk
    def event(self, nevsk):
        # Get index matching the passed nevsk
        event_i = np.where(self.df["nevsk"] == nevsk)[0]
        if len(event_i) > 0:
            event_i = event_i[0]
            self.event_i = event_i
        else:
            self.send_response(404)
            self.end_headers()
            return

        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()

        self.wfile.write(bytes(self.loading_page, "utf8"))

        return

    def do_GET(self):
        if self.path == '/':
            self.path = 'index.html'
        elif self.path == "/event.json":
            return self.make_event_json()
        elif self.path == '/next':
            self.next()
            return
        elif self.path == '/prev':
            self.prev()
            return

        qs = parse.parse_qs(parse.urlsplit(self.path).query)
        if "event" in qs:
            self.event(int(qs["event"][0]))
            return
        
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

# Cols needed from file
cols = [
    # "BONSAI*", # Online
    "bsvertex*",
    "bsdir*",    
    "cable",
    "t",
    "q",
    "nrunsk",
    "nsubsk",
    "nevsk",
    "swtrigger*",
    "ndaysk*",
    # "ntimsk*", # Not stored properly in WIT
    "bsenergy"
]

# Prep the file to plot events from
f = sys.argv[1]
f = uproot.open(f)["wit"]
df = f.pandas.df(cols, flatten=False)
df = df.rename(columns={
    # "BONSAI.bx" : "x",
    # "BONSAI.by" : "y",
    # "BONSAI.bz" : "z",
    # "BONSAI.btheta" : "theta",
    # "BONSAI.bphi" : "phi",
    "bsvertex[4][0]" : "bx",
    "bsvertex[4][1]" : "by",
    "bsvertex[4][2]" : "bz",
    "bsvertex[4][3]" : "bt",
    "bsdir[3][0]" : "x_dir",
    "bsdir[3][1]" : "y_dir",
    "bsdir[3][2]" : "z_dir",
    "swtrigger.trigid" : "trigid",
    "ndaysk[3][0]" : "year",
    "ndaysk[3][1]" : "month",
    "ndaysk[3][2]" : "day"
})

# df["x_dir"] = np.cos(df["theta"])
# df["y_dir"] = np.sin(df["theta"])
# df["z_dir"] = np.sin(df["phi"])

# Create an object of the above class
handler = WCEVDRequestHandler(df)

PORT = 8001
my_server = socketserver.TCPServer(("", PORT), handler)

# Star the server
print("Server started at localhost:" + str(PORT))
my_server.serve_forever()
