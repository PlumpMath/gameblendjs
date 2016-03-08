var _idproperty = undefined;

define([
  '../util/util', './sdna'
], function(util, sdna) {
  'use strict';
  
  var exports = _idproperty = {};
  var Class = util.Class;
  var set = util.set;

  var IDPropTypes = exports.IDPropTypes = {
    IDP_STRING           : 0,
    IDP_INT              : 1,
    IDP_FLOAT            : 2,
    IDP_ARRAY            : 5,
    IDP_GROUP            : 6,
    /* the ID link property type hasn't been implemented yet, this will require
     * some cleanup of blenkernel, most likely. */
    IDP_ID               : 7,
    IDP_DOUBLE           : 8,
    IDP_IDPARRAY         : 9,
    IDP_NUMTYPES         : 10
  };
  
  
  /* IDP_STRING */
  var IDPStringTypes = exports.IDPStringTypes = {
    IDP_STRING_SUB_UTF8  : 0,  /* default */
    IDP_STRING_SUB_BYTE  : 1,  /* arbitrary byte array, _not_ null terminated */
  };

  /*->flag*/
  var IDPropFlags = exports.IDPropFlags = {
    IDP_FLAG_GHOST      : 1 << 7,  /* this means the property is set but RNA will return false when checking
                                     * 'RNA_property_is_set', currently this is a runtime flag */
  };

  var IDPropsToJSON = exports.IDPropsToJSON = function IDPropsToJSON(group) {
    var iview = new Int32Array(4), fview = new Float32Array(iview.buffer);
    var dview = new Float64Array(iview.buffer);
    
    //hrm, need to handle endian stuff, like for floats?  or not?
    //hmm. . .
    
    function recurse(prop) {
      /*if (prop.data == undefined) {
        console.log("WARNING: error parsing id property");
        return "(corrupted)";
      }//*/

      switch(prop.type) {
        case IDPropTypes.IDP_STRING:
          var string = "";

          var view = new Uint8Array(prop.data.pointer);
          
          for (var i=0; i<view.length; i++) {
            if (view[i] == 0)
              break;
            string += String.fromCharCode(view[i]);
          }
          
          return string;
        case IDPropTypes.IDP_INT:
          return prop.data.val;
        case IDPropTypes.IDP_FLOAT:
          iview[0] = prop.data.val;
          return fview[0];
        case IDPropTypes.IDP_ARRAY:
          throw new Error("implement me!");
          break;
        case IDPropTypes.IDP_GROUP:
          var ret = {};
          
          for (var prop2 of prop.data.group) {
            ret[prop2.name] = recurse(prop2);
          }
          
          return ret;
          break;
        case IDPropTypes.IDP_DOUBLE:
          iview[0] = prop.data.val;
          iview[1] = prop.data.val2;
          return dview[0];
        case IDPropTypes.IDP_IDPARRAY:
          throw new Error("implement me");
          break;
      }
    }
    
    return recurse(group);
  }
  
  //function JSONToIDProperty() {
  //}
  return exports;
});
