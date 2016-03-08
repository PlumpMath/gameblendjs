var _library = undefined;
define([
  '../util/util', './sdna', './listbase'
], function(util, sdna, listbase) {
  'use strict';
  
  var exports = _library = {};
  var Class = util.Class;
  
  var DataTypes = exports.DataTypes = {};
  var DataNames = exports.DataNames = {};
  
  var Library = exports.Library = Class(sdna.bases.Library, [
  ]);
  
  sdna.types.register(Library);

  var IDRef = exports.IDRef = Class('IDRef', [
    function constructor() {
      this.name = "";
      this.library = "";
      this.type = "";
    },
    
    Class.symbol(function keystr() {
      return this.type + this.name + ":" + this.library
    })
  ]);
  
  var ID = exports.ID = Class('ID', sdna.bases.ID, [
  ]);
  sdna.types.register(ID);

  var BlockListIter = exports.BlockListIter = Class('BlockListIter', [
    function constructor(list) {
      this.list = list;
      this.i = 0;
      this.ret = {done : false, value : undefined};
    },
    
    Class.symbol(function iterator() {
      return this;
    }),
    
    function next() {
      var ret = this.ret;
      
      if (this.i >= this.list.length) {
        ret.done = true;
        ret.value = undefined;
        
        return ret;
      }
      
      ret.value = this.list[this.i++];
      return ret;
    }
  ]);

  var BlockList = exports.BlockList = Class('BlockList', Array, [
    function constructor(type) {
      Array.call(this);
      this.namemap = {};
      this.type = type;
    },
    
    Class.symbol(function iterator() {
      return new BlockListIter(this);
    }),
    
    function rename(block) {
      throw new Error("implement me!");
    },
    
    function add(block) {
      this.namemap[block.id.name] = block;
      this.push(block);
      
      return this;
    },
    
    function get(int_or_name) {
      if (typeof int_or_name == "number") {
        return this[int_or_name];
      } else {
        return this.namemap[int_or_name];
      }
    }
  ]);

  var Main  = exports.Main = Class('Main', [
    function constructor() {
      this.lists = {};
      this.garbage = [];
      
      this.groups = this.get("GR");
      this.textures = this.get("TE");
      this.images = this.get("IM");
      this.materials = this.get("MA");
      this.meshes = this.get("ME");
      this.objects = this.get("OB");
      this.scenes = this.get("SC");
      this.screens = this.get("SR");
      this.windows = this.get("WM");
      this.armatures = this.get("AR");
      this.actions = this.get("AC");
      this.scripts = this.get("TX");
    },
    
    function add(block, type) {
      this.get(type).add(block);
    },
    
    function get(type) {
      if (!(type in this.lists)) {
        this.lists[type] = new BlockList(type);
      }
      
      return this.lists[type];
    }
  ]);
  
  return exports;
});
