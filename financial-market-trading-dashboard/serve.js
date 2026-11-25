/* Tiny static file server for trying the dashboards over http:
 *   node serve.js            then open http://localhost:8080/
 * No dependencies. Not for production. */
var http = require("http");
var fileSystem = require("fs");
var path = require("path");

var port = process.argv.length > 2 ? Number(process.argv[2]) : 8080;
var mimeTypes = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain; charset=utf-8" };

http.createServer(function(request, response) {
  var requestedPath = decodeURIComponent(request.url.split("?")[0]);
  var filePath = path.join(__dirname, requestedPath);

  if(filePath.indexOf(__dirname) !== 0) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if(fileSystem.existsSync(filePath) && fileSystem.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  fileSystem.readFile(filePath, function(error, content) {
    if(error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    response.end(content);
  });
}).listen(port, function() {
  console.log("Serving " + __dirname + " at http://localhost:" + port + "/");
});
