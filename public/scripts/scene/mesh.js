var _mesh = undefined;

define([
  '../util/util', '../sdna/sdna', '../util/vectormath', '../util/math', './pose'
], function(util, sdna, vectormath, math, pose) {
  'use strict';
  
  var exports = _mesh = {};
  var Class = util.Class;
  var set = util.set;
  
  var Vector2 = vectormath.Vector2;
  var Vector3 = vectormath.Vector3;
  var Vector4 = vectormath.Vector4;
  var Quat = vectormath.Quat;
  var Matrix4 = vectormath.Matrix4;
  
      /* CustomData.type */
  var CustomDataTypes = exports.CustomDataTypes = {
    CD_MVERT            : 0,
    CD_MDEFORMVERT      : 2,
    CD_MEDGE            : 3,
    CD_MFACE            : 4,
    CD_MTFACE           : 5,
    CD_MCOL             : 6,
    CD_ORIGINDEX        : 7,
    CD_NORMAL           : 8,
  /*	CD_POLYINDEX        : 9, */
    CD_PROP_FLT         : 10,
    CD_PROP_INT         : 11,
    CD_PROP_STR         : 12,
    CD_ORIGSPACE        : 13,  /* for modifier stack face location mapping */
    CD_ORCO             : 14,
    CD_MTEXPOLY         : 15,
    CD_MLOOPUV          : 16,
    CD_MLOOPCOL         : 17,
    CD_TANGENT          : 18,
    CD_MDISPS           : 19,
    CD_PREVIEW_MCOL     : 20,  /* for displaying weightpaint colors */
  /*	CD_ID_MCOL          : 21, */
    CD_TEXTURE_MLOOPCOL : 22,
    CD_CLOTH_ORCO       : 23,
    CD_RECAST           : 24,

  /* BMESH ONLY START */
    CD_MPOLY            : 25,
    CD_MLOOP            : 26,
    CD_SHAPE_KEYINDEX   : 27,
    CD_SHAPEKEY         : 28,
    CD_BWEIGHT          : 29,
    CD_CREASE           : 30,
    CD_ORIGSPACE_MLOOP  : 31,
    CD_PREVIEW_MLOOPCOL : 32,
    CD_BM_ELEM_PYPTR    : 33,
  /* BMESH ONLY END */

    CD_PAINT_MASK       : 34,
    CD_GRID_PAINT_MASK  : 35,
    CD_MVERT_SKIN       : 36,
    CD_FREESTYLE_EDGE   : 37,
    CD_FREESTYLE_FACE   : 38,
    CD_MLOOPTANGENT     : 39,
    CD_TESSLOOPNORMAL   : 40,
    CD_CUSTOMLOOPNORMAL : 41,

    CD_NUMTYPES         : 42
  };

  var Mesh = exports.Mesh = Class("Mesh", sdna.bases.Mesh, [
    function constructor() {
      sdna.bases.Mesh.apply(this, arguments);
      this._bjs_ready = false;
    },
    
    Class.getter(function name() {
      return this.id.name;
    }),
    
    function bjsInit(engine, scene, armatureob, ownerob) {
      var mesh = new BABYLON.Mesh(this.id.name, scene);

      var boneidmap = this._boneidmap = {};
      var boneflagmap = {};

      if (armatureob != undefined) {
        console.log("armature vgroup mapping for ", this.name);

        //build mapping from internal vgroup ids to pose channels
        var i = 0;
        var keys = Object.keys(armatureob.pose.bjsbones);

        for (var k in armatureob.data.bones) {
          var bone = armatureob.data.bones[k];

          boneflagmap[bone.name] = bone.flag;
        }

        for (var df of ownerob.defbase) {
          var i2 = keys.indexOf(df.name);

          if (i2 == undefined) {
            console.log("Warning, orphaned vgroup " + df.name, df);
            continue;
          }

          boneflagmap[i] = boneflagmap[df.name];
          boneidmap[i] = i2;
          i++;
        }
      } else {
        console.trace("straight vgroup mapping for ", this.name);

        var i = 0;
        for (var df of ownerob.defbase) {
          boneidmap[i] = i;
          boneflagmap[i] = 0;
          i++;
        }
      }

      mesh.isVisible = 0;
      
      var mats = new Array(this.totcol);
      for (var i=0; i<mats.length; i++) {
        mats[i] = {
          vcos     : [],
          vnos     : [],
          vidx     : [],
          uvlayers : [],
          tris     : [],
          bonews   : [], //bone weights
          boneis   : []  //bone indices
        }
      }
      
      var vcos = [];
      var vnos = [];
      var bonews = [];
      var boneis = [];

      var vidx = [];
      var uvlayers = [];
      
      if (this.pdata.layers instanceof sdna.bases.CustomDataLayer) {
        this.pdata.layers = [this.pdata.layers];
      }
      if (this.ldata.layers instanceof sdna.bases.CustomDataLayer) {
        this.ldata.layers = [this.ldata.layers];
      }
      
      for (var i=0; i<this.pdata.layers.length; i++) {
        var l = this.pdata.layers[i];
        if (l.type == CustomDataTypes.CD_MTEXPOLY) {
          for (var j=0; j<mats.length; j++) {
            mats[j].uvlayers.push([]);
          }
          uvlayers.push([]);
        }
      }
      
      var tris = [];
      
      for (var i=0; i<this.mpoly.length; i++) {
        var mp = this.mpoly[i];
        var j = mp.loopstart;
        var loops = [];
        
        var tris = mats[mp.mat_nr].tris;
        
        for (; j<mp.loopstart+mp.totloop; j++) {
          loops.push(j);
        }
        
        //triangle fan
        var vi = 0;
        
        for (var j=1; j<loops.length-1; j++) {
          var a = loops[0], b = loops[j], c = loops[(j+1) % loops.length];
          tris.push(a);
          tris.push(b);
          tris.push(c);
        }
      }

      var lw = [0, 0, 0, 0];
      var bi = [0, 0, 0, 0];

      for (var si=0; si<mats.length; si++) {
        var tris = mats[si].tris;
        mats[si].vstart = vcos.length/3;
        
        for (var i=0; i<tris.length; i += 3) {
          for (var j=0; j<3; j++) {
            var l = this.mloop[tris[i+j]];
            var mv = this.mvert[l.v];
            
            vcos.push(mv.co[0]);
            vcos.push(mv.co[2]);
            vcos.push(mv.co[1]);

            //find deformvert data
            var dv = this.dvert[l.v];
            //find four largest weights

            lw[0] = lw[1] = lw[2] = lw[3] = -1e17;
            bi[0] = bi[1] = bi[2] = bi[3] = -1;

            for (var k=0; dv != undefined && k<dv.totweight; k++) {
              var dvw = dv.totweight == 1 ? dv.dw : dv.dw[k];

              if (dvw == undefined) {
                if (Math.random() > 0.99) {
                  console.log("Error! missing dvert data!", dv, k);
                }

                continue;
              }

              var dw = dvw.weight, di = boneidmap[dvw.def_nr];
              var bflag = boneflagmap[dvw.def_nr];

              if (bflag & pose.BoneFlags.BONE_NO_DEFORM) {
                continue;
              }

              if (di == undefined) {
                console.log("missing vgroup", dw.def_nr, dw.weight, dw);
                continue;
              }

              if (dw > l[0]) {
                lw[3] = lw[2], lw[2] = lw[1], lw[1] = lw[0], lw[0] = dw;
                bi[3] = bi[2], bi[2] = bi[1], bi[1] = bi[0], bi[0] = di;
              } else if (dw > lw[1]) {
                lw[3] = lw[2], lw[2] = lw[1], lw[1] = dw;
                bi[3] = bi[2], bi[2] = bi[1], bi[1] = di;
              } else if (dw > lw[2]) {
                lw[3] = lw[2], lw[2] = dw;
                bi[3] = bi[2], bi[2] = di;
              } else {
                lw[3] = dw;
                bi[3] = di;
              }
            }
            
            for (var k=0; k<4; k++) {
              bonews.push(lw[k] < 0.0 ? 0.0 : lw[k]);
              boneis.push(bi[k]);
            }

            var uvk=0;
            for (var k=0; k<this.ldata.layers.length; k++) {
              var lay = this.ldata.layers[k];
              
              if (lay.type != CustomDataTypes.CD_MLOOPUV) {
                continue;
              }
              
              var luv = lay.data[tris[i+j]];
              uvlayers[uvk].push(luv.uv[0]);
              uvlayers[uvk].push(luv.uv[1]);
              
              uvk++;
            }
            vnos.push(mv.no[0]);
            vnos.push(mv.no[2]);
            vnos.push(mv.no[1]);
            vidx.push(vi);
            vi++;
          }
        }
        
        mats[si].vend = vcos.length/3;
      }
      
      var vertexData = new BABYLON.VertexData();
      
      vertexData.positions = vcos;
      vertexData.normals = vnos;
      vertexData.indices = vidx;
      vertexData.matricesIndices = boneis;
      vertexData.matricesWeights = bonews;

      if (uvlayers.length > 0)
        vertexData.uvs = uvlayers[0];
      if (uvlayers.length > 1)
        vertexData.uvs2 = uvlayers[1];
      //if (uvlayers.length > 2) //bjs doesn't support more than 2 uv layers?
      //  vertexData.uvs3 = uvlayers[2];

      vertexData.set(vcos, "positions");
      vertexData.set(vnos, "normals");
      vertexData.set(vidx, "indices");
      
      vertexData.applyToMesh(mesh);
      
      if (mesh.subMeshes == undefined)
        mesh.subMeshes = [];
      
      var material = new BABYLON.MultiMaterial(this.id.name+"__mat", scene);
      
      for (var i=0; i<mats.length; i++) {
        if (this.mat[i] != undefined)
          material.subMaterials.push(this.mat[i]._bjs_material);
        else
          material.subMaterials.push(new BABYLON.StandardMaterial("bleh", scene));
        
        var m = mats[i];
        var start = m.vstart, count = m.vend-m.vstart;
        mesh.subMeshes.push(new BABYLON.SubMesh(i, start, count, start, count, mesh));
      }
      
      mesh.material = material;
      this._bjs_mesh = mesh;
      this._bjs_ready = true;

      if (armatureob != undefined) {
        if (armatureob.pose._bjs_skeleton == undefined) {
          armatureob.pose.object = armatureob;
          armatureob.pose.bjsInit(engine, scene);
        }

        this.armature = armatureob;

        console.log("Bind pose!",  armatureob.pose._bjs_skeleton);

        this._bjs_mesh.skeleton = armatureob.pose._bjs_skeleton;

        for (var i=0; i<this._bjs_mesh.subMeshes.length; i++) {
          this._bjs_mesh.subMeshes[i].skeleton = armatureob.pose._bjs_skeleton;
        }
      }

      this._bjs_mesh.createOrUpdateSubmeshesOctree();
    }
  ]);
  
  sdna.types.register(Mesh);
  
  return exports;
});
