var _node = undefined;

define([
  '../util/util', '../sdna/sdna', '../util/vectormath', '../util/math'
], function(util, sdna, vectormath, math) {
  'use strict';
  
  var exports = _node = {};
  var Class = util.Class;
  var set = util.set;
  
  var Vector2 = util.Vector2;
  var Vector3 = util.Vector3;
  var Vector4 = util.Vector4;
  var Quat = util.Quat;
  var Matrix4 = util.Matrix4;
  
  var SocketFlags = exports.SocketFlags = {
    SELECT          : 1,
    MULTIPLE_INPUTS : 2,
    UPDATE          : 4
  };
  
  var NodeFlags = exports.NodeFlags = {
    SELECT : 1,
    UPDATE : 4
  };
  
  var SocketTypes = exports.SocketTypes = {
    INPUT  : 1,
    OUTPUT : 2
  };
  
  var NodeSocket = exports.NodeSocket = Class("NodeSocket", [
    /*
      options (all are optional):
      {
        flag  : flag built from SocketFlags, default is 0
        field : if set, name of property in owning node to pull data from.
      }
    */
    function constructor(options) {
      if (options == undefined) {
        options = {};
      }

      this.links = [];
      this.name = "";
      this.type = -1;
      this.node = undefined;
      this.data = undefined;
      this.flag = options.flag != undefined ? options.flag : 0;
      this.fieldName = options.field != undefined ? options.field : undefined;
    },

    function bindToOwner(propname) {
      var owner = this.node;
      var storename = "_" + propname;
      var socket = this;

      Object.defineProperty(owner, propname, {
        configurable : true,

        get : function() {
          return this[storename];
        },

        set : function(data) {
          this[storename] = data;
          socket.setData(data);
        }
      });

      Object.defineProperty(this, "data", {
        configurable : true,

        get : function() {
          return owner[propname];
        },

        set : function(data) {
          owner[propname] = data;
          socket.setData(data);
        }
      });
    },

    //set_the_data is optional, false
    function setData(data, set_the_data) {
      if (set_the_data)
        this.data = data;

      //graph code handles propegating update flags to linked sockets
      //this.flag |= SocketFlags.UPDATE;
    },

    function clone() {
      var ret = new this.constructor(this.flag);
      ret.setData(this.getData());
      return ret;
    },

    function getData() {
    },
    
    function isLinked() {
    },

    function link(sock) {
      if (this.type == SocketTypes.INPUT && !(this.flag & 
          SocketFlags.MULTIPLE_INPUTS) && this.links.length > 0)
      {
          throw new Error("Socket doesn't support multiple inputs");
      }
      
      this.links.push(sock);
      sock.links.push(this);
    },
    
    function update() {
      this.flag |= SocketFlags.UPDATE;
    }
  ]);
  
  var NodeInterface = exports.NodeInterface = Class("NodeInterface", [
    function constructor() {
      var def = this.constructor.define();
      
      this.node_inputs = {};
      this.node_outputs = {};
      this.node_id = -1;
      this.node_totinput = 0;
      this.node_totoutput = 0;
      this.node_flag = 0;

      for (var k in def.inputs) {
        var sock = def.inputs[k].clone();
        
        sock.name = k;
        sock.node = this;
        sock.type = SocketTypes.INPUT;

        if (sock.fieldName != undefined) {
          sock.bindToOwner(sock.fieldName);
        }

        this.node_inputs[k] = sock;
        this.node_totinput++;
      }
      
      for (var k in def.outputs) {
        var sock = def.outputs[k].clone();
        
        sock.name = k;
        sock.node = this;
        sock.type = SocketTypes.OUTPUT;

        if (sock.fieldName != undefined) {
          sock.bindToOwner(sock.fieldName);
        }

        this.node_outputs[k] = sock;
        this.node_totoutput++;
      }
    },
    
    Class.static(function define() { return {
      inputs  : {},
      outputs : {}
    }}),

    function nodeUpdate() {
      this.node_graph.update_list.add(this);
      this.node_flag |= NodeFlags.UPDATE;
    },

    function canExec() {
      return true;
    },

    function nodeExec() {
    },
    
    function nodeUnlink() {
    }
  ]);
  
  return exports;
});
