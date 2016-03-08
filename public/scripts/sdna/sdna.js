var _sdna = undefined;
define([
  '../util/util', './parse_sdna', './sdna_code'
], function(util, parse_sdna, sdna_code) {
  'use strict';
  
  //stub
  function startup_report(msg, color) {
    console.log(msg);
  }
  
  var exports = _sdna = {};
  var Class = util.Class;
  
  //forward parse_sdna's exports
  for (var k in parse_sdna) {
    exports[k] = parse_sdna[k];
  }
  
  var SDNA = parse_sdna.SDNA;
  var SDNAParser = parse_sdna.SDNAParser;
    
  var SDNASubClass = parse_sdna.SDNASubClass;

  var _sdna_prototype_idgen = 0;
  
  //maps prototype id's to constructors
  var _sdna_prototype_maps = exports._sdna_prototype_maps = {}; 

  function makeSDNAClass(stt) {
    var code = [
      "var CLSNAME;",
      
      "CLSNAME = util.Class('CLSNAME', SDNASubClass, [",
      "  function constructor() {",
      "    this._bl_instance_id = parse_sdna.sdna_instance_idgen.next();",
      "  }",
      "]);"
    ].join("\n").replace(/CLSNAME/g, stt.name);
    
    var cls = eval(code);
    
    cls.prototype._sdna_prototype_id = _sdna_prototype_idgen++;
    cls.prototype._bl_sdna = stt;
    _sdna_prototype_maps[cls.prototype._sdna_prototype_id] = cls;
    
    cls.sdna_write = function() {
    }
    
    cls.sdna_read = function(view, off) {
    }
    
    cls._bl_sdna = stt;
    return cls;
  }

  var SDNATypeManager = exports.SDNATypeManager = Class('SDNATypeManager', [
    function constructor() {
        this.sdna = undefined;
        this.bases = {};
    },
    
    function register(cls) {
      var stt = cls.prototype._bl_sdna;
      var sid = cls.prototype._sdna_prototype_id;
      
      _sdna_prototype_maps[sid] = cls;
      this[stt.name] = cls;
      
      //startup_report("registered sdna.types." + stt.name, "blue");
    },
    
    function load_code(code) {
      var parser = new parse_sdna.SDNAParser();
      var sdna = parser.parse(code, parse_sdna.ENDIAN_LITTLE, 8);
      this.sdna = sdna;
      
      for (var k in sdna.structs) {
        this[k] = this.bases[k] = makeSDNAClass(sdna.structs[k]);
      }
    }
  ]);

  var types = exports.types = new SDNATypeManager();
  var bases = exports.bases = types.bases;

  startup_report("  parsing sdna structs. . .", "teal");
  types.load_code(sdna_code);

  return exports;
});
