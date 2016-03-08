var _image = undefined;
define(['util'], function image(util) {
  'use strict';
  
  var exports = _image = {};
  var Class = util.Class;
  
  var TileFlags = exports.TileFlags = {
    WHITE_BG : 1024,
    BIG4X4   : 2048,
    HIDDEN   : 4096,
    MASK     : 1024|2048|4096
  }

  var gtp_rets = new util.cachering(function() {
    return [0, 0];
  }, 32);
  
  var tileidx = exports.tileidx = function tileidx(id) {
    return id & ~TileFlags.MASK;
  }

  var TileManager = exports.TileManager = Class([
    function constructor(tiles, tilesize) {
      this.tiledef = tiles;
      this.tiles = [];
      this.tilesize = tilesize;
      
      this._black = -0x1000000;
      this._white = 0xffffffff;
      this._clear = 0;
    },
    
    function get_tile_pos(tileidx) {
      var ret = gtp_rets.next();
      var w = this.tilesize + 3;
      
      ret[0] = (tileidx % 3) * w;
      ret[1] = (~~(tileidx / 3)) * w;
      
      return ret;
    },
    
    function clear_tiles() {
    },
    
    function make_tiles() {
      var tiledef = this.tiledef;
      var size = this.tilesize;
      
      for (var k in tiledef) {
        var v = tiledef[k];
        var flag = v & TileFlags.MASK;
        v = v & ~TileFlags.MASK;
        
        if (v >= this.tiles.length)
          this.tiles.length = v+1;
          console.log(this)
          
        var size2 = flag & TileFlags.BIG4X4 ? size*4 : size;
        
        this.tiles[v] = new ImageData(size2, size2);
        this.tiles[v].flag = flag;
        
        var data = this.tiles[v].data;
        var iview = new Int32Array(data.buffer);
        
        if (flag & TileFlags.WHITE_BG)
          iview.fill(this._white, 0, iview.length);
        else
          iview.fill(this._black, 0, iview.length);
      }
    },
    
    function draw(canvas, g, x, y) {
      var tiles = this.tiles;
      
      var p;
      for (var i=0; i<tiles.length; i++) {
        p = this.get_tile_pos(i);
        g.putImageData(tiles[i], p[0], p[1]);
      }
    }
  ]);
  /*
  var ImageTile = exports.ImageTile = Class([
    function constructor() {
      
    }
  ]);
  //*/
  
  return exports;
});
