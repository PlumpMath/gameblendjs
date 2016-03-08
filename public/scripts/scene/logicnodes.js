var _logicnodes = undefined;

define([
  "../util/util", "./node_types.js", "node.js"
], function(util, node_types, node) {
    'use strict';

  var exports = _logicnodes = {};
  var Class = util.Class;

  var Action = exports.Action = Class("Action", node.NodeInterface, [
    function constructor() {
      NodeInterface.call(this);

      this.done = false;
    },

    function finish() {
      this.done = true;
    },

    Class.overlay(function canExec(underlying) {
      var socket = this.inputs.ready;

      if (socket.links.length > 0) {
        for (var i=0; i<socket.links.length; i++) {
          if (!socket.links[i].getData()) {
            return false;
          }
        }
      }

      return underlying.call(this);
    }),

    Class.overlay(function nodeExec(underlying) {
      if (this.done) {
        this.outputs.then.update();
        return;
      }

      return underlying.call(this);
    }),

    Class.static(function define() { return {
      inputs  : {
        ready : new node_types.ReadySocket()
      },

      outputs : {
        then : new node_types.ReadySocket()
      }
    }})
  ]);

  var InsideRegion = exports.InsideRegion = Class("InsideRegion", Action, [
    function constructor() {
      Action.call(this);
      this.inside = false;
    },

    Class.static(function define() { return {
      inputs  : {
        ready    : new node_types.ReadySocket(),
      },

      outputs : {
        then : new node_types.ReadySocket()
      }
    }}),

    function setInside(inside) {
      this.inside = inside;
      this.done = false;
      this.nodeUpdate();
    },

    function nodeExec() {
      this.then.setData(this.inside);
      this.then.update();
    }
  ]);

  //trigger nodes are a bit weird, they violate the rules a bit.
  //the end node modifies the start one, that's why it requires
  //a direct link
  var TriggerStart = exports.TriggerStart = Class("TriggerStart", Action, [
    function constructor(name) {
      Action.call(this);

      this.running = false;
      this.name = name == undefined ? "unnamed" : name;
    },

    Class.static(function define() { return {
      inputs  : {
        ready    : new node_types.ReadySocket(),
        end_link : new node_types.ReadySocket()
      },

      outputs : {
        then : new node_types.ReadySocket()
      }
    }}),

    function trigger() {
      this.done = false;
      this.node_graph.setTickNode(this);
      this.running = true;
    },

    function stop() {
      this.done = true;
      this.node_graph.unsetTickNode(this);
      this.running = false;
    },

    function nodeExec() {
      this.then.update();
    }
  ]);

  var TriggerEnd = exports.TriggerEnd = Class("TriggerEnd", Action, [
    function constructor() {
      Action.call(this);
    },

    Class.static(function define() { return {
      inputs  : {
        ready    : new node_types.ReadySocket(),
        start_link : new node_types.ReadySocket()
      },

      outputs : {
        then : new node_types.ReadySocket()
      }
    }}),

    function nodeExec() {
      if (this.inputs.start_link.links.length == 0) {
        console.trace("WARNING: failed to find start trigger node");
        return;
      }

      var n = this.inputs.start_link.links[0].node;

      if (n.running) {
        n.stop();
      }

      //trigger child nodes
      this.then.update();
    }
  ]);

  return exports;
});
