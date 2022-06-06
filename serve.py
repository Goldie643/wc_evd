import sys
import uproot
import http.server
import socket
import socketserver
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

        # If no matches or what's passed isn't an int, send 404
        try:
            event_i = int(event_i[0])
        except (ValueError, IndexError) as e:
            print("Passed event number does not exist in file.")
            self.send_response(404)
            self.end_headers()
            return

        # Otherwise, set the event_i and go and make it
        self.event_i = event_i

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

if len(sys.argv) > 1:
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
else:
    import random
    import numpy as np
    import pandas as pd
    print("GENERATING RANDOM EVENTS")

    n_rand_events = 10
    skr = 1690 # Radius of SK
    skhh = 1810 # Half height of SK
    # Generate random events
    brs = [random.uniform(0, skr*skr) for x in range(n_rand_events)]
    brs = [np.sqrt(br) for br in brs]
    bys = [br*np.cos(br) for br in brs]
    bxs = [br*np.sin(br) for br in brs]
    bzs = [random.uniform(-skhh, skhh) for x in range(n_rand_events)]
    bts = [0]*n_rand_events
    x_dirs = [random.uniform(0, 1) for x in range(n_rand_events)]
    y_dirs = [random.uniform(0, 1) for x in range(n_rand_events)]
    z_dirs = [random.uniform(0, 1) for x in range(n_rand_events)]

    for i,xd,yd,zd in zip(range(n_rand_events), x_dirs, y_dirs, z_dirs):
        r = np.sqrt(xd*xd+yd*yd+zd*zd)
        x_dirs[i] = xd/r
        y_dirs[i] = yd/r
        z_dirs[i] = zd/r

    # Make it obvious the event is random
    rand_txt = "RANDOM_EVENT"
    trigids = [rand_txt]*n_rand_events
    nrunsks = [rand_txt]*n_rand_events
    nsubsks = [rand_txt]*n_rand_events
    nevsks = list(range(n_rand_events))
    years = ["1996"]*n_rand_events
    months = ["01"]*n_rand_events
    days = ["01"]*n_rand_events

    nhits = [random.randint(20,150) for x in range(n_rand_events)]
    bses = [x/10 for x in nhits]
    cables = []
    ts = []
    qs = []
    for nhit in nhits:
        cables.append([random.randint(1,11146) for x in range(nhit)])
        ts.append([random.gauss(0,10) for x in range(nhit)])
        q_temp = [random.gauss(0,0.5) for x in range(nhit)]
        qs.append([np.abs(q) for q in q_temp])

    df = pd.DataFrame({
        "bx" : bxs,
        "by" : bys,
        "bz" : bzs,
        "bt" : bts,
        "bsenergy" : bses,
        "x_dir" : x_dirs,
        "y_dir" : y_dirs,
        "z_dir" : z_dirs,
        "trigid" : trigids,
        "nrunsk" : nrunsks,
        "nsubsk" : nsubsks,
        "nevsk" : nevsks,
        "year" : years,
        "month" : months,
        "day" : days,
        "cable" : cables,
        "t" : ts,
        "q" : qs
    }
    )

# df["x_dir"] = np.cos(df["theta"])
# df["y_dir"] = np.sin(df["theta"])
# df["z_dir"] = np.sin(df["phi"])

# Create an object of the above class
handler = WCEVDRequestHandler(df)

sock = socket.socket()
sock.bind(("",0))
PORT = sock.getsockname()[1]
sock.close()

my_server = socketserver.TCPServer(("", PORT), handler)

# Star the server
print("Server started at localhost:" + str(PORT))
my_server.serve_forever()
