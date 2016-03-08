var _object = undefined;

define([
  '../util/util', '../sdna/sdna', '../util/vectormath', '../util/math',
  './mesh', './node', './graph', './node_types'
], function(util, sdna, vectormath, math, mesh, node, graph, node_types) {
  'use strict';
  
  var exports = _object = {};
  var Class = util.Class;
  var set = util.set;
  
  var Vector2 = vectormath.Vector2;
  var Vector3 = vectormath.Vector3;
  var Vector4 = vectormath.Vector4;
  var Quat = vectormath.Quat;
  var Matrix4 = vectormath.Matrix4;
  var SocketFlags = node.SocketFlags;
  var MatrixSocket = node_types.MatrixSocket;

  var Object = exports.Object = Class("Object", sdna.bases.Object, [
    function constructor() {
      sdna.bases.Object.call(this);

      //set up node interface mixin
      node.NodeInterface.call(this);
    },

    Class.symbol(function keystr() {
      return "OB" + this.id.name + "|" + this.node_id;
    }),

    Class.static(function define() { return {
      inputs  : {
        transform : new MatrixSocket({flag : SocketFlags.MULTIPLE_INPUTS})
      },

      outputs : {
        transform : new MatrixSocket()
      }
    }}),

    function nodeExec(graph) {
    },

    function nodeUnlink() {
      NodeInterface.prototype.nodeUnlink.call(this);
    },

    Class.getter(function name() {
      return this.id.name;
    }),
    
    function bjsInit(engine, scene) {
      if (this.data instanceof sdna.bases.Mesh) {
        var armature = undefined;

        for (var mod of this.modifiers) {
          if (mod instanceof sdna.bases.ArmatureModifierData && mod.object != 0) {
            armature = mod.object;
            if (armature.proxy_from != undefined) {
              armature = armature.proxy_from;
            }

            this.armature = armature;
            break;
          }
        }

        if (!this.data._bjs_ready) {
          this.data.bjsInit(engine, scene, armature, this);
        }

        this._bjs_mesh = new BABYLON.InstancedMesh(this.id.name, this.data._bjs_mesh);
        this._bjs_mesh.createOrUpdateSubmeshesOctree();

        //convert to y-up 
        this._bjs_mesh.position.x = this.loc[0];
        this._bjs_mesh.position.y = this.loc[2];
        this._bjs_mesh.position.z = this.loc[1];
        
        this._bjs_mesh.scaling.x = this.size[0];
        this._bjs_mesh.scaling.y = this.size[1];
        this._bjs_mesh.scaling.z = this.size[2];

        if (armature != undefined) {
          if (armature.pose._bjs_skeleton == undefined) {
            armature.pose.object = armature;
            armature.pose.bjsInit(engine, scene);
          }

          console.log("Bind pose 2!",  armature.pose._bjs_skeleton);

          //this._bjs_mesh.skeleton = armature.pose._bjs_skeleton;

          for (var i=0; i<this._bjs_mesh.subMeshes.length; i++) {
            this._bjs_mesh.subMeshes[i].skeleton = armature.pose._bjs_skeleton;
          }
        }

        scene.addMesh(this._bjs_mesh);
      }
    }
  ]);

  util.mixin(exports.Object, node.NodeInterface);
  sdna.types.register(exports.Object);
  
  return exports;
});
