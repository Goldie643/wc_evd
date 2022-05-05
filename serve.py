import http.server
import socketserver

def make_hits_json(self):
    # json = df.to_json()
    json = '{"cables" : [0, 1234, 5893, 11000]}'

    self.send_response(200)
    self.send_header("Content-type", "application/json")
    self.end_headers()

    self.wfile.write(bytes(json, "utf8"))
    
    return
class MyHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.path = 'index.html'
        elif self.path == "/hits.json":
            return make_hits_json(self)
        
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

# Create an object of the above class
handler_object = MyHttpRequestHandler

PORT = 8000
my_server = socketserver.TCPServer(("", PORT), handler_object)

# Star the server
print("Server started at localhost:" + str(PORT))
my_server.serve_forever()
