var _listbase = undefined;
define([
  '../util/util', './sdna'
], function(util, sdna) {
  "use strict";
  
  var exports = _listbase = {};
  var Class = util.Class;
  
  var ListBaseIter = exports.ListBaseIter = Class([
    function constructor(listbase) {
      this.last = listbase.last;
      this.cur = listbase.first;
      
      this.ret = {done : false, value : undefined};
    },
    
    function next() {
      var ret = this.ret;
      
      if (this.cur == 0 || typeof this.cur == "number" || 
          this.cur == undefined) 
      {
        ret.done = true;
        ret.value = undefined;
        return ret;
      }
      
      ret.value = this.cur;
      this.cur = this.cur.next;
      
      return ret;
    },
    
    Class.symbol(function iterator() {
      return this;
    })
  ]);

  var ListBase = exports.ListBase = Class(sdna.bases.ListBase, [
    Class.symbol(function iterator() {
      return new ListBaseIter(this);
    }),
    
    function get(index) {
      var item = this.first;
      
      if (typeof index == "string" || index instanceof String) {
        for (var item in this) {
          if (item.name == index || (item.id != undefined && item.id.name == index)) {
            return item;
          }
        }
        
        return undefined;
      }
      
      for (var i=0; i<index; i++) {
        item = item.next;
      }
      
      return typeof item == "number" ? undefined : item;
    }
  ]);
  sdna.types.register(ListBase);
  
  return exports;
});

