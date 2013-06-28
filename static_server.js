//modified version of https://gist.github.com/rpflorence/701407
//added Content-Type detector

//detects Content-Type by filename
function CT(fname) {
	var ext_from = fname.lastIndexOf(".");
	if (ext_from == -1) return "text/plain";
	switch (fname.substr(ext_from+1)) {
	case "html": return "text/html"; break;
	case "js": return "text/javascript"; break;
	case "jpg": return "image/jpeg"; break;
	default: return "text/plain";
	}
}

var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs")
    port = process.argv[2] || 8888;
 
http.createServer(function(request, response) {
 
  var uri = url.parse(request.url).pathname
    , filename = path.join(process.cwd(), uri);
  
  fs.exists(filename, function(exists) {
    if(!exists) {
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write("404 Not Found\n");
      response.end();
      return;
    }
 
    if (fs.statSync(filename).isDirectory()) filename += '/index.html';
 
    fs.readFile(filename, "binary", function(err, file) {
      if(err) {        
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(err + "\n");
        response.end();
        return;
      }
 
      response.writeHead(200, {"Content-Type": CT(filename)});
      response.write(file, "binary");
      response.end();
    });
  });
}).listen(parseInt(port, 10));
 
console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
