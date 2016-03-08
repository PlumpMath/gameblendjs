var _actor= undefined;

define([
  "../util/util", "../scene/node", "../scene/graph"
], function(util, node, graph) {
  'use strict';

  var exports = _actor = {};
  var Class = util.Class;
  var NodeInterface = node.NodeInterface;

  var Actor = exports.Actor = Class("Actor", NodeInterface, [
    function constructor() {
      NodeInterface.call(this);

      this.id = -1;

      this.object = undefined;
      this.location = undefined;
    }
  ]);

  return exports;
});
