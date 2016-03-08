import imp

from . import utils

__all__ = [
  "utils",
  "scene",
  "export",
  "node_types",
  "node_utils",
  "node_graph",
  "node_categories",
  "ops",
  "types",
  "material",
  "armature_bake"
]

from . import types, scene, export, node_types, node_utils, node_graph, ops, material
from . import armature_bake, node_categories

types.bpy_classes.unregister()
node_types.bpy_classes.unregister()
node_utils.bpy_classes.unregister()
node_graph.bpy_classes.unregister()
node_categories.bpy_classes.unregister()
ops.bpy_classes.unregister()
material.bpy_classes.unregister();
armature_bake.bpy_classes.unregister();

imp.reload(utils);
imp.reload(types)
imp.reload(material)

imp.reload(armature_bake)
imp.reload(scene);
imp.reload(export);
imp.reload(node_utils);
imp.reload(node_types);
imp.reload(node_categories);
imp.reload(node_graph);
imp.reload(ops);

bpy_classes = utils.Registrar([
  types.bpy_classes,
  node_utils.bpy_classes,
  node_types.bpy_classes,
  node_graph.bpy_classes,
  node_categories.bpy_classes,
  ops.bpy_classes,
  armature_bake.bpy_classes
]);

def register():
  bpy_classes.register()
  
def unregister():
  bpy_classes.unregister()
  