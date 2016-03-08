var _net = undefined;
define([
], function() {
  "use strict";
  
  var exports = _net = {};
  
  var filecache = exports.filecache = {};
  exports.fetch_file = function fetch_file(url, response_type) {
    if (response_type == undefined)
      response_type = "arraybuffer";
    
    if (url in filecache) {
        return new Promise(function(resolve, reject) {
            resolve(filecache[url]);
        });
    }
    
    var promise = new Promise(function(resolve, reject) {
      var req = new XMLHttpRequest();
      req.responseType = response_type;
      
      req.onreadystatechange = function() {
        if (req.status == 200 && req.response != null) {
            filecache[url] = req.response;
            resolve(req.response);
        } else if (req.status >= 400) {
            reject(req.statusText);
        }
      }
      
      req.open("GET", url, true);
      req.send();
    });
    
    return promise;
  }

  //var href = document.location.href;
  //if (href[href.length-1] != "/") {
  //  href += "/"
  //}

  return exports;
});
