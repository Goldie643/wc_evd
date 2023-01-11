import os
import sys
import uproot

# Cols needed from file
cols = [
    # "BONSAI*", # Online
    "bsvertex*",
    "bsdir*",    
    "nrunsk",
    "nsubsk",
    "nevsk",
    "swtrigger*",
    "ndaysk*",
    # "ntimsk*", # Not stored properly in WIT
    "bsenergy",
]

def generate_random_hits():
    import random
    import numpy as np
    import pandas as pd
    print("NO DATA FILE GIVEN, GENERATING RANDOM EVENTS")

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

    return df

if len(sys.argv) > 1:
    # Prep the file to plot events from
    fname = sys.argv[1]
    f = uproot.open(fname)
    # Get tree name, check if it's WIT or SKROOT
    # Comes as bytes-like, decode to string
    tree = f.keys()[0].decode("utf-8")
    # Has ; if more than one Tree (I think)
    # Split at the ; and get the base text
    tree = tree.split(";")[0]

    df = f[tree].pandas.df(cols, flatten=False)
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
        "ndaysk[3][2]" : "day",
        # "cables" : "cable", # convert to WIT style for consistency
        # "T" : "t",
        # "Q" : "q"
    })

    # Individually import hit info because uproot gets confused with duplicate
    # branch names
    # For some reason WIT has different hit info names
    if tree == "wit":
        # WIT doesn't store OD hit info
        cols.extend(["cable","t","q"])
    elif tree == "data":
        df_id = f[tree].pandas.df(["TQREAL/T","TQREAL/Q","TQREAL/cables"], 
            flatten=False)
        df_od = f[tree].pandas.df(["TQAREAL/T","TQAREAL/Q","TQAREAL/cables"], 
            flatten=False)
        
        # df_id.columns = ["t_id", "q_id", "cable_id"]
        # df_od.columns = ["t_od", "q_od", "cable_od"]

        # Take two series numpy arrays, change them to lists and concat them
        def concat_list_col(s1, s2, k1, k2=""):
            # Keys
            if k2 == "":
                k2 = k1
            s1_lst = s1[k1].apply(lambda x: x.tolist())
            s2_lst = s2[k2].apply(lambda x: x.tolist())
            
            return s1_lst + s2_lst

        # Use WIT naming convention
        df["t"] = concat_list_col(df_id, df_od, "T")
        df["q"] = concat_list_col(df_id, df_od, "Q")
        df["cable"] = concat_list_col(df_id, df_od, "cables")

    # Check if the cables need to be converted from 32 to 16 bit... I think
    if df.iloc[0]["cable"][0] > 11146:
        df["cable"] = df["cable"].apply(lambda x: [y & 65535 for y in x])
else:
    df = generate_random_hits()

event_dir = "./event_data/"
if not os.path.exists(event_dir):
    os.makedirs(event_dir)
for i in range(len(df)):
    df.iloc[i].to_json("%sevent_%i.json" % (event_dir, i))