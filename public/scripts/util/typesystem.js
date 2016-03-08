var _typesystem = undefined;

if (typeof requirejs == "undefined") {
  global.window = global;

  var define = function(deps, cb) {
    for (var i=0; i<deps.length; i++) {
      deps[i] = require(deps[i]);
    }

    var module = cb.apply(undefined, deps);
    for (var k in module) {
      exports[k] = module[k];
    }
  }
}

define([
  './polyfill'
], function(_polyfill) {
  'use strict';
  
  var exports = _typesystem = {};
  
  function ClassGetter(func) {
    this.func = func;
  }
  function ClassSetter(func) {
    this.func = func;
  }

  var prototype_idgen = 1;
  var defined_classes = exports.defined_classes = [];

  var StaticMethod = function StaticMethod(func) {
    this.func = func;
  };
    
  var SymbolMethod = function SymbolMethod(func) {
    this.func = func;
  };

  var OverlayMethod = function OverlayMethod(func) {
    this.func = func;
  };

  var handle_statics = function(cls, parent) {
    for (var k in cls.prototype) {
      if (cls.prototype[k] instanceof StaticMethod) {
        var func = cls.prototype[k];
        
        delete cls.prototype[k];
        cls[k] = func.func;
      }
    }
    
    if (parent != undefined) {
      for (var k in parent) {
        var v = parent[k];
        
        //only inherit static methods added to parent with this module
        if (v == undefined || (typeof v != "number" && "_is_static_method" in v) 
            && !(k in cls))
        {
          cls[k] = v;
        }
      }
    }
  }

  var init_prototype = exports.init_prototype = function init_prototype(cls, proto) {
    for (var k in proto) {
      cls.prototype[k] = proto[k];
    }
    
    cls.prototype.__prototypeid__ = prototype_idgen++;
    cls[Symbol.keystr] = function() {
      return this.prototype.__prototypeid__;
    }
    
    cls.__parent__ = parent;
    cls.__statics__ = [];

    handle_statics(cls, undefined);
    
    return cls.prototype;
  }

  var inherit = exports.inherit = function inherit(cls, parent, proto) {
    cls.prototype = Object.create(parent.prototype);
    init_prototype(cls, proto);
    
    return cls.prototype;
  }
  
  var Class = exports.Class = function Class() {
    if (arguments.length == 3) {
      var name = arguments[0], parent = arguments[1], 
                 methods = arguments[2];
    } else if (arguments.length == 2) {
      if (typeof arguments[0] == "string") {
        var name = arguments[0], parent = undefined, 
                   methods = arguments[1];
      } else {
        var name = "unnamed", parent = arguments[0], 
                   methods = arguments[1];
      }
    } else {
      var name = "unnamed", parent = undefined,
                 methods = arguments[0];
    }
    
    var construct = undefined;
    var ownmethods = {}

    for (var i=0; i<methods.length; i++) {
      var f = methods[i];
      
      if (f.name == "constructor") {
        construct = f;
        methods.remove(f);
        break;
      }
    }
    
    if (construct == undefined) {
      console.trace("Warning, constructor was not defined", methods);
      
      if (parent != undefined) {
        construct = function() {
          parent.apply(this, arguments);
        }
      } else {
        construct = function() {
        }
      }
    }
    
    var func = undefined, construct1 = construct;
    
    var code = "func = function " + name + "() {\n"
    code += "  construct1.apply(this, arguments);\n"
    code += "}\n";
    
    eval(code);
    construct = func;
    
    if (parent != undefined) {
      construct.prototype = Object.create(parent.prototype);
    }
    
    construct.prototype.constructor = construct;
    construct.prototype.__prototypeid__ = prototype_idgen++;
    construct[Symbol.keystr] = function() {
      return this.prototype.__prototypeid__;
    }
    
    construct.__parent__ = parent;
    construct.__statics__ = [];
    
    var getters = {};
    var setters = {};
    var getset = {};
    
    var statics = {}
    
    //handle getters/setters
    for (var i=0; i<methods.length; i++) {
      var f = methods[i];
      
      if (f instanceof ClassSetter) {
        setters[f.func.name] = f.func;
        getset[f.func.name] = 1;
      } else if (f instanceof ClassGetter) {
        getters[f.func.name] = f.func;
        getset[f.func.name] = 1;
      } else if (f instanceof StaticMethod) {
        statics[f.func.name] = f.func;
      }
    }
    
    for (var k in statics) {
      construct[k] = statics[k];
    }
    
    for (var k in getset) {
      var def = {
        enumerable   : false,
        configurable : true,
        get : getters[k],
        set : setters[k]
      }
      
      Object.defineProperty(construct.prototype, k, def);
    }
    
    handle_statics(construct, parent);
    
    if (parent != undefined)
      construct.__parent__ = parent;

    construct.__aspects__ = {};

    for (var i=0; i<methods.length; i++) {
      var f = methods[i];
      
      if (f instanceof ClassGetter || f instanceof ClassSetter)
        continue;
      
      var name = f.name;

      if (f instanceof OverlayMethod) {
        construct.__aspects__[f.func.name] = f;
        continue;
      }

      if (f instanceof SymbolMethod) {
        name = f.func.name;
        
        if (!(name in Symbol)) {
          console.log(f)
          throw new Error("Invalid symbol " + name);
        }

        name = Symbol[name];
        f = f.func;
      }

      ownmethods[name] = f;
      construct.prototype[name] = f;
    }

    function bind_aspect(aspect, method) {
      var f2 = aspect.func;
      var a = [];

      function layer() {
        a.length = arguments.length + 1;

        for (var i=0; i<arguments.length; i++) {
          a[i+1] = arguments[i];
        }

        a[0] = method;

        f2.apply(this, a);
      }

      return layer;
    }

    //walk up parent, dealing with overlayers (aspects)
    var p = parent;
    while (p != undefined) {
      for (var k in p.__aspects__) {
        if (!(k in construct.prototype)) {
          continue;
        }

        var aspect = p.__aspects__[k];
        construct.prototype[k] = bind_aspect(aspect, construct.prototype[k]);
      }

      p = p.__parent__;
    }

    return construct;
  };

  Class.getter = Class.get = function(func) {
    return new ClassGetter(func);
  }
  Class.setter = Class.set = function(func) {
    return new ClassSetter(func);
  }

  var static_method = exports.static_method = function static_method(func) {
    func._is_static_method = true;
    return new StaticMethod(func);
  }

  Class.static = Class.static_method = function(func) {
    func._is_static_method = true;
    return new StaticMethod(func);
  };

  Class.symbol = function(func) {
    return new SymbolMethod(func);
  };

  //aspect-oriented programming.
  //allows parent to selectively override child behavior
  Class.overlay = function(func) {
    return new OverlayMethod(func);
  };

  var mixin = exports.mixin = function mixin(cls, parent) {
    for (var k in parent.prototype) {
      if (!(k in cls.prototype)) {
        cls.prototype[k] = parent.prototype[k];
      }
    }
  };

  var test_overlay = exports.test_overlay = function test_overlay() {
    var idgen = 0;

    var A = Class("A", [
      function constructor() {
        this.id = idgen++;
      },

      Class.overlay(function exec(underlying, arga, argb, argc) {
        console.log(this);
        console.log("A", arga, argb, argc, this.id);
        underlying.call(this, arga, argb, argc);
      })
    ]);

    var B = Class("B", A, [
      function constructor() {
        A.call(this);
        this.id = idgen++;
      },

      Class.overlay(function exec(underlying, arga, argb, argc) {
        console.log("B", arga, argb, argc, this.id);
        underlying.call(this, arga, argb, argc);
      })
    ]);

    var C = Class("C", B, [
      function constructor() {
        B.call(this);
        this.id = idgen++;
      },

      function exec(arga, argb, argc) {
        console.log("C", arga, argb, argc, this.id);
      }
    ]);

    var c = new C();
    c.exec(1, 2, 3);
  }

  //test_overlay();

  return exports;
});
