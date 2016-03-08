//for debugging purposes only
var _sin_table = {};

define([], function() {
  'use strict';
  
  var exports = _sin_table = {};
  
  var steps = 32768;
  var table = new Float64Array(steps);
  
  var t = 0, dt = (2*Math.PI)/(steps-1);
  
  console.log("building sin table approximation. . .");
  
  for (var i=0; i<steps; i++, t += dt) {
    table[i] = Math.sin(t);
  }
  
  var TWOPI = Math.PI*2.0;
  var ONETWOPI = 1.0 / TWOPI;
  var PIOVER2 = Math.PI / 2.0;
  
  var sin = exports.sin = function sin(s) {
    i = ~~(s*0.15915494309189535*32768);
    i = i & 32767;
    //i = i < 0 ? i + 32768 : i;
    
    return table[i];
  }
  
  var cos = exports.cos = function cos(s) {
    s += 1.5707963267948966; //PIOVER2;
    i = ~~(s*0.15915494309189535*32768);
    i = i & 32767;
    //i = i < 0 ? i + 32768 : i;
    
    return table[i];
  },
  
  var test = exports.test = function test() {
    for (var i=-32; i<32; i++) {
      console.log(Math.sin(i*0.2).toFixed(4), this.sin(i*0.2).toFixed(4));
    }
  }
  
  //XXX
  //window.sin_table = sin_table;
  return exports;
});
