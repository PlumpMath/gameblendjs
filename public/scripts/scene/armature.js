var _armature = undefined;

define([
  '../util/util', '../sdna/sdna', '../util/vectormath', '../util/math'
], function(util, sdna, vectormath, math) {
  'use strict';
  
  var exports = _armature = {};
  var Class = util.Class;
  var set = util.set;
  
  var Vector2 = vectormath.Vector2;
  var Vector3 = vectormath.Vector3;
  var Vector4 = vectormath.Vector4;
  var Quat = vectormath.Quat;
  var Matrix4 = vectormath.Matrix4;
  
  var bArmature = exports.Armature = Class("Armature", sdna.bases.bArmature, [
    function constructor() {
      sdna.bases.bArmature.apply(this, arguments);
      this._bone_namemap = undefined;
    },
    
    Class.getter(function bones() {
      if (this._bone_namemap != undefined) {
        return this._bone_namemap;
      }

      function recurse(b) {
        this._bone_namemap[b.name] = b;

        for (var child of b.childbase) {
          recurse.call(this, child);
        }
      }

      this._bone_namemap = {};
      for (var pbone of this.bonebase) {
        recurse.call(this, pbone);
      }
      
      return this._bone_namemap;
    }),
    
    Class.getter(function name() {
      return this.id.name;
    })
  ]);
  
  sdna.types.register(bArmature);
  
  return exports;
});
