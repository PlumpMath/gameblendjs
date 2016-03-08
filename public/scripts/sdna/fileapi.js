var _fileapi = {};
define([
  '../util/util', './sdna', './library', './idproperty', '../util/net', './int64'
], function(util, sdna_mod, library, idproperty, net, int64) {
  "use strict";
  
  var exports = _fileapi = {};

  var Class = util.Class;
  var hashtable = util.hashtable, cachering = util.cachering;
  var SDNAParser = sdna_mod.SDNAParser, ENDIAN_LITTLE=sdna_mod.ENDIAN_LITTLE,
                   ENDIAN_BIG = sdna_mod.ENDIAN_BIG;
    
  var parse_action = exports.parse_action = function parse_action(data) {
    data = atob(data);

    var data2 = new Uint8Array(data.length);
    for (var i=0; i<data.length; i++) {
      data2[i] = data.charCodeAt(i);
    }

    var reader = new FileData(data2.buffer);
    var totname = reader.read_int();
    var namemap = {}
    var restmats = {}

    for (var i=0; i<totname; i++) {
      var name = reader.read_string(64);
      var restmat = new Array(16);

      for (var j=0; j<16; j++) {
        restmat[j] = reader.read_float();
      }

      restmats[name] = restmat;
      namemap[i] = name;
    }

    var frames = {};
    var _i=0;

    while (reader.i < reader.buf.byteLength) {
      var frame = reader.read_float();
      var name = reader.read_short();

      name = namemap[name];

      var mat = new Array(16);
      for (var i=0; i<16; i++) {
        mat[i] = reader.read_float();
      }

      mat = new BABYLON.Matrix.FromArray(mat);

      if (!(frame in frames)) {
        frames[frame] = {};
      }

      frames[frame][name] = mat;
    }

    frames.restmats = restmats;
    return frames;
  }

  var convertBlendPath = exports.convertBlendPath = function convertBlendPath(path) {
    path = path.replace(/\\/g, "/");
    
    if (path[0] == "/" && path[1] == "/") {
      path = path.slice(1, path.length);
    }
          
    return path;
  };

  /*
  polyfill DataView.prototype.get[u]Int64()
  */

  if (DataView.prototype.getUint64Array == undefined) {
      DataView.prototype.getUint64 = function(i, endian) {
          var b1 = this.getUint32(i, endian);
          var b2 = this.getUint32(i+4, endian);

          /*
          if (!endian) {
            var t = b1; b1 = b2; b2 = t;
          }
          return new int64.Int64().loadPair(b1, b2);
          //*/

         //*
          if (endian)
            return b1 + b2*Math.pow(2.0, 32);
          else
            return b2 + b1*Math.pow(2.0, 32);
         //*/
      }
      
      DataView.prototype.getInt64 = function(i, endian) {
          var b1 = this.getUint32(i, endian);
          var b2 = this.getUint32(i+4, endian);

          /*
          if (!endian) {
            var t = b1; b1 = b2; b2 = t;
          }

          return new int64.Int64().loadPair(b1, b2);
          */

          //*
          if (b2 & ((1<<32)-1)) {
            b1 = ~b1;
            b2 = ~b2;
            
            return -(b1 + b2*Math.pow(2.0, 32));
          }
          
          return b1 + b2*Math.pow(2.0, 32);//*/
      }
  }

  var SEEK_SET = 0;
  var SEEK_CUR = 1;

  var FileData = exports.FileData = Class('FileData', [
      function constructor(buf) {
          this.main = new library.Main();
          this.buf = buf;
          this.i = 0;
          this.version = undefined;

          this.view = new DataView(buf);
          this.uview = new Uint8Array(buf);
          
          this.libblocks = undefined; //primary data will go here
          this.directdata = undefined; //secondary data, usually owned by libblocks
          this.oldmap = undefined; //pointer map;
          this.link_doneset = new util.set();
          
          this.endian = 1; //true means little endian
          this.ptrsize = 4;
          this.sdna = undefined;
          this.host_typemanager = sdna_mod.types;
      },
      
      function seek(i, origin=SEEK_SET) {
          if (origin == SEEK_SET) {
            this.i = i;
          } else if (origin == SEEK_CUR) {
            this.i += i;
          }
      },
      
      function skip(n) {
        this.i += n;
      },
      
      function rewind() {
          this.i = 0;
      },
    
      function read_byte() {
          var ret = this.view.getUint8(this.i, this.endian);
          this.i += 1;
          return ret;
      },
      
      function read_char() {
          var ret = this.view.getUint8(this.i, this.endian);
          this.i += 1;
          return String.fromCharCode(ret);
      },
      
      function read_short() {
          var ret = this.view.getInt16(this.i, this.endian);
          this.i += 2;
          return ret;
      },
      
      function read_ushort() {
          var ret = this.view.getUint16(this.i, this.endian);
          this.i += 2;
          return ret;
      },
      
      function read_int() {
          var ret = this.view.getInt32(this.i, this.endian);
          this.i += 4;
          return ret;
      },
      
      function read_uint() {
          var ret = this.view.getUint32(this.i, this.endian);
          this.i += 4;
          return ret;
      },
        
      function read_long() {
          return this.read_int();
      },
      
      function read_ulong() {
          return this.read_uint();
      },
      
      function read_int64_t() {
          var ret = this.view.getInt64(this.i, this.endian);
          this.i += 8;
          return ret;
      },
      
      function read_uint64_t() {
          var ret = this.view.getUint64(this.i, this.endian);
          this.i += 8;
          return ret;
      },
      
      function read_float() {
        var ret = this.view.getFloat32(this.i, this.endian);
        this.i += 4;
        return ret;
      },
      
      function read_double() {
        var ret = this.view.getFloat64(this.i, this.endian);
        this.i += 8;
        return ret;
      },
      
      function tell() {
          return this.i;
      },
      
      function read_pointer() {
        if (this.ptrsize == 4) {
            return this.read_uint();
        } else {
            return this.read_uint64_t();
        }
      },
      
      function read_bytes(n) {
          var ret = this.buf.slice(this.i, this.i+n);
          this.i += n;
          return ret;
      },
      
      function eof() {
          return this.i >= this.buf.byteLength;
      },
      
      //ascii, mercifully
      function read_string(size) {
          if (isNaN(size)) {
              throw new Error("Size was NaN");
          }
          
          var si = this.i, ei = si+size, hit_zero=false;
          var uview = this.uview;
          var s = "";
          
          while (si < ei) {
              var v = uview[si];
              
              if (v == 0) {
                  hit_zero = true;
                  si++;
                  continue;
              }
              
              if (!hit_zero) {
                  s += String.fromCharCode(v);
              }
              
              si++;
          }
          
          this.i = si;
          return s;
      }
  ]);

  var BHead = exports.BHead = Class('BHead', [
      function constructor() {
        this.code = undefined; this.len = 0;
        this.old = 0; this.sdna = 0;
        this.nr = 0;
      }
  ]);

  var read_bhead_cache = cachering.fromConstructor(BHead, 64);

  var read_bhead = exports.read_bhead = function(fd) {
      var bh = read_bhead_cache.next();
      
      bh.code = fd.read_string(4);
      bh.len = fd.read_int();
      bh.old = fd.read_pointer();
      bh.sdna = fd.read_int();
      bh.nr = fd.read_int();
      
      return bh;
  }
  
  var loadFile = exports.loadFile = function loadFile(url) {
    return new FileLoader().loadFile(url);
  }
  
  var FileLoader = exports.FileLoader = Class('FileLoader', [
    function constructor() {
    },
    
    function loadFile(url) {
      var this2 = this;
      
      return new Promise(function(accept, reject) {
        net.fetch_file(url).then(function(buffer) {
          var fd = new FileData(buffer);
          console.log("FileData", fd);

          this2.load_file_intern(fd).then(function() {
            accept(fd);
          });
        });
      });
    },
    
    function load_file_intern(fd) {
      var doaccept;
      var promise = new Promise(function(accept, reject) {
        doaccept = function(fd) {
          accept(fd);
        }
      });
      
      this.load_blocks(fd);
      
      //deal with externally linked blocks
      var libblocks = fd.libblocks;
      var donemap = fd.libraries = {}, totloading=0;
      var this2 = this;
      
      function get_path(path) {
        donemap[path] = {
          done : false,
          fd   : undefined
        };
        
        totloading++;
        
        console.log("loading ", path, ". . .");
        var loader = new FileLoader();
        loader.loadFile(path).then(function(fd2) {
          donemap[path].fd = fd2;
          totloading--;
          
          if (totloading == 0) {
            finish(fd, donemap);
          }
        });
      }
      
      for (var i=0; i<libblocks.length; i++) {
        var block = libblocks[i];
        var id = block instanceof sdna_mod.bases.ID ? block : block.id;
        if (id.lib == 0 || id.lib == undefined)
          continue;

        //console.log("------->", id.lib);

        console.log(id);
        var lib = fd.oldmap.get(id.lib);
        
        //convertBlendPath
        //apparently. . . relative path is stored in lib.name,
        //original absolute one in lib.filepath? eesh!
        var path = convertBlendPath(lib.name);
        if (path.startsWith("/../..")) {
          path = path.slice("/../..".length, path.length);
        }
        path = path.trim();
        lib.name = path;
        
        if(!(path in donemap)) {
          get_path(path);
        }
      }
      
      if (totloading==0) {
        finish(fd, donemap);
      }
      
      var finish_called = false;
      
      var this2 = this;
      function finish(fd, donemap) {
        if (finish_called) {
          console.log("double call to finish");
          return;
        }
        finish_called = true;

        var libblocks = fd.libblocks;
        
        var namemap = {};
        for (var k in donemap) {
          var v = donemap[k];
          v.namemap = {};
          v.instmap = {};
          
          for (var block of v.fd.libblocks) {
            var id = block instanceof sdna_mod.bases.ID ? block : block.id;
            
            v.namemap[id.type + id.name] = block;
            v.instmap[block._bl_instance_id] = v;
          }
        }
        
        for (var i=0; i<libblocks.length; i++) {
          var block = libblocks[i];
          var id = block instanceof sdna_mod.bases.ID ? block : block.id;
          if (id.lib == 0 || id.lib == undefined)
            continue;
          
          var lib = fd.oldmap.get(id.lib);
          var fd2 = donemap[lib.name].fd;
          
          var block2 = donemap[lib.name].namemap[id.name];
          /*
          if (block2 == undefined) {
            console.log("missing block!", id.name, id);
            continue;
          }//*/

          if (block2.id.type != undefined) { //add back prefix to name
            block2.id.name = block2.id.type + block2.id.name;
            delete block2.id.type;
          }
          
          if (block2 == undefined) {
            console.log(id);
            console.log("EEK!");
            throw new Error();
          }
          
          fd.oldmap.set(libblocks[i]._bl_sdna_ptr, block2);
          block2._bl_sdna_ptr = libblocks[i]._bl_sdna_ptr;
          
          libblocks[i] = block2;
        }
        
        this2.link_blocks(fd, donemap);
        console.log("filedata2", fd);
        this2.patch_data(fd);
        
        doaccept(fd);
      }
      
      return promise;
    },
    
    function load_blocks(fd) {
      if (fd.read_string(7) != "BLENDER") {
          throw new Error("Invalid file");
      }
      
      var ptrsize = fd.read_char() == "-" ? 8 : 4;
      fd.ptrsize = ptrsize;
      
      //are we little-endian
      var endian = fd.read_char() == "v";
      fd.endian = endian;
      
      var version = fd.read_string(3);
      fd.version = version;

      var filestart = fd.tell();
      
      var data=[];
      var libblocks = fd.libblocks = [];
      var olds=[];
      var snrs=[];
      var nrs=[];
      var oldmap = new hashtable();
      fd.oldmap = oldmap;
      
      var totbhead = 0;
      var _ci=0;
      var dna = undefined;
      
      //find dna code
      while (!fd.eof()) {
        var bh = read_bhead(fd);
        
        if (bh.code == "DNA1") {
          dna = fd.read_bytes(bh.len);
        } else {
          fd.skip(bh.len);
        }
        
        if (_ci++ > 100000) {
            console.log("infinite loop");
            break;
        }
      }
      
      if (dna == undefined) {
          throw new Error("Could not find SDNA");
      }
      
      var parser = new SDNAParser();
      dna = new Uint8Array(dna);
      
      var sdna = parser.parse(dna, fd.endian ? ENDIAN_LITTLE : ENDIAN_BIG, fd.ptrsize);
      fd.sdna = sdna;
      
      console.log(sdna);
      
      fd.seek(filestart);
      
      var _ci = 0;

      var start_reading = util.time_ms();
      console.log("reading data. . .");

      while (!fd.eof()) {
        var bh = read_bhead(fd);
        var next = fd.tell() + bh.len;
        
        if (bh.code == "DATA") {
          //XXX: I guess 0 means unstructured data?
          if (bh.sdna == 0) {
            var bytes = fd.read_bytes(bh.len*bh.nr);
            oldmap.set(bh.old, bytes);
          } else {
            var obj = sdna.read(bh, fd);
            
            oldmap.set(bh.old, obj);
            data.push(obj);
            obj._bl_sdna_ptr = bh.old;
          }
        } else if (bh.code == "ENDB") {
          break;
        } else if (bh.code != "DNA1") {
          //console.log("- reading block type", bh.code);
          
          var block = sdna.read(bh, fd);
          oldmap.set(bh.old, block);
          
          //if (block.id == undefined)
          //  console.log("==========>", bh.code, block);
          
          if (bh.code == "REND") {
            fd.rend = block;
          } else if (bh.code == "GLOB") {
            fd.glob = block;
          } else if (bh.code == "TEST") {
            fd.test = block;
          } else {
            libblocks.push(block);
          }
          
          block._bl_sdna_ptr = bh.old;
        }
        
        fd.seek(next);
        
        if (_ci++ > 100000) {
            console.log("infinite loop");
            break;
        }
      }

      var end_reading = util.time_ms();
      console.log("done reading data", (end_reading-start_reading).toFixed(3) + "ms");

      fd.oldmap = oldmap;
      fd.libblocks = libblocks;
      fd.directdata = data;
      
      var libblocks2 = [];
      
      for (var i=0; i<libblocks.length; i++) {
        var block = libblocks[i];
        
        if (block.constructor === Array) {
            for (var j=0; j<block.length; j++) {
              libblocks2.push(block[j]);
            }
        } else {
          libblocks2.push(block);
        }
      }
      
      fd.libblocks = libblocks2;
    },
    
    function link_blocks(fd, donemap) {
      console.log("linking data. . .");

      var oldmap = fd.oldmap, libblocks = fd.libblocks;
      
      /*get rid of block name type prefix, and add blocks to main*/
      for (var i=0; i<libblocks.length; i++) {
          var block = libblocks[i];
          
          if (block.id == undefined) {
            console.log("BAD BLOCK: ", block);
            //throw new Error("bad block");
            continue;
          }
          
          //block.id.name.slice(0, 2)
          var type = block.id.name.slice(0, 2);
          block.id.type = type;
          block.id.name = block.id.name.slice(2, block.id.name.length);
          
          fd.main.add(block, type);
      }
      
      //make sure externally linked-in data is properly added to libblock list
      var blockset = {}; //new util.set();
      for (var i=0; i<libblocks.length; i++) {
        blockset[libblocks[i]._bl_instance_id] = 1; //blockset.add(libblocks[i]._bl_instance_id);
      }
      
      function is_libblock(block) {
        if (block._bl_instance_id in blockset) //blockset.has(block._bl_instance_id))
          return true;
        
        for (var k in donemap) {
          var v = donemap[k];
          
          if (block._bl_instance_id in v.instmap) {
            return true;
          }
        }
        
        return false;
      }
      
      for (var i=0; i<libblocks.length; i++) {
          var block = libblocks[i];
          
          block._bl_sdna.link(block, fd);
      }
      
      var visitset = {}; //new util.set();
      var found_block = false;
      
      function find_orphaned_libblocks(obj) {
        if (obj._bl_instance_id in visitset) { //visitset.has(obj._bl_instance_id)) {
          return;
        }

        visitset[obj._bl_instance_id] = 1;
        //visitset.add(obj._bl_instance_id);
        
        if (is_libblock(obj) && !(obj._bl_instance_id in blockset)) { //blockset.has(obj._bl_instance_id)) {
          libblocks.push(obj);
          blockset[obj._bl_instance_id] = 1; //blockset.add(obj._bl_instance_id);
          
          if (obj.id.type == undefined) {
            obj.id.type = obj.id.name.slice(0, 2);
            obj.id.name = obj.id.name.slice(2, obj.id.name.length);
          }
          
          fd.main.add(obj, obj.id.type);
          found_block = true;
        }
        
        var stt = obj._bl_sdna;
        
        for (var k in stt.fields) {
          var f = stt.fields[k];
          var val = obj[f.name];
          
          if (val != undefined && typeof val == "object" && "_bl_instance_id" in val) {
            find_orphaned_libblocks(val);
          } else if (val != undefined && typeof val == "object" && val instanceof Array) {
            for (var i=0; i<val.length; i++) {
              if (val[i] != undefined && typeof val[i] == "object" && "_bl_instance_id" in val[i]) {
                find_orphaned_libblocks(val[i]);
              }
            }
          }
        }
      }
      
      for (var si=0; si<10000; si++) {
        var len = libblocks.length;
        found_block = false;
        
        for (var i=0; i<len; i++) {
          find_orphaned_libblocks(libblocks[i]);
        }
        
        if (!found_block) {
          break;
        }
      }

      console.log("done linking data.");
    },
    
    function patch_data(fd) {
      console.log("patching data. . .");

      var libblocks = fd.libblocks, oldmap = fd.oldmap, data=fd.directdata;
      
      //deal with material pointers
      var endian = fd.endian;
      var obs = fd.main.objects;
      
      function read_matlist(mat, totcol) {
        if (mat == undefined || mat == 0) 
          return [];
        if (mat instanceof int64.Int64 || typeof mat == "number") {
          mat = fd.oldmap.get(mat);
        }

        if (!(mat instanceof ArrayBuffer)) {
          console.trace("EEEEK! not an array buffer!", mat);
          return mat;
        }
        
        var ret = [];
        var view = new DataView(mat);
        
        //don't worry about matbits (whether to use object or mesh material) 
        //for now . . .
        
        for (var j=0; j<totcol; j++) {
          var ptr;

          if (fd.ptrsize == 8) {
            ptr = view.getUint64(j*8, endian);
          } else {
            ptr = view.getUint32(j*4, endian);
          }

          if (ptr == 0) {
            ret.push(null);
            continue;
          }
          
          var mat = fd.oldmap.get(ptr);
          ret.push(mat);
        }
        
        return ret;
      }
      
      for (var i=0; i<obs.length; i++) {
        var ob = obs[i];
        ob.mat = read_matlist(ob.mat, ob.totcol);
      }
      
      var meshes = fd.main.meshes;
      for (var i=0; i<meshes.length; i++) {
        var me = meshes[i];
        me.mat = read_matlist(me.mat, me.totcol);
      }
      
      for (var i=0; i<data.length; i++) {
        var d = data[i];
        
        if (d.constructor === Array) {
          for (var j=0; j<d.length; j++) {
            d[j]._bl_sdna.link(d[j], fd);
          }
        } else {
          d._bl_sdna.link(d, fd);
        }
      }

      //fix mtex in material
      var mats = fd.main.materials;
      for (var i=0; i<mats.length; i++) {
        var mat = mats[i];
        
        var mtex = [];
        for (var j=0; j<mat.mtex.length; j++) {
          if (mat.mtex[j] == 0) 
            continue;
          
          if (mat.mtex[j] instanceof int64.Int64 || typeof mat.mtex[j] == "number") {
            mtex.push(fd.oldmap.get(mat.mtex[j]));
          } else {
            mtex.push(mat.mtex[j]);
          }
        }
        
        mat.mtex = mtex;
      }
      
      for (var i=0; i<libblocks.length; i++) {
        var block = libblocks[i];
        
        if (block.id == undefined) {
          console.log("WARNING: lib block error!!", block);
          libblocks.remove(block);
          i--;
          continue;
        }
        
        //handle id properties
        if (block.id.properties != undefined) {
          block.id.properties = idproperty.IDPropsToJSON(block.id.properties);
        } else {
          block.id.properties = {}
        }
      }
      
      //do some stuff to pose data
      var obs = fd.main.objects;
      for (var i=0; i<obs.length; i++) {
        var ob = obs[i];
        
        if (ob.pose == undefined || ob.pose == 0) {
          continue;
        }

        ob.pose.object = ob;

        var arm = ob.data;
        if (!(arm instanceof sdna_mod.bases.bArmature)) {
          console.trace("Warning: non-armature pose detected for object", ob.name);
          continue;
        }

        for (var pbone of ob.pose.chanbase) {
          pbone.bone = ob.data.bones[pbone.name];

          if (pbone.prop != undefined && pbone.prop != 0) {
            pbone.prop = idproperty.IDPropsToJSON(pbone.prop);
          }
        }

        //parse baked actions
        ob.pose.actions = {}

        for (var k in ob.id.properties) {
          if (!k.startsWith("action_"))
            continue;

          ob.pose.actions[k.slice(7, k.length)] = parse_action(ob.id.properties[k])
        }
      }

      console.log("done patching data");
    }
  ]);
  
  return exports;
});
