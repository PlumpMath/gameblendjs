var _app = undefined;
define([
  '../util/util', '../libs/babylon', '../scene/scene',
  '../util/net', '../sdna/fileapi', '../sdna/sdna',
  '../sdna/blentypes', '../scene/graph'
], function(util, unused1, scene, net, fileapi, sdna, blentypes, graph) {
  'use strict';
  
  var exports = _app = {};
  var Class = util.Class;
  var repeat_key_event = {
    type    : "Keyboard",
    keyCode : 0,
    repeat  : true,
    preventDefault : function() {},
    stopPropegation : function() {}
  };

  function polyfill_BJS() {
    //override intersectsTriangle
    var Vector3 = BABYLON.Vector3;

    var r_edge1 = Vector3.Zero();
    var r_edge2 = Vector3.Zero();
    var r_pvec = Vector3.Zero();
    var r_qvec = Vector3.Zero();
    var r_tvec = Vector3.Zero();

    var isect_infos = new util.cachering(function () {
      return new BABYLON.IntersectionInfo(0, 0, 0);
    }, 32);

    var isect_ret = new BABYLON.IntersectionInfo(0, 0, 0);
    /*
      on factor;
      off period;

      load_package "avector";

      p := avec(px, py, pz);
      d := avec(dx, dy, dz);

      v0 := avec(v0x, v0y, v0z);
      v1 := avec(v1x, v1y, v1z);
      v2 := avec(v2x, v2y, v2z);

      r_edge1 := v1 - v0;
      r_edge2 := v2 - v0;
      r_pvec  := d CROSS r_edge2;

      det := r_edge1 dot r_pvec;
      invdet := 1.0 / det;
      r_tvec := p - v0;

      bu := dot(r_tvec, r_pvec) * invdet;

      r_qvec := r_tvec CROSS r_edge1;
      bv := d dot r_qvec;

      distance := (r_edge2 DOT r_qvec) * invdet;
     */

    BABYLON.Ray.prototype.i23ntersectsTriangle = function (v0, v1, v2) {
      var v0x = v0.x, v0y = v0.y, v0z = v0.z;
      var v1x = v1.x, v1y = v1.y, v1z = v1.z;
      var v2x = v2.x, v2y = v2.y, v2z = v2.z;
      var px = this.origin.x, py = this.origin.y, pz = this.origin.z;
      var dx = this.direction.x, dy = this.direction.y, dz = this.direction.z;

      var det = ((v0x-v2x)*dz-(v0z-v2z)*dx)*(v0y-v1y)-((v0y-v2y)*dz-(v0z-v2z)*dy)*(v0x-v1x)-((v0x-v2x)*dy-(v0y-v2y)*dx)*(v0z-v1z);

      if (det === 0.0) {
        return null;
      }

      var invdet = 1.0 / det;

      var bu = (-(((v0x-v2x)*dz-(v0z-v2z)*dx)*(py-v0y)-((v0y-v2y)*dz-(v0z-
               v2z)*dy)*(px-v0x)-((v0x-v2x)*dy-(v0y-v2y)*dx)*(pz-v0z))) * invdet;
      if (bu < 0.0 || bu > 1.0) {
        return null;
      }

      var bv = ((px-v0x)*(v0z-v1z)-(pz-v0z)*(v0x-v1x))*dy-((py-v0y)*(v0z-v1z)-(pz-v0z)
                *(v0y-v1y))*dx-((px-v0x)*(v0y-v1y)-(py-v0y)*(v0x- v1x))*dz;

      if (bv < 0.0 || bu + bv > 1.0) {
        return null;
      }

      var distance = (-(((px-v0x)*(v0z-v1z)-(pz-v0z)*(v0x-v1x))*(v0y-v2y)-((py-
                      v0y)*(v0z-v1z)-(pz-v0z)*(v0y-v1y))*(v0x-v2x)-((px-v0x)*(v0y-
                      v1y)-(py-v0y)*(v0x-v1x))*(v0z-v2z))) * invdet;

      if (distance > this.length) {
        return null;
      }

      var ret = isect_ret; //isect_infos.next();

      ret.bu = bu;
      ret.bv = bv;
      ret.distance = distance;
      ret.faceId = 0;
      ret.subMeshId = 0;

      return ret;
    };

    BABYLON.Ray.prototype.intersectsTriangle = function (vertex0, vertex1, vertex2) {
      vertex1.subtractToRef(vertex0, r_edge1);
      vertex2.subtractToRef(vertex0, r_edge2);

      Vector3.CrossToRef(this.direction, r_edge2, r_pvec);

      var det = Vector3.Dot(r_edge1, r_pvec);

      if (det === 0) {
        return null;
      }

      var invdet = 1 / det;
      this.origin.subtractToRef(vertex0, r_tvec);

      var bu = Vector3.Dot(r_tvec, r_pvec) * invdet;
      if (bu < 0 || bu > 1.0) {
        return null;
      }

      Vector3.CrossToRef(r_tvec, r_edge1, r_qvec);
      var bv = Vector3.Dot(this.direction, r_qvec) * invdet;
      if (bv < 0 || bu + bv > 1.0) {
        return null;
      }

      //check if the distance is longer than the predefined length.
      var distance = Vector3.Dot(r_edge2, r_qvec) * invdet;
      if (distance > this.length) {
        return null;
      }

      var ret = isect_infos.next();

      ret.bu = bu;
      ret.bv = bv;
      ret.distance = distance;
      ret.faceId = 0;
      ret.subMeshId = 0;

      return ret;
    };
  }

  polyfill_BJS();

  var AppState = exports.AppState = Class([
    function constructor() {
      this.graph = new graph.Graph();
      this._repeatMap = {};
      this.keyRepeatRate = 25; //in miliseconds
    },
    
    function init() {
      var canvas = this.canvas = document.getElementById("renderCanvas");
      
      this.engine = new BABYLON.Engine(canvas, true);
      this.bjs_scene = scene.initBabylon(this.engine, this.canvas);
    },
    
    function loadFileAsync(url) {
      var this2 = this;
      
      fileapi.loadFile(url).then(function(fd) {
        this2.onFileLoad(fd);
      });
    },
    
    function onFileLoad(fd) {
      this.file = fd;

      this.graph = new graph.Graph();
      this.scene = fd.main.scenes[0];
      this.main = fd.main;
      
      this.scene.bjsInit(this.main, this.engine, this.bjs_scene);

      this.scene.initCharacters();
      this.scene.buildOctree();
      this.scene.initGraph();
    },

    function onTick() {
      this.doKeyRepeat();
    },

    function startLoop() {
      var this2 = this;
      
      //Register a render loop to repeatedly render the scene
      var last_logic = util.time_ms();

      this.engine.runRenderLoop(function () {
        if (util.time_ms() - last_logic > 35) {
          this2.onTick();
          last_logic = util.time_ms();
        }

        this2.bjs_scene.render();
      });
    },

    function doKeyRepeat() {
      var e = repeat_key_event;
      var time = util.time_ms();
      var rate = this.keyRepeatRate;

      for (var k in this._repeatMap) {
        if (time - this._repeatMap[k] > rate) {
          e.keyCode = parseInt(k);
          e.repeat = true;

          this._repeatMap[k] = util.time_ms();
          this.on_keypress(e);
        }
      }
    },

    function on_keyup(e) {
      delete this._repeatMap[e.keyCode];
    },

    function on_keydown(e) {
      if (e.repeat) { //we have our own repeater
        return;
      }

      //add to repeat map
      this._repeatMap[e.keyCode] = util.time_ms();
      this.on_keypress(e);
    },

    function on_keypress(e) {
      switch (e.keyCode) {
        case 38: //up
        case 40: //down
          var char = this.scene.characters.main;
          var sign = e.keyCode == 38 ? 1.0 : -1.0;

          char.move(this.scene, 0.0, sign*0.22);

          break;
        case 37: //left
        case 39: //right
          var char = this.scene.characters.main;
          var sign = e.keyCode == 37 ? -1 : 1;

          char.rotate(this.scene, sign*0.14);
          break;
      }
    }
  ]);
  
  var init = exports.init = function init() {
    window._appstate = new AppState();
    
    _appstate.init();
    _appstate.startLoop();
    _appstate.loadFileAsync("/gamedata");

    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
      _appstate.engine.resize();
    });

    window.addEventListener("keydown", function(e) {
      _appstate.on_keydown(e);
    });

    window.addEventListener("keyup", function(e) {
      _appstate.on_keyup(e);
    });
  }
  
  return exports;
});
