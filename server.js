var sys = require('sys');
var http = require('http');
var static = require('node-static');
var fs = require('fs');
var url = require('url');

var fileServer = new static.Server('.');

var img_count = 0;
var img_folder = "img/";

http.createServer(function (req, res) {
	if (req.method == "GET")
	{
		var pathname = url.parse(req.url, true).pathname;
		
		if (pathname == "/index.html" || pathname == "/")
		{
			var data = fs.readFileSync("index.html", "utf-8");
			data = data.replace(
				/\/\*server data from\*\/[\d\D]*\/\*server data to\*\//,
				"\""+img_folder+img_count+".png\"");
			req.addListener('end', function () {
				res.writeHead(200, {'Content-Type': 'text/html'});
				res.write(data);
				res.end();
			});
			return;
		}
	}
	else
	if (req.method == "POST")
	{
		var data = "";
		req.addListener('data', function (chunk) {
			data += chunk;
		}).addListener('end', function () {
			try {
				fs.writeFile(img_folder+(++img_count)+".png",
				             data.substr(22), "base64",
				             function (err) {
					if (err) throw err;
					console.log(img_count+" image(s) saved");
				});
			} catch(e) {
				res.writeHead(400, {'Content-Type': 'text/plain'});
				res.write(e.toString());
				res.end();
			}
			res.writeHead(200, {'Content-Type': 'text/plain'});
			res.write('Done!');
			res.end();
		});
		return;
	}
	req.addListener('end', function () {
		fileServer.serve(req, res);
	});
}).listen(9004);
