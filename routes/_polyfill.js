'use strict';

if (Math.fract == undefined) {
  Math.fract = function fract(f) {
    return f - Math.floor(f);
  }
}

if (Math.tent == undefined) {
  Math.tent = function tent(f) {
    return 1.0 - Math.abs(Math.fract(f)-0.5)*2.0;
  }
}

if (Array.prototype.remove == undefined) {
  Array.prototype.remove = function(item, throw_on_error) {
    var i = this.indexOf(item);
    
    if (i < 0 && throw_on_error) {
      throw new Error("Item not in array: " + item);
    } else if (i < 0) {
      console.trace("Warning: item not in array:", item);
      return;
    }
    
    while (i < this.length) {
      this[i] = this[i+1];
      i++;
    }
    
    this.length--;
  }
}

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

if (String.prototype.beginsWith == undefined) {
  String.prototype.beginsWith = function(str) {
    if (this.length < str.length)
      return false;
    
    for (var i=0; i<str.length; i++) {
      if (this[i] != str[i]) {
        return false;
      }
    }
    
    return true;
  }
}
