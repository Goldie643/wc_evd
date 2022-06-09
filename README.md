#  ![WCEVD_favicon](favicon.png) WCEVD
## Water-Cherenkov Event Display (WIP)

This is a Python-served, Javascript-based event display for water Cherenkov
detectors, currently limited to Super-Kamiokande with scope to also support
WCSim output.

WCEVD can be run remotely or locally, but the JS event display itself is viewed
in your browser, meaning no slow and janky zooming. It uses
[three.js](https://threejs.org/) for the event display, and supports both 3D and
2D views.

Python is used to serve the event information which is extracted from the ROOT
files using [Uproot3](https://github.com/scikit-hep/uproot3) (I will at some
point update it to support both Uproot3 and 4). If you have no data you will
also need [NumPy](https://numpy.org/install/) and
[pandas](https://pandas.pydata.org/getting_started.html) to generate random
hits.

### Quick-Start

First install Uproot3 if you do not have it already using ``pip`` (pass the
``--user`` flag if you are working without root access):

``pip install uproot3``

Then run the server, with your data as the first argument.

``python serve.py data.root``

Follow the instructions printed out and you're good to go.


<!-- It will find a free port and give instructions on how to access the display. If
you are running locally, i.e. you're running the server from the same machine
your browser is on, then you will simply need to navigate to ``localhost:PORT`` 
where ``PORT`` is the port number the server will tell you.

For running remotely, you will need to open an SSH tunnel for the server to send
the data to your machine. You do this by opening a new terminal and SSHing with
the ``-L`` flag, e.g. ``ssh -L 8000:cluster01:PORT goldie643@cluster01``. The  -->