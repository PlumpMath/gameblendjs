import bpy

from . import utils

class GameMaterialSettings(bpy.types.PropertyGroup):
    vertex_shader = bpy.props.StringProperty()
    fragment_shader = bpy.props.StringProperty()
    uniforms = bpy.props.StringProperty()
    attributes = bpy.props.StringProperty()
    
class BakedMatrix(bpy.types.PropertyGroup):
  matrix = bpy.props.FloatVectorProperty(name="matrix", size=16)
  frame = bpy.props.FloatProperty(name="frame")
 
class BakedAction(bpy.types.PropertyGroup):
  data = bpy.props.CollectionProperty(name="data", type=BakedMatrix)
  name = bpy.props.StringProperty(name="name")
  start = bpy.props.FloatProperty(name="start");
  end = bpy.props.FloatProperty(name="end");
  
class BakedActions(bpy.types.PropertyGroup):
  actions = bpy.props.CollectionProperty(name="actions", type=BakedAction)


def register():
  bpy.utils.register_class(GameMaterialSettings)
  bpy.utils.register_class(BakedMatrix)
  bpy.utils.register_class(BakedAction)
  bpy.utils.register_class(BakedActions)

  bpy.types.Material.gamesettings = \
      bpy.props.PointerProperty(type=GameMaterialSettings)
  
  bpy.types.PoseBone.baked_actions = \
     bpy.props.PointerProperty(type=BakedActions)

def unregister():
  bpy.utils.unregister_class(GameMaterialSettings)
  bpy.utils.unregister_class(BakedMatrix)
  bpy.utils.unregister_class(BakedAction)
  bpy.utils.unregister_class(BakedActions)
  
bpy_classes = utils.Registrar([
  utils.CustomRegister(register, unregister)
])
