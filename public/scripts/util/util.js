var _util = undefined;
define([
  './typesystem'
], function util(typesystem) {
  "use strict";
  
  var exports = _util = {};
  
  for (var k in typesystem) {
      exports[k] = typesystem[k];
  }
    
  window.tm = 0.0;

  var time_ms = exports.time_ms = function time_ms() {
    if (window.performance)
      return window.performance.now();
    else
      return new Date().getMilliseconds();
  }
  
  //unordered array
  var RandomArray = exports.RandomArray = typesystem.Class('RandomArray', [
    function constructor() {
      Array.apply(this, arguments);
    },
    
    //pop by swapping with last item in unordered array
    function pop_i(i) {
      if (this.length < 2) {
        var ret = this[i];
        
        this.length = 0;
        return ret;
      }
      
      var ret = this[i];
      this[i] = this[this.length-1];
      this.length--;
      
      return ret;
    },
    
    function remove(item, no_error) {
      var i = this.indexOf(item);
      
      if (i < 0) {
        if (!no_error) {
          console.trace("WARNING: item not in array!", item);
          return;
        } else {
          throw new Error("Item not in array: " + item);
        }
      }
      
      this.pop_i(item);
    }
  ]);

  var cachering = exports.cachering = class cachering extends Array {
    constructor(func, size) {
      super()
      
      this.cur = 0;
      
      for (var i=0; i<size; i++) {
        this.push(func());
      }
    }
    
    static fromConstructor(cls, size) {
      var func = function() {
        return new cls();
      }
      
      return new exports.cachering(func, size);
    }
    
    next() {
      var ret = this[this.cur];
      this.cur = (this.cur+1)%this.length;
      
      return ret;
    }
  }

  var SetIter = exports.SetIter = class SetIter {
    constructor(set) {
      this.set = set;
      this.i   = 0;
      this.ret = {done : false, value : undefined};
    }
    
    [Symbol.iterator]() {
      return this;
    }
    
    next() {
      var ret = this.ret;

      while (this.i < this.set.items.length && this.set.items[this.i] === EmptySlot) {
        this.i++;
      }
      
      if (this.i >= this.set.items.length) {
        ret.done = true;
        ret.value = undefined;
        
        return ret;
      }
      
      
      ret.value = this.set.items[this.i++];
      return ret;
    }
  }

  var EmptySlot = {};

  var set = exports.set = class set {
    constructor(input) {
      this.items = [];
      this.keys = {};
      this.freelist = [];
      
      this.length = 0;
      
      if (typeof input == "string") {
        input = new String(input);
      }
      
      if (input != undefined) {
        if (Symbol.iterator in input) {
          for (var item of input) {
            this.add(item);
          }
        } else if ("forEach" in input) {
          input.forEach(function(item) {
            this.add(item);
          }, this);
        } else if (input instanceof Array) {
          for (var i=0; i<input.length; i++) {
            this.add(input[i]);
          }
        }
      }
    }
    
    reset() {
      this.keys = {};
      this.length = 0;
      this.freelist.length = this.items.length;
      
      for (var i=0; i<this.items.length; i++) {
        this.freelist[i] = i;
      }
      
      return this;
    }
    
    [Symbol.iterator]() {
      return new SetIter(this);
    }
    
    add(item) {
      var key = item[Symbol.keystr]();
      
      if (key in this.keys) return;
      
      if (this.freelist.length > 0) {
        var i = this.freelist.pop();
        
        this.keys[key] = i;
        this.items[i] = item;
      } else {
        var i = this.items.length;
        
        this.keys[key] = i;
        this.items.push(item);
      }
      
      this.length++;
    }
    
    remove(item) {
      var key = item[Symbol.keystr]();
      
      if (!(key in this.keys)) {
        console.trace("Warning, item", item, "is not in set");
        return;
      }
      
      var i = this.keys[key];
      this.freelist.push(i);
      this.items[i] = EmptySlot;
      
      delete this.keys[key];
      
      this.length--;
    }
    
    has(item) {
      return item[Symbol.keystr]() in this.keys;
    }
    
    forEach(func, thisvar) {
      for (var i=0; i<this.items.length; i++) {
        var item = this.items[i];
        
        if (item === EmptySlot) 
          continue;
          
        thisvar != undefined ? func.call(thisvar, item) : func(item);
      }
    }
  }

  var _hash_null = {};

  var hashtable = exports.hashtable = class hashtable {
    constructor() {
      this.items = [];
      this._keys = {};
      this.length = 0;
    }
    
    set(key, val) {
      key = key[Symbol.keystr]();
      
      var i;
      if (!(key in this._keys)) {
        i = this.items.length;
        this.items.push(0);
        this._keys[key] = i;
        
        this.length++;
      } else {
        i = this._keys[key];
      }
      
      this.items[i] = val;
    }
    
    remove(key) {
      key = key[Symbol.keystr]();
      
      if (!(key in this._keys)) {
        console.trace("Warning, key not in hashtable:", key);
        return;
      }
      
      var i = this._keys[key];
      this.items[i] = _hash_null;
      delete this._keys[key];
      this.length--;
    }
    
    has(key) {
      key = key[Symbol.keystr]();
      
      return key in this._keys;
    }
    
    get(key) {
      key = key[Symbol.keystr]();
      if (!(key in this._keys)) {
        console.trace("Warning, item not in hash", key);
        return undefined;
      }
      
      return this.items[this._keys[key]];
    }
    
    add(key, val) {
      return this.set(key, val);
    }
    
    keys() {
      return Object.keys(this._keys);
    }
    
    values() {
      var ret = [];
      var len = this.items.length;
      
      for (var i=0; i<len; i++) {
        var item = this.items[i];
        if (item !== _hash_null)
          ret.push(item);
      }
      
      return ret;
    }
    
    forEach(cb, thisvar) {
      if (thisvar == undefined)
        thisvar = self;
      
      for (var k in this._keys) {
        var i = this._keys[k];
        cb.call(thisvar, k, this.items[i]);
      }
    }
  }

  var IDGen = exports.IDGen = class IDGen {
    constructor() {
      this._cur = 1;
    }
    
    next() {
      return this._cur++;
    }
    
    max_cur(id) {
      this._cur = Math.max(this._cur, id+1);
    }
    
    toJSON() {
      return {
        _cur : this._cur
      };
    }
    
    static fromJSON(obj) {
      var ret = new IDGen();
      ret._cur = obj._cur;
      return ret;
    }
  }


  function get_callstack(err) {
    var callstack = [];
    var isCallstackPopulated = false;

    var err_was_undefined = err == undefined;

    if (err == undefined) {
      try {
        _idontexist.idontexist+=0; //doesn't exist- that's the point
      } catch(err1) {
        err = err1;
      }
    }

    if (err != undefined) {
      if (err.stack) { //Firefox
        var lines = err.stack.split('\n');
        var len=lines.length;
        for (var i=0; i<len; i++) {
          if (1) {
            lines[i] = lines[i].replace(/@http\:\/\/.*\//, "|")
            var l = lines[i].split("|")
            lines[i] = l[1] + ": " + l[0]
            lines[i] = lines[i].trim()
            callstack.push(lines[i]);
          }
        }
        
        //Remove call to printStackTrace()
        if (err_was_undefined) {
          //callstack.shift();
        }
        isCallstackPopulated = true;
      }
      else if (window.opera && e.message) { //Opera
        var lines = err.message.split('\n');
        var len=lines.length;
        for (var i=0; i<len; i++) {
          if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
            var entry = lines[i];
            //Append next line also since it has the file info
            if (lines[i+1]) {
              entry += ' at ' + lines[i+1];
              i++;
            }
            callstack.push(entry);
          }
        }
        //Remove call to printStackTrace()
        if (err_was_undefined) {
          callstack.shift();
        }
        isCallstackPopulated = true;
      }
     }

      var limit = 24;
      if (!isCallstackPopulated) { //IE and Safari
        var currentFunction = arguments.callee.caller;
        var i = 0;
        while (currentFunction && i < 24) {
          var fn = currentFunction.toString();
          var fname = fn.substring(fn.indexOf("function") + 8, fn.indexOf('')) || 'anonymous';
          callstack.push(fname);
          currentFunction = currentFunction.caller;
          
          i++;
        }
      }
    
    return callstack;
  }

  var print_stack = exports.print_stack = function print_stack(err) {
    try {
      var cs = get_callstack(err);
    } catch (err2) {
      console.log("Could not fetch call stack.");
      return;
    }
    
    console.log("Callstack:");
    for (var i=0; i<cs.length; i++) {
      console.log(cs[i]);
    }
  }

  var fetch_file = exports.fetch_file = function fetch_file(path) {
      var url = location.origin + "/" + path
      
      var req = new XMLHttpRequest(
      );
      
      return new Promise(function(accept, reject) {
        req.open("GET", url)
        req.onreadystatechange = function(e) {
          if (req.status == 200 && req.readyState == 4) {
              accept(req.response);
          } else if (req.status >= 400) {
            reject(req.status, req.statusText);
          }
        }
        req.send();
      });
  }
  
  
  //from: https://en.wikipedia.org/wiki/Mersenne_Twister
  function _int32(x) {
      // Get the 31 least significant bits.
      return ~~(((1<<30)-1) & (~~x))
  }

  var MersenneRandom = exports.MersenneRandom = exports.Class('MersenneRandom', [
      function constructor(seed) {
          // Initialize the index to 0
          this.index = 624;
          this.mt = new Uint32Array(624);
          
          this.seed(seed);
      },
      
      function random() {
        return this.extract_number() / (1<<30);
      },
      
      function seed(seed) {
          seed = ~~(seed*8192);
        
          // Initialize the index to 0
          this.index = 624;
          this.mt.fill(0, 0, this.mt.length);
          
          this.mt[0] = seed;  // Initialize the initial state to the seed
          
          for (var i=1; i<624; i++) {
              this.mt[i] = _int32(
                  1812433253 * (this.mt[i - 1] ^ this.mt[i - 1] >> 30) + i);
          }
      },
      
      function extract_number() {
          if (this.index >= 624)
              this.twist();

          var y = this.mt[this.index];

          // Right shift by 11 bits
          y = y ^ y >> 11;
          // Shift y left by 7 and take the bitwise and of 2636928640
          y = y ^ y << 7 & 2636928640;
          // Shift y left by 15 and take the bitwise and of y and 4022730752
          y = y ^ y << 15 & 4022730752;
          // Right shift by 18 bits
          y = y ^ y >> 18;

          this.index = this.index + 1;

          return _int32(y);
      },
      
      function twist() {
          for (var i=0; i<624; i++) {
              // Get the most significant bit and add it to the less significant
              // bits of the next number
              var y = _int32((this.mt[i] & 0x80000000) +
                         (this.mt[(i + 1) % 624] & 0x7fffffff));
              this.mt[i] = this.mt[(i + 397) % 624] ^ y >> 1;

              if (y % 2 != 0)
                  this.mt[i] = this.mt[i] ^ 0x9908b0df;
          }
          
          this.index = 0;
    }
  ]);

  var _mt = new MersenneRandom(0);
  exports.random = function() {
    return _mt.extract_number() / (1<<30);
  }
  
  exports.seed = function(n) {
  //  console.trace("seed called");
    _mt.seed(n);
  }
  
  var _inthash_none = (1<<31)-1;
  
  var hashsizes = [
    5, 11, 19, 37, 67, 127, 223, 383, 653, 1117, 1901, 3251, 
    5527, 9397, 15991, 27191, 46229, 78593, 133631, 227177, 38619,
    656587, 1116209, 1897561, 3225883, 5484019, 9322861, 15848867,
    26943089, 45803279, 77865577, 132371489, 225031553
  ];
  //1073741823
  
  var IntHash = exports.IntHash = exports.Class('IntHash', Array, [
    function constructor(totelem) {
      Array.call(this);
      
      this.used = 0;
      this.cursize = 0;
      this.totelem = totelem + 1 //make sure we're including key
      this.forEach_rets = new exports.cachering(function() {
        return new Array(totelem);
      }, 512);
      this.get_rets = new exports.cachering(function() {
        return new Array(totelem);
      }, 512);
      
      this.nextsize();
    },
    
    function toJSON() {
      var hash = [];
      var totelem = this.totelem;
      
      for (var i=0; i<this.length; i += totelem) {
        if (this[i] == _inthash_none) {
          continue;
        }
        
        for (var j=0; j<totelem; j++) {
          hash.push(this[i+j]);
        }
      }
      
      var ret = {
        size    : this.used,
        totelem : this.totelem,
        hash    : hash
      };
      
      return ret;
    },
    
    exports.Class.static(function fromJSON(obj) {
      var ret = new IntHash(obj.totelem - 1);
      
      var hash = obj.hash, totelem = obj.totelem;
      var vals = new Array(totelem);
      
      //console.log("TOTELEM", totelem, hash);
      //return ret;
      
      for (var i=0; i<hash.length; i += totelem) {
        for (var j=0; j<totelem-1; j++) {
          vals[j] = hash[i+j+1];
        }
        
        ret.set(hash[i], vals);
      }
      
      return ret;
    }),
    
    function nextsize() {
      var size = hashsizes[++this.cursize];
      var old = this.length, totelem = this.totelem;
      
      var cpy = [];
      for (var i=0; i<this.length; i++) {
        cpy.push(this[i]);
      }
      //var cpy = this.slice(0, this.length);
      
      this.length = size*totelem;
      this.fill(_inthash_none, 0, this.length);
      this.used = 0;
      
      var vals = new Array(totelem-1);
      
      for (var i=0; i<cpy.length; i += totelem) {
        var key = cpy[i];
        if (key === _inthash_none) {
          continue;
        }
        
        for (var j=1; j<totelem; j++) {
          vals[j-1] = cpy[i+j];
        }
        
        this.set(key, vals);
      }
    },
    
    //args after key, vals is array of integer values
    function set(key, vals) {
      key = ~~key;
      
      var totelem = this.totelem;
      
      if (this.used > this.length/(3*totelem)) {
        this.nextsize();
      }
      if (this.used > this.length/(3*totelem)) {
        this.nextsize();
      }
      if (this.used > this.length/(3*totelem)) {
        this.nextsize();
      }
      
      
      var size = ~~(this.length/totelem);
      var h = (key % size)*totelem;
      var _i = 0;
      
      var add = 1;
      while (this[h] != key && this[h] != _inthash_none) {
        add = add*2 + 1;
        
        h = (key+add) % size
        h = (h < 0 ? h+size : h)*totelem;

        if (_i++ > this.length*50) {
          console.log("infinite loop in integer hash!", add, h, key, key%size, size, this.used);
          break;
        }
      }
      
      if (this[h] != key)
        this.used++;
      
      this[h] = key;
      
      for (var i=1; i<totelem; i++) {
        this[h+i] = vals[i-1];
      }
    },
    
    function forEach(cb, thisvar) {
      thisvar = thisvar == undefined ? this : thisvar;
      
      var totelem = this.totelem;
      var vals = this.forEach_rets.next();
      
      for (var i=0; i<this.length; i += totelem) {
        var key = this[i];
        var vals = this.forEach_rets.next();
        
        if (key == _inthash_none && this[i+1] == _inthash_none) {
          continue;
        }
        
        for (var j=0; j<totelem-1; j++) {
          vals[j] = this[i+1+j];
        }
        
        cb.call(thisvar, key, vals);
      }
    },
    
    function get(key) {
      key = ~~key;
      
      var totelem = this.totelem;
      
      var size = ~~(this.length/totelem);
      var h = (key % size)*totelem;
      var _i = 0;
      
      var add = 1;
      while (this[h] != key && this[h] != _inthash_none) {
        add = add*2 + 1;
        h = (key+add) % size
        h = (h < 0 ? h+size : h)*totelem;

        if (_i++ > this.length*10) {
          console.log("infinite loop in integer hash!", add, h, key, size, this.used);
          break;
        }
      }
      
      if (this[h] != key) 
        return undefined;
      
      var ret = this.get_rets.next();
      for (var i=0; i<totelem-1; i++) {
        ret[i] = this[h+i+1];
      }
      
      return ret;
    },
    
    function has(key) {
      key = ~~key;
      
      var totelem = this.totelem;
      
      var size = ~~(this.length/totelem);
      var h = (key % size)*totelem;
      var _i = 0;
      
      var add = 1;
      while (this[h] != key && this[h] != _inthash_none) {
        add = add*2 + 1;
        h = (key+add) % size
        h = (h < 0 ? h+size : h)*totelem;

        if (_i++ > this.length*10) {
          console.log("infinite loop in integer hash!", add, h, key, size, this.used);
          break;
        }
      }
      
      return this[h] == key;
    },
    
    //function remove(key) {
    //}
  ]);
  
  exports.MovingAverage = exports.Class('MovingAverage', Array, [
    function constructor(size) {
      if (size == undefined)
        throw new Error("size required for MovingAverage!");
      
      Array.call(this, size);
      this.length = size;
      this.cur = 0;
    },
    
    function add(v) {
      this[this.cur] = v;
      
      this.cur = (this.cur + 1) % this.length;
    },
    
    function sample() {
      var sum=0, tot=0;
      
      for (var i=0; i<this.length; i++) {
        if (this[i] != undefined) {
          sum += this[i];
          tot += 1;
        }
      }
      
      return !tot ? 0.0 : sum/tot;
    }
  ]);
  
  exports.test_inthash = function() {
    var ihash = new IntHash(1);
    var vals = [0, 1];
    
    exports.seed(0);
    
    for (var i=0; i<29; i++) {
      var ri = ~~(exports.random()*4096);
      vals[0] = i;
      vals[1] = ri;
      
      console.log(ri, vals);
      ihash.set(ri, vals);
      ihash.set(ri, vals);
      ihash.set(ri, vals);
    }
    
    console.log("\n\n=====");
    var c = 0;
    ihash.forEach(function(key, vals) {
      //console.log(key, ""+vals);
      console.log(ihash.has(key), ihash.get(key), vals);
      c++;
    }, this);
    
    var json = JSON.stringify(ihash);
    console.log(json);
    console.log("\nused", ihash.used, c);
    
    var ihash2 = IntHash.fromJSON(JSON.parse(json));
    var json2 = JSON.stringify(ihash2);

    var ihash3 = IntHash.fromJSON(JSON.parse(json2));
    var json3 = JSON.stringify(ihash3);
    console.log(json2, "\n", json3, "\n", json2 == json3);
    
    return undefined;
  }
  return exports;
});
