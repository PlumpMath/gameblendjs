import bpy, gpu, json

from . import utils

def embed_shaders(scene):
  for mat in bpy.data.materials:
    shader = gpu.export_shader(scene, mat);
    
    mat.gamesettings.fragment_shader = shader["fragment"]
    mat.gamesettings.vertex_shader = shader["vertex"]
    
    attributes = shader["attributes"]
    uniforms = [];
    
    for u in shader["uniforms"]:
      u2 = {};
      uniforms.append(u2)
      
      for k2 in u:
        u2[k2] = u[k2]
      
      if "lamp" in u2 and u2["lamp"] is not None:
        u2["lamp"] = u2["lamp"].name
      if "image" in u2 and u2["image"] is not None:
        u2["image"] = u2["image"].name
      
    mat.gamesettings.uniforms = json.dumps(uniforms)
    mat.gamesettings.attributes = json.dumps(attributes)
    
    
bpy_classes = utils.Registrar([
])
