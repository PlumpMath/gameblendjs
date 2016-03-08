var _main = undefined;
define([
  "util/util", "sdna/sdna", "core/app"
], function(util, sdna, app) {
  'use strict';
  
  var exports = _main = {};
  var Class = util.Class;
  
  console.log("app startup");
  app.init();
  
  return exports;
});

