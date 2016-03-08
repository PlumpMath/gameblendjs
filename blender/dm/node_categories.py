from . import utils
import bpy
from bpy.types import NodeTree, Node, NodeSocket

from .node_graph import nodes

### Node Categories ###
# Node categories are a python system for automatically
# extending the Add menu, toolbar panels and search operator.
# For more examples see release/scripts/startup/nodeitems_builtins.py

import nodeitems_utils
from nodeitems_utils import NodeCategory, NodeItem

# our own base class with an appropriate poll function,
# so the categories only show up in our own tree type
class MyNodeCategory(NodeCategory):
    @classmethod
    def poll(cls, context):
        print("NODE TYPE", context.space_data.tree_type)
        return context.space_data.tree_type == 'GameGraphType'

node_categories = [];
cmap = {}

for node in nodes:
  c = node._category
  
  if c not in cmap:
    cmap[c] = []
    node_categories.append(MyNodeCategory(c.upper(), c, items=cmap[c]))
  cmap[c].append(NodeItem(node.bl_idname))
  
# all categories in a list
"""
node_categories2 = [
    # identifier, label, items list
    MyNodeCategory("SOMENODES", "Some Nodes", items=[
        # our basic node
        NodeItem("CustomNodeType"),
        ]),
    MyNodeCategory("OTHERNODES", "Other Nodes", items=[
        # the node item can have additional settings,
        # which are applied to new nodes
        # NB: settings values are stored as string expressions,
        # for this reason they should be converted to strings using repr()
        NodeItem("CustomNodeType", label="Node A", settings={
            "myStringProperty": repr("Lorem ipsum dolor sit amet"),
            "myFloatProperty": repr(1.0),
            }),
        NodeItem("CustomNodeType", label="Node B", settings={
            "myStringProperty": repr("consectetur adipisicing elit"),
            "myFloatProperty": repr(2.0),
            }),
        ]),
    ]
#"""

def register():
  nodeitems_utils.register_node_categories("GameGraphType", node_categories)
    
def unregister():
  nodeitems_utils.unregister_node_categories("GameGraphType")
  
bpy_classes = utils.Registrar([
  utils.CustomRegister(register, unregister)
])
