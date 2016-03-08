import bpy, gpu, json
import base64, struct
from mathutils import *
from math import *

from . import utils

def get_deform_armature(armob):
  name = "shadow_" + armob.name
  
  if name not in bpy.data.objects:
    ob = bpy.data.objects.new(name, bpy.data.armatures.new(name))
    bpy.context.scene.objects.link(ob)
    
  armob2 = bpy.data.objects[name]
  
  #sync bones
  arm1 = armob.data
  arm2 = armob2.data
  scene = bpy.context.scene
  
  posemode = arm1.pose_position
  arm1.pose_position = "REST"

  if bpy.context.active_object.mode == "EDIT":
    bpy.ops.object.editmode_toggle();
  
  scene.objects.active = armob2
  bpy.ops.object.editmode_toggle();
  
  for bone in arm1.bones:
    if not bone.use_deform: continue
    
    if bone.name not in arm2.bones:
      bpy.ops.armature.bone_primitive_add(name=bone.name);
      print("CREATE BONE")
      
  #bpy.ops.object.editmode_toggle();
  
  armob = bpy.data.objects[armob.name]
  arm1 = armob.data
  
  armob2 = bpy.data.objects[name]
  arm2 = armob2.data
  pose = armob.pose
  pose2 = armob2.pose
  scene.objects.active = armob2
  
  print(arm2.edit_bones.keys());
  
  for bone in arm1.bones:
    if not bone.use_deform: continue
    
    pbone = pose.bones[bone.name]
    bone2 = arm2.edit_bones[bone.name]
    
    co = pbone.head
    co2 = pbone.tail

    vec = (co2 - co)
    vec.normalize()
    
    #"""
    if 1:
      mat = pbone.matrix;
      xvec2 = vec.cross(Vector([0, 0, 1]))
      xvec2.normalize()
      
      xvec = Vector(mat[0][:3])
      xvec.normalize()
      
      ang = xvec.dot(xvec2)
      
      ang = min(max(ang, -1), 1)
      ang = asin(ang*0.99999)
      
      bone2.roll = ang + pi/2
      print("v", ang)
    #"""
    
    for i in range(3):
      bone2.head[i] = co[i]
      bone2.tail[i] = co2[i]
      
    
    """
    if bone.parent is not None and bone.parent.use_deform:
      for bone3 in arm2.edit_bones:
        bone3.select = False
      
      bone2.select = True 
      arm2.edit_bones.active = arm2.edit_bones[bone.parent.name]
      
      bpy.ops.armature.parent_set(type = "CONNECTED" if bone2.use_connect else "OFFSET");
      
      #bone2.parent = arm2.bones[bone.parent.name]
      
      print(bone.parent)
    #"""
  
  bpy.ops.object.editmode_toggle();
  
  armob2 = bpy.data.objects[name]
  armob2.update_tag()
  arm2 = armob2.data;
  arm2.update_tag()
  arm1.update_tag();
  armob.update_tag();
  
  arm1.pose_position = posemode

  return armob2

def get_bake_action(pbone, name):
  actions = pbone.baked_actions.actions
  for action in actions:
    if action.name == name:
      return action
  
  print("create action bake or", pbone.name," action:", name);
  
  action = actions.add()
  action.name = name
  
  return action

import bpy

_current_iterator = None

def draw_callback_px(self, context):
  self._drawn = True
  
class ModalTimerOperator(bpy.types.Operator):
    """Operator which runs its self from a timer"""
    bl_idname = "anim.actionbake"
    bl_label = "Action Bake"

    _timer = None
    _drawn = False
    
    def modal(self, context, event):
        global _current_iterator
        
        if _current_iterator is None:
          #bpy.types.SpaceView3D.draw_handler_remove(self._handle, 'WINDOW')
          return {'CANCELLED'}
          
        if event.type in {'RIGHTMOUSE', 'ESC'}:
            self.cancel(context)
            #bpy.types.SpaceView3D.draw_handler_remove(self._handle, 'WINDOW')
            return {'CANCELLED'}

        if event.type == 'TIMER':
          try:
            _current_iterator.__next__()
          except StopIteration:
            print("done")
            _current_iterator = None
            #bpy.types.SpaceView3D.draw_handler_remove(self._handle, 'WINDOW')
            return {'CANCELLED'}

        return {'PASS_THROUGH'}
    
    def execute(self, context):
        wm = context.window_manager
        self._timer = wm.event_timer_add(0.05, context.window)
        wm.modal_handler_add(self)
        return {'RUNNING_MODAL'}

    def invoke(self, context, event):
        return
        
        view3d = None
        for area in context.screen.areas:
          if area.type == "VIEW_3D":
            view3d = area
            break
        
        if view3d != None:
            # the arguments we pass the the callback
            args = (self, view3d)
            # Add the region OpenGL drawing callback
            # draw in view space with 'POST_VIEW' and 'PRE_VIEW'
            self._handle = bpy.types.SpaceView3D.draw_handler_add(draw_callback_px, args, 'WINDOW', 'POST_PIXEL')

            self.mouse_path = []

            context.window_manager.modal_handler_add(self)
            
            wm = context.window_manager
            self._timer = wm.event_timer_add(0.05, context.window)
            wm.modal_handler_add(self)
            return {'RUNNING_MODAL'}
        else:
            self.report({'WARNING'}, "View3D not found, cannot run operator")
            return {'CANCELLED'}

    def cancel(self, context):
        wm = context.window_manager
        wm.event_timer_remove(self._timer)

def bake_action3(armob, mesh, meshob, mesh2):
  global _current_iterator
  
  _current_iterator = bake_action3_intern(armob, mesh, meshob, mesh2)
  bpy.ops.anim.actionbake()
  pass
  
def bake_action3_intern(armob, mesh, meshob, mesh2):
  scene = bpy.context.scene
  
  """
  number of bone names : int
  ...bone names: 
    name        : 64 bytes
    rest_matrix : 16 floats 
    
  ...records:
    frame  : float32
    boneid : short
    matrix : 16 floats
  #"""
  
  out = b""
  pose = armob.pose
    
  arm = armob.data
  scene.objects.active = armob
  
  mats = {}
  mat_frames = {}
  
  action = armob.animation_data.action
  frames = [int(f) for f in action.frame_range]
  
  out += struct.pack("i", len(pose.bones))
  idmap = {}
  
  for i, pbone in enumerate(pose.bones):
    if pbone.name not in arm.bones:
      print("missing bone!", pbone.name)
      continue
      
    bone = arm.bones[pbone.name];
    
    idmap[pbone.name] = i
    out += struct.pack("64s", bytes(pbone.name, "latin-1"))
    mat = Matrix(bone.matrix_local)
    #mat.invert()
    
    for k in range(4):
      for j in range(4):
        out += struct.pack("f", mat[j][k]);
        
  #clear any existing keyframes first
  for pbone in pose.bones:
    bone = arm.bones[pbone.name]
    
    #if not bone.use_deform:
    #  continue
      
    #baction = get_bake_action(pbone, action.name)
    #baction.data.clear()
  
  bpy.context.scene.frame_set(frames[0])
  
  for frame in range(frames[0], frames[1]):
    mat_frames[frame] = {}
    
    print("doing frame", frame, "of", frames[1]-1)
    
    bpy.context.scene.frame_set(frame)
    bpy.context.scene.update()
    
    yield;
    
    for pbone in pose.bones:
      bone = arm.bones[pbone.name]
      
      #if not bone.use_deform:
      #  continue
        
      #baction = get_bake_action(pbone, action.name)
      
      mat = Matrix(pbone.matrix)
        
      mats[pbone.name] = mat
      
      out += struct.pack("f", frame)
      out += struct.pack("h", idmap[pbone.name])
      arr = [];
      
      for y in range(4):
        for x in range(4):
          out += struct.pack("f", mat[x][y])
          arr.append(mat[x][y]);
      
      if pbone.name == "Foot.R":
        print(mat, arr)
          
      mat2 = [[mat[y][x] for y in range(4)] for x in range(4)]
      mat_frames[frame][pbone.name] = mat2
  
  #data = json.dumps(mat_frames)
  data = base64.b64encode(out)
  
  armob["action_" + action.name] = data
  #if armob.proxy != None:
  #  armob.proxy["action_" + action.name] = data
  #  print("PROXY:", armob.proxy.name)
    
  print(len(data))
  
def bake_action2(armob, mesh, meshob, mesh2):
  scene = bpy.context.scene
  
  #if armob.proxy != None:
  #  pose = armob.proxy.pose
  #else:
  pose = armob.pose
    
  arm = armob.data
  scene.objects.active = armob
  
  mats = {}
  
  action = armob.animation_data.action
  frames = [int(f) for f in action.frame_range]
  
  #clear any existing keyframes first
  for pbone in pose.bones:
    bone = arm.bones[pbone.name]
    
    #if not bone.use_deform:
    #  continue
      
    #baction = get_bake_action(pbone, action.name)
    #baction.data.clear()
  
  for frame in range(frames[0], frames[1]):
    print("doing frame", frame)
    
    for pbone in pose.bones:
      bone = arm.bones[pbone.name]
      
      if not bone.use_deform:
        continue
        
      baction = get_bake_action(pbone, action.name)
      
      mat1 = Matrix(pbone.matrix)
      mat1.transpose()
      mat2 = Matrix(bone.matrix_local)
      mat1.transpose()
      mat2.invert()
      
      mat = mat1 * mat2
      mat.transpose()
      mats[pbone.name] = mat
      
      bmat = baction.data.add()
      bmat.frame = frame
      
      for i in range(4):
        for j in range(4):
          bmat.matrix[j*4+i] = mat[i][j]
  
  return
  for i, v in enumerate(mesh.vertices):
    v2 = mesh2.vertices[i]
    v2.co = v.co
    
    co2 = Vector([v.co[0], v.co[1], v.co[2], 1.0]);
    co = Vector([0,0,0,1]) #Vector([v.co[0], v.co[1], v.co[2], 1.0]);
    
    totw = 0
    for j, w2 in enumerate(v.groups):
      name = meshob.vertex_groups[w2.group].name
      if name not in mats: continue
      
      w = w2.weight
      totw += w
      
      mat = mats[name]
      co += (co2 * mat) * w
      if j == 3: break
      
    if totw == 0: continue
    co = Vector(co[:3]) / totw
    v2.co = co
    
def bake_action(armob):
  dfarm = get_deform_armature(armob)
  pose = armob.pose
  pose2 = dfarm.pose

  scene = bpy.context.scene
  scene.objects.active = armob
  #bpy.ops.object.editmode_toggle();
  bpy.ops.object.mode_set(mode="POSE")
  arm2 = dfarm.data
  arm1 = armob.data
  
  for pbone2 in pose2.bones:
    if pbone2.name not in pose.bones:
      print("MISSING PBONE:", pbone2.name, "from", armob.name)
      continue
    
    bone2 = arm2.bones[pbone2.name]
    bone = arm1.bones[pbone2.name]
    pbone = pose.bones[pbone2.name]
    
    mat = Matrix(pbone.matrix)
    mat.transpose()
    
    mat2 = Matrix(bone2.matrix_local)
    mat2.transpose();
    
    mat2.invert()
    mat = mat * mat2
    
    co = Vector([0, 0, 0, 1]) * mat
    
    co = Vector(co[:3])
    print(co-pbone.head)
    pbone2.location = co# - bone2.head
    
    mat.transpose()

    mat = Matrix(pbone.matrix)
   # mat.transpose()
    mat.to_3x3();
    mat2 = Matrix(bone2.matrix_local)
    #mat.transpose()
    mat2.to_3x3();
    
    mat2.invert()
    mat = mat2 * mat
    #mat.transpose()
    
    pbone2.rotation_mode = "XYZ"
    pbone2.rotation_euler = mat.to_euler()
    
    continue
    
    pbone3 = pbone
    
    while pbone3.parent is not None:
      pbone3 = pbone3.parent
      mat = mat * pbone3.matrix
    
    pbone2.location = Vector([0, 0, 0])
    #mat = Matrix(pbone.matrix)
    #mat.to_3x3()
    
  bpy.ops.object.mode_set(mode="OBJECT")
  scene.objects.active = dfarm
  
bpy_classes = utils.Registrar([
  ModalTimerOperator
])
