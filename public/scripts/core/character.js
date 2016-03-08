var _character = undefined;

define([
  "../util/util", "../scene/node", "../scene/graph", "./actor", "../libs/babylon"
], function(util, node, graph, actor, unused1) {
  'use strict';

  var exports = _character = {};
  var Class = util.Class;
  var NodeInterface = node.NodeInterface;
  var Actor = actor.Actor;

  var _move_tmps = new util.cachering(function() {
    return new BABYLON.Vector3(0, 0, 0);
  }, 512);

  function safe_mod(a, b) {
    var c = a % b;

    if (c < 0) {
      c += b;
    }

    return c;
  }

  var Character = exports.Character = Class("Character", Actor, [
    function constructor() {
      Actor.call(this);

      this.name = "";
      this.characterName = "";

      this.hp = -1;
      this.mp = -1;
      this._last_col_update = 0.0;

      this.strideLength = 4.665;
      this.walkAction = "WalkCycle2";
      this.walkFrame = 0;
    },

    function rotate(scene, th) {
      this.object._bjs_mesh.rotation.y += th;
    },

    function move(scene, th, speed) {
      var ob = this.object;
      var p = ob._bjs_mesh.position;

      th += ob._bjs_mesh.rotation.y;

      var frame = ~~(safe_mod(this.walkFrame, 24) + 1);
      this.walkFrame += (24/this.strideLength)*speed;

      ob.armature.pose.loadFrame(frame, this.walkAction);

      var dir = new BABYLON.Vector3(Math.sin(th), 0.0, Math.cos(th));
      speed = -speed;

      p.x += dir.x*speed;
      p.y += dir.y*speed;
      p.z += dir.z*speed;

      if (util.time_ms() - this._last_col_update < 250) {
        return;
      }
      //return;

      this._last_col_update = util.time_ms();

      var origin = p;
      var ray = _move_tmps.next();

      ray.x = ray.z = 0.0, ray.y = -1.0;
      var a = scene.castRay(origin, ray, 45);

      ray.x = ray.z = 0.0, ray.y = 1.0;
      var b = scene.castRay(origin, ray, 45);
      var hit;

      //console.log(a, b);

      if (a != undefined && a.hit && b != undefined && b.hit) {
        hit = a.distance < b.distance ? a : b;
      } else if (a != undefined && a.hit) {
        hit = a;
      } else if (b != undefined && b.hit) {
        hit = b;
      } else {
        console.log("Failed to ground character!");
        return;
      }

      //console.log(hit);
      p.copyFrom(hit.pickedPoint);
    }
  ]);

  return exports;
});
