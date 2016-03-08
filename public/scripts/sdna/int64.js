var _int64 = undefined;

define([
  "../util/util"
], function(util) {
  'use strict';

  var exports = _int64 = {};
  var Class = util.Class;

  var Int64 = exports.Int64 = Class("Int64", Array, [
    function constructor(i64) {
      Array.call(this);

      this.push(0);
      this.push(0);

      if (typeof i64 == "number") {
        this.loadNumber(i64);
      } else if (typeof i64 == "object" && i64 instanceof Int64) {
        this.load(i64);
      }
    },

    function valueOf() {
      if (this[1] == 0)
        return ""+this[0];

      return ""+(~~this[0])+","+(~~this[1]);
    },

    function loadNumber(n) {
      this[0] = n;
      this[1] = 0;
      return this;
    },

    function load(b) {
      this[0] = b[0];
      this[1] = b[1];
      return this;
    },

    function loadPair(a, b) {
      this[0] = a;
      this[1] = b;
      return this;
    },

    Class.symbol(function keystr() {
      if (this[1] == 0)
        return ""+this[0];

      return ""+(~~this[0])+","+(~~this[1]);
    })
  ]);

  return exports;
})
