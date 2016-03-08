var _pose = undefined;

define([
  '../util/util', '../sdna/sdna', '../util/vectormath', '../util/math', '../libs/babylon'
], function(util, sdna, vectormath, math, unused) {
  'use strict';
  
  //XXX
  BABYLON.Matrix.prototype.rotate = function(a, b, c) {
    a = a == undefined ? 0 : a;
    b = b == undefined ? 0 : b;
    c = c == undefined ? 0 : c;

    var tmp = BABYLON.Matrix.RotationYawPitchRoll(a, b, c);
    tmp = this.multiply(tmp);
    this.copyFrom(tmp);

    return this;
  }
  var exports = _pose = {};

  /* bone->flag */
  var BoneFlags = exports.BoneFlags = {
    BONE_SELECTED : (1 << 0),
      BONE_ROOTSEL : (1 << 1),
      BONE_TIPSEL : (1 << 2),
      BONE_TRANSFORM : (1 << 3), /* Used instead of BONE_SELECTED during transform (clear before use) */
      BONE_CONNECTED : (1 << 4), /* when bone has a parent, connect head of bone to parent's tail*/
      /* 32 used to be quatrot, was always set in files, do not reuse unless you clear it always */
      BONE_HIDDEN_P : (1 << 6), /* hidden Bones when drawing PoseChannels */
      BONE_DONE : (1 << 7), /* For detecting cyclic dependencies */
      BONE_DRAW_ACTIVE : (1 << 8), /* active is on mouse clicks only - deprecated, ONLY USE FOR DRAWING */
      BONE_HINGE : (1 << 9), /* No parent rotation or scale */
      BONE_HIDDEN_A : (1 << 10), /* hidden Bones when drawing Armature Editmode */
      BONE_MULT_VG_ENV : (1 << 11), /* multiplies vgroup with envelope */
      BONE_NO_DEFORM : (1 << 12), /* bone doesn't deform geometry */
      BONE_UNKEYED : (1 << 13), /* set to prevent destruction of its unkeyframed pose (after transform) */
      BONE_HINGE_CHILD_TRANSFORM  : (1 << 14), /* set to prevent hinge child bones from influencing the transform center */
      BONE_NO_SCALE : (1 << 15), /* No parent scale */
      BONE_HIDDEN_PG : (1 << 16), /* hidden bone when drawing PoseChannels (for ghost drawing) */
      BONE_DRAWWIRE : (1 << 17), /* bone should be drawn as OB_WIRE, regardless of draw-types of view+armature */
      BONE_NO_CYCLICOFFSET : (1 << 18), /* when no parent, bone will not get cyclic offset */
      BONE_EDITMODE_LOCKED : (1 << 19), /* bone transforms are locked in EditMode */
      BONE_TRANSFORM_CHILD : (1 << 20), /* Indicates that a parent is also being transformed */
      BONE_UNSELECTABLE : (1 << 21), /* bone cannot be selected */
      BONE_NO_LOCAL_LOCATION : (1 << 22), /* bone location is in armature space */
      BONE_RELATIVE_PARENTING : (1 << 23)
    /* object child will use relative transform (like deform) */
  };
  
  var SystemMatrix = exports.SystemMatrix = BABYLON.Matrix.RotationYawPitchRoll(0.0, -Math.PI*0.5, 0.0);
  //var quat =  new BABYLON.Quaternion();
  //var scalemat = BABYLON.Matrix.Compose(new BABYLON.Vector3(1.0, 1.0, -1.0), quat, new BABYLON.Vector3(0,0,0));
  var scalemat = BABYLON.Matrix.Identity();

  //scalemat.m[0] = -1.0;
  //scalemat.m[5] = -1.0;
  scalemat.m[10] = -1.0;

  //SystemMatrix = scalemat.multiply(SystemMatrix);
  SystemMatrix = SystemMatrix.multiply(scalemat);

  //XXX
  //SystemMatrix = BABYLON.Matrix.Identity();

  exports.SystemMatrix = SystemMatrix;

  var Class = util.Class;
  var set = util.set;
  
  var Vector2 = vectormath.Vector2;
  var Vector3 = vectormath.Vector3;
  var Vector4 = vectormath.Vector4;
  var Quat = vectormath.Quat;
  var Matrix4 = vectormath.Matrix4;

  var bPoseChannel = exports.bPoseChannel = Class("bPoseChannel", sdna.bases.bPoseChannel, [
    function constructor() {
      sdna.bases.bPoseChannel.apply(this, arguments);
    }
  ]);
  sdna.types.register(bPoseChannel);

  exports._armature_idgen = 1;

  var bPose = exports.bPose = Class("bPose", sdna.bases.bPose, [
    function constructor() {
      sdna.bases.bPose.apply(this, arguments);

      this._bone_namemap = undefined;
      this._bjs_namemap = undefined;
      this._did_bjs_init = false;
    },

    function bind(ob, engine, scene) {
      if (!(this._bjs_skeleton)) {
        this.bjsInit(engine, scene);
      }

      if (ob.data instanceof sdna.bases.Mesh) {
        console.log("bind skeleton");

        ob.data._bjs_mesh.skeleton = this._bjs_skeleton;
        for (var submesh of ob.data._bjs_mesh.subMeshes) {
          submesh.skeleton = this._bjs_skeleton;
        }

        //ob._bjs_mesh.skeleton = this._bjs_skeleton.clone("cloned"+this.object.name+"skeleton"+(exports._armature_idgen++));
      }
    },

    function loadFrame(frame, action) {
      action = this.actions[action];
      if (action == undefined)
        return;

      //console.log("load frame!");
      frame = action[frame];

      var pbones = this.bones;
      var bjsbones = this.bjsbones;

      var rotmat = SystemMatrix;

      for (var k in frame) {
        var mat = frame[k];
        var pbone = pbones[k], bbone = bjsbones[k];

        if (bbone == undefined)
          continue;

        mat = mat.multiply(rotmat);

        //console.log("  load " + k + " !"); //, pbone, bbone, mat);

        var m1 = bbone._matrix.m;
        var m2 = mat.m;

        /*
        for (var i=1; i<3; i++) {
          var i2 = i == 1 ? 2 : 1;

          for (var j=0; j<4; j++) {
            var j2 = j == 1 ? 2 : (j == 2 ? 1 : j);

            m1[i*4+j] = m2[i2*4+j2];

            if (i2 == 2) {
              m1[i*4+j] = -m1[i*4+j];
            }
          }
        }//*/

        //m1[12] = m2[12];
        //m1[13] = m2[14];
        //m1[14] = m2[13];

        bbone._matrix.copyFrom(mat);

        //for (var i=13; i<16; i++) {
        //  bbone._matrix.m[i] = mat.m[i];
        //}

        bbone.markAsDirty();
      }

      this._bjs_skeleton._markAsDirty();
      this._bjs_skeleton.prepare();
    },

    function bjsInit(engine, scene) {
      this._bjs_namemap = {};

      if (this._did_bjs_init) {
        console.trace("Warning: double call to bPose.bjsInit()!", this);
        return;
      }

      this._did_bjs_init = true;

      console.log("Init pose");
      var skeleton = new BABYLON.Skeleton(this.object.id.name, ""+(exports._armature_idgen++), scene);

      var idmap = {}
      var i = 0;
      for (var k in this.bones) {
        var pbone = this.bones[k];
        var bone = pbone.bone;

        if (bone.flag & BoneFlags.BONE_NO_DEFORM) {
          continue;
        }

        idmap[i] = k;
        idmap[k] = i;

        i++;
      }

      var rotmat = SystemMatrix;

      for (var k in this.bones) {
        var pbone = this.bones[k];
        var bone = pbone.bone;

        if (bone.flag & BoneFlags.BONE_NO_DEFORM) {
          continue;
        }

        var mat = [];
        for (var i=0; i<4; i++) {
          for (var j=0; j<4; j++) {
            //mat.push(pbone.pose_mat[i][j]);
            mat.push(bone.arm_mat[i][j]);
          }
        }

        if (k in this.actions.WalkCycle2.restmats) {
          mat = this.actions.WalkCycle2.restmats[k];
        } else {
          continue;
        }

        var restmat = BABYLON.Matrix.FromArray(mat);
        restmat = restmat.multiply(rotmat);

        //restmat = BABYLON.Matrix.Invert(restmat);

        bone = new BABYLON.Bone(pbone.name, skeleton, undefined, restmat);
        this._bjs_namemap[pbone.name] = bone;
      }

      this._bjs_skeleton = skeleton;
      skeleton.prepare();

      for (var bone of skeleton.bones) {
        this._bjs_namemap[bone.name] = bone;
      }

      /*
      var frame = 1, this2 = this;

      var timer = window.setInterval(function() {
        this2.loadFrame(frame++, 'WalkCycle2');
        if (frame == 25) {
          frame = 1;
        }
      }, ~~(1000/24));
      //*/
    },

    Class.getter(function bjsbones() {
      return this._bjs_namemap;
    }),

    Class.getter(function bones() {
      if (this._bone_namemap != undefined) {
        return this._bone_namemap;
      }
      
      this._bone_namemap = {};

      for (var pbone of this.chanbase) {
        this._bone_namemap[pbone.name] = pbone;
      }
      
      return this._bone_namemap;
    }),
    
    Class.getter(function name() {
      return this.id.name;
    })
  ]);
  
  sdna.types.register(bPose);
  
  return exports;
});
