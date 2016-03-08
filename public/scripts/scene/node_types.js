var _node_types = undefined;

define([
  "../util/util", "../util/vectormath", "./node"
], function(util, vectormath, node) {
  'use strict';

  var exports = _node_types = {};
  var Class = util.Class;

  var MatrixSocket = exports.MatrixSocket = Class("MatrixSocket", node.NodeSocket, [
    function constructor(options) {
      node.NodeSocket.call(this, options);
      this.data = new BABYLON.Matrix();
    },

    function setData(data) {
      if (data == undefined) {
        return;
      }

      node.NodeSocket.prototype.setData.call(this, data, false);
      this.data.fromArray(data.m);
    }
  ]);

  var Vec3Socket = exports.Vec3Socket = Class("Vec3Socket", node.NodeSocket, [
    function constructor(options) {
      node.NodeSocket.call(this, options);
      this.data = new BABYLON.Vector3();
    },

    function setData(data) {
      if (data == undefined) {
        return;
      }

      node.NodeSocket.prototype.setData.call(this, data, false);
      this.data.from(data);
    }
  ]);

  var FloatSocket = exports.FloatSocket = Class("FloatSocket", node.NodeSocket, [
    function constructor(options) {
      node.NodeSocket.call(this, options);
      this.data = 0.0;
    },

    function setData(data) {
      node.NodeSocket.prototype.setData.call(this, data, true);
    }
  ]);

  var StringSocket = exports.StringSocket = Class("StringSocket", node.NodeSocket, [
    function constructor(options) {
      node.NodeSocket.call(this, options);
      this.data = new BABYLON.Vector3();
    },

    function setData(data) {
      node.NodeSocket.prototype.setData.call(this, data, true);
    }
  ]);

  var ReadySocket = exports.ReadySocket = Class("ReadySocket", node.NodeSocket, [
    function constructor(options) {
      node.NodeSocket.call(this, options);

      this.data = true;
    },

    //ready is optional, true
    function setReady(ready) {
      this.setData(ready == undefined ? true : ready);
    },

    function setData(data) {
      node.NodeSocket.prototype.setData.call(this, data, true);
    }
  ]);

  return exports;
});

