var _scene = undefined;
define([
  '../util/util', '../libs/babylon', '../sdna/sdna', '../core/character',
  './graph'
], function(util, unused1, sdna, character, graph) {
  'use strict';
  
  var exports = _scene = {};
  var Class = util.Class;

  var ray_tmps_ray = new util.cachering(function() {
    return new BABYLON.Ray(new BABYLON.Vector3(), new BABYLON.Vector3());
  }, 32);
  var ray_tmps_vs = new util.cachering(function() {
    return new BABYLON.Vector3();
  }, 32);

  exports.initBabylon = function(engine, canvas) {
    // Now create a basic Babylon Scene object 
    var scene = this._bjs_scene = new BABYLON.Scene(engine);
    scene.collisionsEnabled = true;

    // Change the scene background color to green.
    scene.clearColor = new BABYLON.Color3(0, 1, 0);

    // This creates and positions a free camera
    var pos = new BABYLON.Vector3( -13.721898808775087, 14.077610617917472, -14.571710760382574);

    var camera = _appstate.camera = new BABYLON.FreeCamera("camera1", pos, scene);

    // This targets the camera to scene origin
    camera.setTarget(BABYLON.Vector3.Zero());

    // This attaches the camera to the canvas
    //camera.attachControl(canvas, false);

    // This creates a light, aiming 0,1,0 - to the sky.
    var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);

    // Dim the light a small amount
    light.intensity = .5;

    // Let's try our built-in 'sphere' shape. Params: name, subdivisions, size, scene
    //var sphere = BABYLON.Mesh.CreateSphere("sphere1", 16, 2, scene);

    // Move the sphere upward 1/2 its height
    //sphere.position.y = 1;

    // Let's try our built-in 'ground' shape.  Params: name, width, depth, subdivisions, scene
    //var ground = BABYLON.Mesh.CreateGround("ground1", 1, 1, 2, scene);

    // Leave this function
    return scene;
  }
  
  var Scene = exports.Scene = Class("Scene", sdna.bases.Scene, [
    function constructor() {
      sdna.bases.Scene.apply(this, arguments);
      this.characters = {};
    },
    
    function bjsInit(main, engine, scene) {
      this._bjs_scene = scene;

      //set proxy_from
      for (var ob of main.objects) {
        if (ob.proxy != 0 && ob.proxy != undefined) {
          ob.proxy.proxy_from = ob;
          ob.proxy.pose = ob.pose;
        }
      }

      for (var mat of main.materials) {
        mat.bjsInit(engine, scene);
      }

      //do armatures first so we get bone id mappings
      for (var base of this.base) {
        var ob = base.object;
        if (ob.data != 0 && ob.data instanceof sdna.bases.bArmature && ob.pose != 0) {
          //store a convenience pointer to ob in ob.pose
          ob.pose.object = ob;
          ob.pose.bjsInit(engine, scene);
        }
      }

      //objects
      for (var base of this.base) {
        var ob = base.object;
        ob.bjsInit(engine, scene);
      }
      
      //deal with groups
      for (var base of this.base) {
        var ob = base.object;
        if (ob.type == 0 && ob.dup_group != 0 && ob.dup_group != undefined) {
          console.log("\n   group!!!!!!!!!!!\n");
          
          for (var gbase of ob.dup_group.gobject) {
            var ob2 = gbase.ob;
            console.log(gbase);
            ob2.bjsInit(engine, scene);
          }
        }
      }

      this._bjs_scene.createOrUpdateSelectionOctree();

      //bind armatures
      /*
      for (var base of this.base) {
        var ob = base.object;

        for (var mod of ob.modifiers) {
          if (mod instanceof sdna.types.ArmatureModifierData && mod.object != 0) {
            mod.object.pose.object = mod.object;
            mod.object.pose.bind(ob, engine, scene);
          }
        }
      }*/
    },

    function initCharacters() {
      var object = _appstate.main.objects.namemap.MaleCharacter1_Game;
      var char = new character.Character();

      char.name = char.characterName = "Tom"
      char.object = object;

      this.characters.main = char;
    },

    function initGraph() {
      this.graph = new graph.Graph();
    },

    function castRay(origin, ray, max_dist) {
      var r = ray_tmps_ray.next();
      //console.log("r", r);

      r.length = max_dist != undefined ? max_dist : 1e17;
      r.origin.copyFrom(origin);
      r.direction.copyFrom(ray);

      return this._bjs_scene.pickWithRay(r, undefined, false);
    },

    function buildOctree() {
      var col_objs = new util.set();

      //XXX dumb heuristic for enabling collisions
      for (var base of this.base) {
        var ob = base.object;

        if (!(ob.data instanceof sdna.bases.Mesh))
          continue;

        if (ob.data.skeleton == undefined) {
          col_objs.add(ob);
        }
      }

      for (var ob of col_objs) {
        ob.checkCollisions = true;
      }
    }
  ]);
  sdna.types.register(Scene);
  
  return exports;
});
