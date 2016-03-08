'use strict';

var express = require('express');
var router = express.Router();
var fs = require('fs');

require('./_polyfill');

if (String.prototype.endsWith == undefined) {
  String.prototype.endsWith = function(str) {
    if (this.length < str.length)
      return false;
    
    for (var i=0; i<str.length; i++) {
      if (this[this.length-str.length+i] != str[i]) {
        return false;
      }
    }
    
    return true;
  }
}

/* GET home page. */
router.get('/', function(req, res, next) {
  var buf = fs.readFileSync("public/main.html")
  
  res.set("Content-Type", "text/html");
  res.send(buf);
});

router.get("/gamedata", function(req, res, next) {
  var buf = fs.readFileSync("blender/designer.blend")
  
  res.set("Content-Type", "application/x-octet-stream");
  res.send(buf);
});

function getMimeType(path) {
  path = path.toLowerCase();
  
  if (path.endsWith(".html"))
    return "text/html"
  if (path.endsWith(".js"))
    return "application/javascript"
  if (path.endsWith(".json"))
    return "application/json"
  if (path.endsWith(".blend"))
    return "application/x-octet-stream"
  if (path.endsWith(".png"))
    return "image/png"
  if (path.endsWith(".jpg"))
    return "image/jpeg"
  if (path.endsWith(".gif"))
    return "image/gif"
  if (path.endsWith(".dxf"))
    return "image/dxf"
  
  return "application/x-octet-stream";
}

/*
router.get(/\/characters\/.+/, function(req, res, next) {
  var path = req.path;
  var path2 = "";
  
  for (var i=0; i<path.length; i++) {
    if (path[i] == "%") {
      if (path[i+1] == "%") {
        i += 2;
        path2 += "%"
        continue;
      } else {
        var code = parseInt(path[i+1] + path[i+2], 16);
        path2 += String.fromCharCode(code);
        i += 2;
        continue;
      }
    }
    path2 += path[i];
  }
  
  path2 = "../" + path2
  
  var buf = fs.readFileSync(path2)

  var type = getMimeType(path2);
  
  res.set("Content-Type", type);
  res.send(buf);
  return;
  
  res.set("Content-Type", "text/html");
  res.send("<html><head><title>Test</title></head><body><h2>"+path2+"</h2></body></html>")
  //res.render('index', { title: path2 });
});
//*/

module.exports = router;
