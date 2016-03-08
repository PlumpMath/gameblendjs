from . import utils

import bpy
from bpy.types import NodeTree, Node, NodeSocket

# Implementation of custom nodes from Python

# Derived from the NodeTree base type, similar to Menu, Operator, Panel, etc.
class GameGraph(NodeTree):
    # Description string
    '''A custom node tree type that will show up in the node editor header'''
    # Optional identifier string. If not explicitly defined, the python class name is used.
    bl_idname = 'GameGraphType'
    
    # Label for nice name display
    bl_label = 'Game Graph'
    
    # Icon identifier
    bl_icon = 'NODETREE'

# Custom socket types
class ReadySocket(NodeSocket):
    def __new__(self):
      self.link_limit = 500
      print("set link limit!")
      
    # Description string
    '''Custom node socket type'''
    # Optional identifier string. If not explicitly defined, the python class name is used.
    bl_idname = 'ReadySocket'
    
    # Label for nice name display
    bl_label = 'Then Socket'
    link_limit = 500;
    
    # Optional function for drawing the socket input value
    def draw(self, context, layout, node, text):
        if self.is_output or self.is_linked:
            layout.label(text)
        else:
            layout.label(text)
            pass#layout.prop(self, "myEnumProperty", text=text)

    # Socket color
    def draw_color(self, context, node):
        return (1.0, 0.4, 0.216, 0.5)


# Mix-in class for all custom nodes in this tree type.
# Defines a poll function to enable instantiation.
class GameGraphNode:
    @classmethod
    def poll(cls, ntree):
        print("type", ntree.bl_idname)
        return ntree.bl_idname == 'GameGraphType'

# Derived from the Node base type.
class MyCustomNode(Node, GameGraphNode):
    # === Basics ===
    # Description string
    '''A custom node'''
    # Optional identifier string. If not explicitly defined, the python class name is used.
    bl_idname = 'CustomNodeType'
    # Label for nice name display
    bl_label = 'Custom Node'
    # Icon identifier
    bl_icon = 'SOUND'

    # === Custom Properties ===
    # These work just like custom properties in ID data blocks
    # Extensive information can be found under
    # http://wiki.blender.org/index.php/Doc:2.6/Manual/Extensions/Python/Properties
    myStringProperty = bpy.props.StringProperty()
    myFloatProperty = bpy.props.FloatProperty(default=3.1415926)

    # === Optional Functions ===
    # Initialization function, called when a new node is created.
    # This is the most common place to create the sockets for a node, as shown below.
    # NOTE: this is not the same as the standard __init__ function in Python, which is
    #       a purely internal Python method and unknown to the node system!
    def init(self, context):
        self.inputs.new('CustomSocketType', "Hello")
        self.inputs.new('NodeSocketFloat', "World")
        self.inputs.new('NodeSocketVector', "!")

        self.outputs.new('NodeSocketColor', "How")
        self.outputs.new('NodeSocketColor', "are")
        self.outputs.new('NodeSocketFloat', "you")

    # Copy function to initialize a copied node from an existing one.
    def copy(self, node):
        print("Copying from node ", node)

    # Free function to clean up on removal.
    def free(self):
        print("Removing node ", self, ", Goodbye!")

    # Additional buttons displayed on the node.
    def draw_buttons(self, context, layout):
        layout.label("Node settings")
        layout.prop(self, "myFloatProperty")

    # Detail buttons in the sidebar.
    # If this function is not defined, the draw_buttons function is used instead
    def draw_buttons_ext(self, context, layout):
        layout.prop(self, "myFloatProperty")
        # myStringProperty button will only be visible in the sidebar
        layout.prop(self, "myStringProperty")

    # Optional: custom label
    # Explicit user label overrides this, but here we can define a label dynamically
    def draw_label(self):
        return "I am a custom node"

def register():
    bpy.utils.register_class(MyCustomTree)
    bpy.utils.register_class(MyCustomSocket)
    bpy.utils.register_class(MyCustomNode)

    nodeitems_utils.register_node_categories("CUSTOM_NODES", node_categories)


def unregister():
    nodeitems_utils.unregister_node_categories("CUSTOM_NODES")

    bpy.utils.unregister_class(MyCustomTree)
    bpy.utils.unregister_class(MyCustomSocket)
    bpy.utils.unregister_class(MyCustomNode)

bpy_classes = utils.Registrar([
  GameGraph,
  ReadySocket
])
