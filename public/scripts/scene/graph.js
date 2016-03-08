var _graph = undefined;

define([
  '../util/util', '../sdna/sdna', '../util/vectormath', '../util/math',
  './node'
], function(util, sdna, vectormath, math, node) {
  'use strict';
  
  var exports = _graph = {};
  var Class = util.Class;
  var set = util.set;
  
  var Vector2 = util.Vector2;
  var Vector3 = util.Vector3;
  var Vector4 = util.Vector4;
  var Quat = util.Quat;
  var Matrix4 = util.Matrix4;
  
  var SocketFlags = node.SocketFlags;
  var NodeFlags = node.NodeFlags;
  
  //dependency/logic graph
  var GraphFlags = exports.GraphFlags = {
    SELECT : 1,
    RESORT : 4
  };
  
  var Graph = exports.Graph = Class('Graph', [
    function constructor() {
      this.nodes = [];
      this.roots = [];
      this.idmap = {};
      this.update_list = new util.set();
      this._update_list2 = new util.set();
      
      this.idgen = new util.IDGen();
      this.tick_nodes = [];
    },

    function setTickNode(node) {
      if (this.tick_nodes.indexOf(node) >= 0) {
        console.trace("Warning: double call to setTickNode!", node);
        return;
      }

      this.tick_nodes.push(node);
    },

    function unsetTickNode(node) {
      if (this.tick_nodes.indexOf(node) < 0) {
        console.trace("Warning during call to unsetTickNode: node not in tick list", node);
        return;
      }

      this.tick_nodes.remove(node);
    },

    function add(node) {
      if (this.nodes.indexOf(node) >= 0) {
        console.trace(node);
        throw new Error("Node already added to graph");
      }
      
      node.node_id = this.idgen.next();
      node.node_graph = this;

      this.idmap[node.node_id] = node;
      this.nodes.push(node);

      this.flag |= GraphFlags.RESORT;
    },
    
    function remove(node) {
      if (!(node.node_id in this.idmap)) {
        console.trace("Warning: invalid call to graph.remove, node not in list:", node);
        return;
      }

      if (this.tick_nodes.indexOf(node) >= 0) {
        this.unsetTickNode(node);
      }

      if (this.roots.indexOf(node) >= 0) {
        this.roots.remove(node);
      }

      delete this.idmap[node.node_id];
      this.nodes.remove(node);

      if (this.update_list.has(node)) {
        this.update_list.remove(node);
      }
      if (this._update_list2.has(node)) {
        this._update_list2.remove(node);
      }

      //fire unlink callback
      node.nodeUnlink(this);
    },
    
    function execute() {
      var this2 = this;
      
      var totupdated = 0;
      
      function exec(n) {
        var wait = n.canExec() || !(n.node_flag & NodeFlags.UPDATE);
        
        for (var sock of n.node_inputs) {
          sock = n.node_inputs[sock];

          for (var i=0; i<sock.links.length; i++) {
            if (sock.links[i].node.node_flag & NodeFlags.UPDATE) {
              wait = true;
              break;
            }
          }
        }
        
        if (wait || !(n.node_flag & NodeFlags.UPDATE)) {
          return;
        }

        n.nodeExec(this2);
        n.node_flag &= ~NodeFlags.UPDATE;
        this2.update_list.remove(n);

        //propagate output update flags to child nodes, then clear
        //any output socket that with update flag set (by nodeExec) will have connecting
        //nodes update flags set as well.
        for (var sock in n.node_outputs) {
          sock = n.node_outputs[sock];

          for (var i=0; i<sock.links.length; i++) {
            if (sock.flag & SocketFlags.UPDATE) {
              sock.links[i].setData(sock.data);
              sock.links[i].node.nodeUpdate();
              sock.links[i].flag &= ~SocketFlags.UPDATE;
            }
          }

          sock.flag &= ~SocketFlags.UPDATE;
        }

        totupdated++;
      }

      //first, tag nodes in tick_list for update
      for (var node of this.tick_nodes) {
        node.nodeUpdate();
      }

      //core loop
      var max_steps = 35;
      
      for (var i=0; i<max_steps; i++) {
        totupdated = 0;
        
        //roots first
        for (var n of this.roots) {
          exec(n);
        }

        //see if tick-updated nodes are ready. . .
        for (var n of this.tick_nodes) {
          exec(n);
        }

        //now do rest of updated nodes
        var list = this.update_list; this.update_list = this._update_list2;
        this._update_list2 = list;
        
        this.update_list.reset();
        
        list.forEach(function(node) {
          exec(node);
        });
        
        if (!totupdated) {
          break; //done!
        }
      }
      
      if (i == max_steps) {
        console.log("WARNING: infinite loop in dependency graph?");
      }
    },
    
    function sort() {
      this.roots.length = 0;
      
      //just find roots for now
      for (var i=0; i<this.nodes.length; i++) {
        var node = this.nodes[i];
        
        if (node.node_totinput > 0) 
          continue;
        
        this.roots.push(node);
      }
    },
  ]);
  
  return exports;
});
