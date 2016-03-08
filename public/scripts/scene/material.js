var _material = undefined;

define([
  '../util/util', '../sdna/sdna', '../util/vectormath', '../util/math',
  './gpu_constants'
], function(util, sdna, vectormath, math, unused1) {
  'use strict';
  
  var exports = _material = {};
  var Class = util.Class;
  var set = util.set;
  
  var Vector2 = vectormath.Vector2;
  var Vector3 = vectormath.Vector3;
  var Vector4 = vectormath.Vector4;
  var Quat = vectormath.Quat;
  var Matrix4 = vectormath.Matrix4;
  
  var TEX_IMAGE = 8;

  /* blendtype */
  var MTEX_BLENDTYPE = exports.MTEX_BLENDTYPE = {
     MTEX_BLEND      : 0,
     MTEX_MUL        : 1,
     MTEX_ADD        : 2,
     MTEX_SUB        : 3,
     MTEX_DIV        : 4,
     MTEX_DARK       : 5,
     MTEX_DIFF       : 6,
     MTEX_LIGHT      : 7,
     MTEX_SCREEN     : 8,
     MTEX_OVERLAY    : 9,
     MTEX_BLEND_HUE  : 10,
     MTEX_BLEND_SAT  : 11,
     MTEX_BLEND_VAL  : 12,
     MTEX_BLEND_COLOR: 13,
     MTEX_SOFT_LIGHT : 15,
     MTEX_LIN_LIGHT  : 16
  };
  
  var Material = exports.Material = Class("Material", sdna.bases.Material, [
    function constructor() {
      sdna.bases.Material.apply(this, arguments);
      this._bjs_ready = false;
    },
    
    Class.getter(function name() {
      return this.id.name;
    }),
    
    function bjsInit(engine, scene) {
      //for now, try to convert material parameters directly
      var mat = new BABYLON.StandardMaterial(this.id.name, scene);
      mat.diffuseColor = new BABYLON.Color3(this.r, this.g, this.b);
      mat.specularColor = new BABYLON.Color3(this.specr, this.specg, this.specb);
      
      for (var i=0; i<this.mtex.length; i++) {
        var mtex = this.mtex[i], tex = mtex.tex;
        
        //uvname
        if (mtex.uvname != "") {
          //XXX implement me
        }

        if (tex == undefined) {
          console.log("eek!", mtex);
          continue;
        }

        if (tex.type == 8 && tex.ima != undefined) {
          var image = tex.ima;
          var path = image.name;
          
          path = path.replace(/\\/g, "/");
          if (path[0] == "/" && path[1] == "/") {
            path = path.slice(1, path.length);
          }
          
          var texture = new BABYLON.Texture(path, scene);
          
          if (mtex.difffac > 0.0) {
            mat.diffuseTexture = texture;
            if (mtex.blendtype != MTEX_BLENDTYPE.MTEX_MUL) {
              mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
            }
          }
          if (mtex.specfac > 0.0)
            mat.specularTexture = texture;
        }
      }
      
      this._bjs_material = mat;
    },
    
    function bjsInit_glsl(engine, scene) {
      if (this.id.properties == undefined) {
        console.log("WARNING: material without shader!", this.id.name);
        return;
      }
      
      function killfunc(shader, functype, funcname) {
        var lines = shader.split("\n");
        var buf = ""
        
        for (var i=0; i<lines.length; i++) {
          var l = lines[i];
          
          if (l.search(funcname) >= 0 && (l.search("{") >= 0 || lines[i+1].search("{") >= 0))
          {
            i += l.search("{") >= 0 ? 1 : 2;
            
            var bracket = 1;
            while (i < lines.length && bracket > 0) {
              bracket += lines[i].count("{");
              bracket -= lines[i].count("}");
              i++;
            }
            
            continue;
          }
          
          buf += l + "\n";
        }
        
        return buf;
      }
      
      function prependMain(shader, code) {
        var i = shader.search("void main");
        var i2 = i + "void main".length + shader.slice(i+"void main".length, shader.length).search("{");
        if (i2 < 0 || i < 0) throw new Error("Missing main in fragment shader");
        
        shader = shader.slice(0, i2+1) + code + "\n" + shader.slice(i2+1, shader.length);
        return shader;
      }
      
      function convert(shader) {
        shader = shader.replace(/gl_ModelViewMatrix/g, "worldViewProjection");
        shader = shader.replace(/gl_ViewMatrix/g, "view");  
        shader = shader.replace(/gl_ProjectionMatrix/g, "projection");  
        shader = shader.replace(/gl_NormalMatrix/g, "normalMatrix");  
        
        //get rid of any variable name conflicts with bjs attribute names
        shader = shader.replace(/\bposition\b/g, "position_var");
        shader = shader.replace(/\bnormal\b/g, "normal_var");
        shader = shader.replace(/\bcolor\b/g, "color_var");
        
        shader = shader.replace(/gl_Vertex/g, "position");  
        shader = shader.replace(/gl_Normal/g, "normal");  
        shader = shader.replace(/gl_Color/g, "color");  
        
        shader = shader.replace(/gl_ClipVertex/g, "//gl_ClipVertex");
        shader = shader.replace(/gl_LightSource/g, "LightSource");
        
        shader = killfunc(shader, "void", "test_shadowbuf");
        shader = killfunc(shader, "void", "shadows_only");
        shader = killfunc(shader, "void", "shadows_only_vsm");
        
        return shader;
      }
      
      var shader = this.id.properties.gamesettings;
      console.log(shader.uniforms)
      
      var uniforms = JSON.parse(shader.uniforms);
      
      var uniforms_add = [
        "uniform mat4 worldViewProjection;",
        "uniform mat4 worldViewProjectionInverse;",
        "uniform mat4 view;",
        "uniform mat4 projection;",
        "uniform mat4 projectionInverse;",
        "uniform mat4 world;",
        "uniform mat3 normalMatrix;",
      ].join("\n");

      
      var fshader = convert(shader.fragment_shader);

      fshader = prependMain(fshader, [
        "\n#ifdef LIGHT0",
        "  LightSource[0].diffuse = Light0Diffuse;",
        "#endif\n"
      ].join("\n"))
      
      fshader = [
        "#extension GL_OES_standard_derivatives : enable",
        "precision highp float;",
        
        "#define LIGHT0",
        "#ifdef LIGHT0",
        "uniform vec4 Light0Diffuse;",
        "#endif",
        
        "struct glLightSource {",
        "  vec4 position_var;",
        "  vec4 diffuse;",
        "  vec4 specular;",
        "  vec4 halfVector;",
        "};",
        
        "glLightSource LightSource[4];",
        
        //"varying vec4 varposition;",
        //"varying vec3 varnormal;",

        uniforms_add,
        fshader
      ].join("\n");
      
      var vshader = convert(shader.vertex_shader);
      vshader = [
        "precision highp float;",
        
        "attribute vec4 position;",
        "attribute vec3 normal;",
        
        uniforms_add,
        vshader
      ].join("\n");
      
      //argh! why the DOM?! kill the BJS developers!
      var fnode = document.createElement("script");
      fnode.type = "application/fragmentShader";
      fnode.text = fshader;
      fnode.id = "material_fshader_" + this.id.name;
      document.head.appendChild(fnode);
      
      //evil!!! evil I say!!!
      var vnode = document.createElement("script");
      vnode.type = "application/vertexShader";
      vnode.text = vshader;
      vnode.id = "material_vshader_" + this.id.name;
      document.head.appendChild(vnode);
      
      console.log("init material");
      var ulist = ["worldViewProjection", "view", "world", "projection", 
                   "worldView", "normalMatrix", "worldViewProjectionInverse",
                   "projectionInverse", "Light0Diffuse"];
                   
      for (var i=0; i<uniforms.length; i++) {
        ulist.push(uniforms[i].varname);
      }
      
      var material = new BABYLON.ShaderMaterial(this.id.name, scene, {
        vertexElement   : vnode.id,
        fragmentElement : fnode.id
      }, {
        attributes : ["position"],
        uniforms   : ulist
      });
      
      this._bjs_material = material;
    }
  ]);
  
  sdna.types.register(Material);
  
  return exports;
});
