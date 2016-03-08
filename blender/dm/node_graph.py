from . import utils
from .node_types import GameGraphNode
from bpy.types import NodeTree, Node, NodeSocket
from bpy.props import *

nodes = []

def make_node(name, title, category="Logic", inputs={}, outputs={}, props={}, description=""):
  propstr = ""
  uistr = ""
  copystr = ""
  socketstr = ""
  
  for k in props:
    propstr += "  " + k + " = " + props[k] + "\n"
    uistr += "    layout.prop(self, '" + k + "')\n"
    copystr += "    self." + k + " = node." + k + "\n"

  for k in inputs:
    socketstr += "    self.inputs.new('" + inputs[k] + "', '" + k + "')\n"
  for k in outputs:
    socketstr += "    self.outputs.new('" + outputs[k] + "', '" + k + "')\n"
  
  code = """class NAME(Node, GameGraphNode):
  # === Basics ===
  # Description string
  '''A custom node'''
  
  # Optional identifier string. If not explicitly defined, the python class name is used.
  bl_idname = 'NAMEType'
  
  # Label for nice name display
  bl_label = 'TITLE'
  
  _category = 'CATEGORY'
  
  # Icon identifier
  bl_icon = 'SOUND'
  
  def draw_buttons(self, context, layout):
BUTTON_CODE
    pass
    
  def copy(self, node):
COPYCODE
    pass
    
  def init(self, context):
SOCKET_CODE
    pass
    
PROPS
  
nodes.append(NAME)
  """
  
  code = code.replace("NAME", name).replace("TITLE", title)
  code = code.replace("PROPS", propstr)
  code = code.replace("CATEGORY", category)
  code = code.replace("BUTTON_CODE", uistr)
  code = code.replace("COPYCODE", copystr)
  code = code.replace("SOCKET_CODE", socketstr)
  
  exec(code)
  
make_node("InsideRegion", "Inside Region",
  inputs = {
    "do" : "ReadySocket"
  },
  outputs = {
    "then" : "ReadySocket"
  },
  props = {
    "region" : "StringProperty()"
  }
);

make_node("IfNode", "If",
  inputs = {
    "is true" : "ReadySocket",
  },
  outputs = {
    "then" : "ReadySocket",
    "else" : "ReadySocket"
  }
);

make_node("MoveNode", "Move Character",
  inputs = {
    "do" : "ReadySocket"
  },
  outputs = {
    "then" : "ReadySocket"
  },
  props = {
    "actor" : "StringProperty()",
    "direction" : "FloatVectorProperty(size=3)",
    "distance" : "FloatProperty(default=1)",
    "time" : "FloatProperty(default=1)"
  }
);

make_node("MessageNode", "Show Message",
  inputs = {
    "do" : "ReadySocket"
  },
  outputs = {
    "then" : "ReadySocket"
  },
  props = {
    "message" : "StringProperty()",
    "time"    : "FloatProperty(default=3)",
    "wait"   : "BoolProperty(default=False)"
  }
);

make_node("ActionKeyNode", "Action Key",
  inputs = {
    "ready" : "ReadySocket"
  },
  outputs = {
    "then" : "ReadySocket"
  },
  props = {
  }
);

make_node("TriggerStart", "TriggerStart",
  inputs = {
    "trigger" : "ReadySocket",
  },
  outputs = {
    "then" : "ReadySocket",
    "end_link" : "ReadySocket"
  },
  props = {
    "name" : "StringProperty()"
  }
);

make_node("TriggerEnd", "TriggerEnd",
  inputs = {
    "ready" : "ReadySocket",
    "start_link" : "ReadySocket"
  },
  outputs = {
    "then" : "ReadySocket"
  },
  props = {
    "name" : "StringProperty()"
  }
);

bpy_classes = utils.Registrar([] + nodes)
