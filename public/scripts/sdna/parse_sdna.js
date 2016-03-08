var _parse_sdna = undefined;
define([
  '../util/util',
  './sdna_code',
  './int64'
], function(util, sdna, int64) {
  "use strict";

  var exports = _parse_sdna = {};
  var Class = util.Class;
  var IDGen = util.IDGen;
  
  var ENDIAN_BIG = exports.ENDIAN_BIG = 0;
  var ENDIAN_LITTLE = exports.ENDIAN_LITTLE = 1;
  var sdna_instance_idgen = exports.sdna_instance_idgen = new IDGen();

  var _debug = 0;

  var SDNASubClass = exports.SDNASubClass = util.Class('SDNASubClass', [
  ]);
  
  var SDNATypes = exports.SDNATypes = {
    INT     : 1,
    SHORT   : 2,
    CHAR    : 3, //always unsigned
    FLOAT   : 4,
    DOUBLE  : 5,
    LONG    : 6,
    INT64_T : 7,
    POINTER : 7,
    STRUCT  : 8,
    ARRAY   : 9, //arrays are store nested, with first dimensions being leaf nodes
                 //e.g. array[3][2] would be stored as type(array[2], type(array[3]));
    VOID    : 10,
    UNSIGNED : 64,
    TYPEMASK : 15
  };

  var SDNATypeNames = {};
  
  function build_SDNATypeNames() { //supposedly, doing it this way helps with optimization
    for (var k in SDNATypes) {
      SDNATypeNames[SDNATypes[k]] = k
    }
  }
  build_SDNATypeNames();

  /*
  var _tmp_stacks = new util.cachering(function() {
    var ret = new Array(1024);
    ret.slen = 0;
    return ret;
  }, 8);
  //*/

  var _tmp_stack = new Array(8192);

  var BasicTypes = exports.BasicTypes = {
    "char"    : SDNATypes.CHAR, //sign chars are not actually allowed
    "uchar"   : SDNATypes.CHAR,
    "short"   : SDNATypes.SHORT,
    "ushort"  : SDNATypes.SHORT|SDNATypes.UNSIGNED,
    "int"     : SDNATypes.INT,
    "uint"    : SDNATypes.INT|SDNATypes.UNSIGNED,
    "long"    : SDNATypes.LONG,
    "ulong"   : SDNATypes.LONG|SDNATypes.UNSIGNED,
    "float"   : SDNATypes.FLOAT,
    "double"  : SDNATypes.DOUBLE,
    "int64_t" : SDNATypes.INT64_T,
    "uint64_t": SDNATypes.INT64_T|SDNATypes.UNSIGNED,
    "void"    : SDNATypes.VOID
  }

  function tab(size) {
    var s = "";
    
    for (var i=0; i<size; i++) {
      s += " "
    }
    
    return s;
  }

  var SizingVisitor = exports.SizingVisitor = Class('SizingVisitor', [
    function constructor(sdna) {
      this.sdna = sdna;
    },
    
    function STRUCT(type) {
      var size = 0;
      var stt = type.subtype;

      for (var i=0; i<stt.fields.length; i++) {
        size += this.visit(stt.fields[i].type);
      }
      
      return size;
    },
    
    function visit(type) {
      return this[SDNATypeNames[type.type]](type);
    },
    
    function INT() {
      return 4;
    },
    
    function FLOAT() {
      return 4;
    },
    
    function DOUBLE() {
      return 4;
    },
    
    function INT64_T() {
      return 8;
    },
    
    function VOID() {
      return 0;
    },
    
    function CHAR() {
      return 1;
    },
    
    function SHORT() {
      return 2;
    },
    
    function POINTER() {
      return this.sdna.pointer_size;
    }
  ]);

  var _sizing_visitor = new SizingVisitor();

  var SDNAType_read_stack = new Array(4096);

  var SDNAType = exports.SDNAType = Class('SDNAType', [
    function constructor(type, subtype=-1, params=undefined) {
      this.type = type;
      this.subtype = subtype;
      this.params = params; //e.g. array dimensions
    },

    function read(fd, depth=0, stack) {
      var SARG= 0, SFIELD= 1, SARRAY= 2, SRET=3,  STOT=4;

      /*
      if (stack == undefined) {
        stack = _tmp_stacks.next();
        stack.slen = 2;

        stack[0] = this;
        stack[1] = SARG;
      }*/

      var stack = _tmp_stack;

      stack.slen = 2;
      stack[0] = this;
      stack[1] = SARG;
      var view = fd.view;
      var endian = fd.endian;

      var head, lasthead, lastret;
      while (stack.slen > 0) {
        lasthead = head;

        if (stack.slen > 2000) {
          throw new Error("stack limit");
        }

        var type = stack[--stack.slen];
        var head = stack[--stack.slen];

        if (type == SRET) {
          lastret = head;
        }

        if (type == SARG) {
          var unsign = head.type & SDNATypes.UNSIGNED;

          //inline reader functions
          switch (head.type & SDNATypes.TYPEMASK) {
            case SDNATypes.INT:
            case SDNATypes.LONG:
              stack[stack.slen++] = unsign ? view.getUint32(fd.i, endian) : view.getInt32(fd.i, endian); //fd.read_uint() : fd.read_int();
              fd.i += 4;

              stack[stack.slen++] = SRET;
              break;
            case SDNATypes.SHORT:
              stack[stack.slen++] = unsign ? view.getUint16(fd.i, endian) : view.getInt16(fd.i, endian); //fd.read_uint() : fd.read_int();
              fd.i += 2;

              //stack[stack.slen++] = unsign ? fd.read_ushort() : fd.read_short();
              stack[stack.slen++] = SRET;
              break;
            case SDNATypes.CHAR: //always unsigned
              stack[stack.slen++] = view.getUint8(fd.i);
              fd.i += 1;

              //stack[stack.slen++] = fd.read_byte();
              stack[stack.slen++] = SRET;
              break;
            case SDNATypes.FLOAT:
              stack[stack.slen++] = view.getFloat32(fd.i, endian);
              fd.i += 4;

              stack[stack.slen++] = SRET;
              break;
            case SDNATypes.DOUBLE:
              stack[stack.slen++] = view.getFloat64(fd.i, endian);
              fd.i += 8;
              stack[stack.slen++] = SRET;
              break;
            case SDNATypes.INT64_T:
              stack[stack.slen++] = unsign ? fd.read_uint64_t() : fd.read_int64_t();
              stack[stack.slen++] = SRET;
              break;
            case SDNATypes.POINTER:
              stack[stack.slen++] = fd.read_pointer();
              stack[stack.slen++] = SRET;
              break;
            case SDNATypes.STRUCT:
              //console.log(head);
              var obj = fd.host_typemanager[head.subtype.name];

              if (obj == undefined) {
                console.log("unknown struct", head.subtype.name);

                obj = {};
                obj._bl_sdna = head.subtype;
                obj._bl_instance_id = sdna_instance_idgen.next();

                obj.constructor = {};
                obj.constructor.name = head.subtype.name;
                obj.constructor.prototype = Object.create(SDNASubClass.prototype);
                obj.prototype = obj.constructor.prototype;
              } else {
                obj = new obj();

                if (obj._bl_instance_id == undefined) {
                  console.trace("WARNING: you forgot to call super() in an SDNA-derived type constructor!", head.subtype.name);
                  obj._bl_instance_id = sdna_instance_idgen.next();
                }
              }

              stack[stack.slen++] = obj;
              stack[stack.slen++] = SRET;

              for (var i=head.subtype._fields.length-1; i>=0; i--) {
                var field = head.subtype._fields[i];

                stack[stack.slen++] = obj;
                stack[stack.slen++] = field;
                stack[stack.slen++] = SFIELD;

                stack[stack.slen++] = field.type;
                stack[stack.slen++] = SARG;
              }

              break;

            //arrays are store nested, with first dimensions being leaf nodes
            //e.g. array[3][2] would be stored as type(array[2], type(array[3]));
            case SDNATypes.ARRAY:
              var array = new Array(head.params);

              if (head.params == undefined)
                throw new Error();

              if (head.subtype.type == SDNATypes.CHAR) {
                array = fd.read_string(head.params);

                if (_debug) {
                  console.log(tab(depth) + "string", array);
                }

                stack[stack.slen++] = array;
                stack[stack.slen++] = SRET;
                break;
              }

              stack[stack.slen++] = array;
              stack[stack.slen++] = SRET;

              for (var i = head.params-1; i >=0; i--) {
                stack[stack.slen++] = array;
                stack[stack.slen++] = i;
                stack[stack.slen++] = SARRAY;

                stack[stack.slen++] = head.subtype;
                stack[stack.slen++] = SARG;
              }
              break;
            case SDNATypes.VOID:
              console.log("void type!");
              return undefined;
          }
        } else if (type == SFIELD) {
          var result = lasthead; //stack[stack.slen-1];
          var field = head, obj = stack[--stack.slen];

          obj[field.name] = result;
        } else if (type == SARRAY) {
          var result = lasthead; //stack[stack.slen];
          var idx = head, array = stack[--stack.slen];

          array[idx] = result;
        }
      }

      return lastret;
    },

    function read_old(fd, depth=0) {
      var unsign = this.type & SDNATypes.UNSIGNED;
      
      if (_debug) {
        console.log(tab(depth) + "reading", this.name)
      }
      
      switch (this.type & SDNATypes.TYPEMASK) {
        case SDNATypes.INT:
          return unsign ? fd.read_uint() : fd.read_int();
        case SDNATypes.SHORT:
          return unsign ? fd.read_ushort() : fd.read_short();
        case SDNATypes.CHAR: //always unsigned
          return fd.read_byte();
        case SDNATypes.FLOAT:
          return fd.read_float();
        case SDNATypes.DOUBLE:
          return fd.read_double();
        case SDNATypes.LONG:
          return unsign ? fd.read_ulong() : fd.read_long();
        case SDNATypes.INT64_T:
          return unsign ? fd.read_uint64_t() : fd.read_int64_t();
        case SDNATypes.POINTER:
          return fd.read_pointer();
        case SDNATypes.STRUCT:
          return this.subtype.read(fd, depth+1);
        
        //arrays are store nested, with first dimensions being leaf nodes
        //e.g. array[3][2] would be stored as type(array[2], type(array[3]));
        case SDNATypes.ARRAY: 
          var ret = [];
          
          if (this.subtype.type == SDNATypes.CHAR) {
              ret = fd.read_string(this.params);
              
              if (_debug) {
                console.log(tab(depth)+"string", ret);
              }
              
              return ret;
          }
          
          for (var i=0; i<this.params; i++) {
            ret.push(this.subtype.read(fd, depth+1));
          }
          
          return ret;
        case SDNATypes.VOID:
          console.log("void type!");
          return undefined;
      }
    },
    
    function calcsize(sdna) {
      _sizing_visitor.sdna = sdna;
      
      return _sizing_visitor.visit(this);
    },
    
    Class.static(function array(type, dimensions) {
      return new SDNAType(SDNATypes.ARRAY, type, dimensions);
    }),
    
    Class.static(function pointer(type) {
      return new SDNAType(SDNATypes.POINTER, type, undefined);
    }),
    
    Class.static(function struct(type) {
      return new SDNAType(SDNATypes.STRUCT, type, undefined);
    }),
    
    Class.static(function from_string(type, name, sdna) {
      name = name.trim();
      
      var do_print=false;
      if (name.search("uv") >= 0 && name.search("\\[") >= 0) { //name.search("\\*") >= 0 || name.search("\\[") >= 0 || name.search("\\(") >= 0) {
        //console.log(type, name);
        //do_print = true;
      }
      
      if (type in sdna.structs) {
        type = SDNAType.struct(sdna.structs[type]);
      } else if (type in BasicTypes) {
        type = new SDNAType(BasicTypes[type]);
      } else {
        //console.log("Unknown type", type);
        type = new SDNAType(SDNATypes.VOID);
      }
      
      var i = 0;
      var name2 = ""
      while (i < name.length) {
        var c = name[i];
        if (i == 0 && c == "*") {
          type = SDNAType.pointer(type);
        } else if (c == "[") {
          var dim = "";
          i++;
          while (name[i] != "]") {
            dim += name[i];
            i++;
          }
          dim = parseInt(dim);
          
          type = SDNAType.array(type, dim);
        } else if (c != "[" && c != "]" && c != "(" && c != ")" && 
                   c != "*" && c != " " && c != "\t") 
        {
          name2 += c;
        }
        i++;
      }
      
      if (do_print) {
        console.log(name, type);
      }
      
      type.name = name2;
      
      return type;
    })
  ]);

  var SDNAParseError = exports.SDNAParseError 
= Class('SDNAParseError', Error, [
    function constructor(message) {
      Error.call(this, message)
    }
  ]);

  var SDNAField = exports.SDNAField = Class('SDNAField', [
    function constructor(name, type) {
      this.name = name;
      this.type = type; //an SDNAType
      this.off = -1; //XXX make sure to calculate me!
    },
    
    function read(fd, depth=0) {
      var ret = this.type.read(fd, depth);
      return ret;
    },
    
    function copy() {
      var ret = new SDNAField();
      ret.name = this.name;
      ret.type = this.type.copy();
      ret.off = this.off;
      
      return ret;
    }
  ]);

  var SDNAStruct = exports.SDNAStruct = Class('SDNAStruct', [
    function constructor(name, typeid, fields) {
      this.name = name;
      this.typeid = typeid;
      this.fields = fields;
      this._fields = undefined;
    },
    
    function read_field(fd, field, depth=0) {
        return field.read(fd, depth);
    },
    
    function read_into(fd, obj, depth=0) {
      for (var i=0; i<this._fields.length; i++) {
          var field = this._fields[i];
          obj[field.name] = this.read_field(fd, field, depth);
      }
      
      return obj;
    },
    
    function read(fd, depth=0) {
        var typemanager = fd.host_typemanager;

        if (this.name in typemanager) {
          var ret = new typemanager[this.name]();
          
          if (ret._bl_instance_id == undefined) {
            console.trace("WARNING: you forgot to call super() in an SDNA-derived type constructor!", this.name);
            ret._bl_instance_id = sdna_instance_idgen.next();
          }
        } else {
          console.log("unknown struct", this.name);

          var ret = new Object();
          
          ret._bl_sdna = this;
          ret._bl_instance_id = sdna_instance_idgen.next();

          ret.constructor = {};
          ret.constructor.name = this.name;
          ret.constructor.prototype = Object.create(SDNASubClass.prototype);
          ret.prototype = ret.constructor.prototype;
        }
        
        this.read_into(fd, ret, depth);
        
        return ret;
    },
    
    function link(block, fd) {
      //console.log(block._bl_instance_id, block);
      
      if (fd.link_doneset.has(block._bl_instance_id)) {
        return;
      }
      
      function field_recurse(data, type) {
        if (data == undefined) {
          console.trace("eek!", data, type);
          return;
        }
        
        if (type.type == SDNATypes.POINTER) {
          if ((typeof data == "number" || data instanceof int64.Int64) && fd.oldmap.has(data)) {
            data = fd.oldmap.get(data);
          } else if (typeof data == "number" || data instanceof int64.Int64) {
            //so, this breaks id properties on pose bones.
            //annoying!

            //data = undefined;
          }
        } else if (type.type == SDNATypes.ARRAY) {
          for (var i=0; i<type.type.params; i++) {
            data[i] = field_recurse(data[i], type.subtype);
          }
        }
          
        return data;
      }
      
      for (var i=0; i<this._fields.length; i++) {
        var f = this._fields[i];
        //console.log(f.type.type);
        
        if (f.type.type == SDNATypes.STRUCT) {
          var ob = block[f.name];
          ob._bl_sdna.link(ob, fd);
          
          continue;
        }
        
        if (f.type.type != SDNATypes.POINTER && f.type.type != SDNATypes.ARRAY)
          continue;
        
        var member = block[f.name];
        if (member == undefined) {
          //console.log("undefined member!", f.name, f);
          continue;
        }
        
        member = field_recurse(member, f.type);
        block[f.name] = member;
      }
      
      fd.link_doneset.add(block._bl_instance_id);
    },
    
    function copy() {
      var ret = new SDNAStruct()
      ret.name = this.name;
      ret.typeid = this.typeid;
      ret.fields = {};
      ret._fields = [];
      
      for (var k in this.fields) {
        var field = this.fields[k].copy();
        ret._fields.push(field);
        ret.fields[k] = field;
      }
      
      return ret;
    }
  ]);

  var SDNA = exports.SDNA = Class('SDNA', [
    function constructor(structs, types, typelens, structlist, ptrsize, endian) {
      this.pointer_size = ptrsize;
      this.endian = endian;
      this.structs = structs; //a map
      this.structlist = structlist;
      this.types = types;     //an array
      this.typelens = typelens;
    },
    
    //bhead should be a fileapi.BHead object
    //fd should be a fileapi.FileData object
    function read(bhead, fd) {
      var stt = this.structlist[bhead.sdna];
      
      if (bhead.nr > 1) {
        var ret = [];
        
        for (var i=0; i<bhead.nr; i++) {
            ret.push(stt.read(fd));
        }
        
        return ret;
      } else {
        return stt.read(fd);
      }
    }
  ]);

  var SDNAParser = exports.SDNAParser = Class('SDNAParser', [
    function constructor() {
    },
    
    function parse(code, endian, ptrsize) {
      var view = new DataView(code.buffer);
      var ci = 8; //file cursor
      
      function streq(off, str) {
        var str2 = ""
        for (var i=off; i<off+str.length; i++) {
            str2 += String.fromCharCode(code[i]);
        }
        
        return str2==str
      }
      
      function read_strn(len) { 
        var str2 = ""
        var off = ci;
        
        for (var i=off; i<off+len; i++) {
          str2 += String.fromCharCode(code[i]);
        }
        
        ci = i;
        return str2;
      }
      
      if (!streq(0, "SDNA")) {
        throw new SDNAParseError("expected SDNA");
      }
      if (!streq(4, "NAME")) {
        throw new SDNAParseError("expected NAME");
      }
      
      function read_int(off=ci) {
        ci += 4;
        return view.getInt32(off, endian);
      }
      
      function read_short(off=ci) {
        ci += 2;
        
        return view.getInt16(off, endian);
      }
      
      function read_str(off=ci) {
        var i = off;
        var ret = ""
        
        while (code[i]) {
          ret += String.fromCharCode(code[i]);
          i++;
        }
        
        ci = i+1;
        return ret;
      }
      
      //read name fields
      var totname = read_int();
      
      var names = [], types=[], typelens=[], structs=[];
      console.log("totname", totname, "str", read_str(4, 4));
      
      while (!code[ci]) {
        ci++;
      }
      
      for (var i=0; i<totname; i++) {
        var name = read_str();
        names.push(name);
      }
      
      //console.log(names);
      
      ci = (ci + 3) & ~3;
      if (read_strn(4) != "TYPE") {
        throw new Error("missing type column!");
      }
      
      var tottype = read_int();
      
      for (var i=0; i<tottype; i++) {
        var type = read_str();

        //from dna_genfile.c
        /* this is a patch, to change struct names without a conflict with SDNA */
        /* be careful to use it, in this case for a system-struct (opengl/X) */      
        /* struct Screen was already used by X, 'bScreen' replaces the old IrisGL 'Screen' struct */
        if (type == "bScreen") {
          type = "Screen";
        }
        
        types.push(type);
      }
      
      //console.log(types);
      
      ci = (ci + 3) & ~3;
      if (read_strn(4) != "TLEN") {
        throw new Error("missing type len column!");
      }
      
      for (var i=0; i<tottype; i++) {
        typelens.push(read_short());
      }
      
      //console.log(typelens);
      
      ci = (ci + 3) & ~3;
      if (read_strn(4) != "STRC") {
        throw new Error("missing struct column!");
      }
      
      var last_totfield = 0;
      var totstruct = read_int()
      for (var i=0; i<totstruct; i++){
        if (ci+4 >= code.length) {
          console.log("Bounds error!!", last_totfield, structs)
          break;
        }
        
        //var start_ci = ci;
        var type = read_short();
        var totfield = read_short();
        //ci = start_ci;
        
        //console.log(type, totfield, types[type]);
        var fields = [];
        
        last_totfield = totfield;
        for (var j=0; j<totfield; j++) {
          fields.push([types[read_short()], names[read_short()]]);
        }
        
        structs.push([type, totfield, fields]);
        //ci += (2*totfield+2)*2;
      }
      
      var smap = {}
      var structlist = [];
      
      for (var i=0; i<structs.length; i++) {
        var stt = structs[i];
        var name = types[stt[0]];
        
        stt = new SDNAStruct(name, stt[0], stt[2]);
        smap[name] = stt
        structlist.push(stt);
      }
      
      for (var k in smap) {
        var stt = smap[k];
        var fields = {}
        
        for (var i=0; i<stt.fields.length; i++) {
          var type = stt.fields[i][0];
            
          fields[stt.fields[i][1]] = stt.fields[i] = new SDNAField(stt.fields[i][1], type);
        }
        
        stt._fields = stt.fields;
        stt.fields = fields;
      }
      
      this.sdna = new SDNA(smap, types, typelens, structlist, ptrsize, endian);
      sdna.typelens = typelens;
      
      for (var k in this.sdna.structs) {
        var stt = this.sdna.structs[k];
        stt.fields = {};
        
        for (var i=0; i<stt._fields.length; i++) {
          var f = stt._fields[i];
          
          f.type = SDNAType.from_string(f.type, f.name, this.sdna);
          f.name = f.type.name;
          stt.fields[f.name] = f;
        }
      }
      
      return this.sdna;
    }
  ]);
  
  return exports;
});
