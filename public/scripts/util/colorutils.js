"use strict";

// r,g,b values are from 0 to 1
// h = [0,360], s = [0,1], v = [0,1]

//		if s == 0, then h = -1 (undefined)

//takes four float arrays for clr and hsv
//returns either new hue (ret[0]), or last_hue

export function rgba_to_hsva(Array<float> clr, Array<float>ret=undefined, float last_hue=0)
{
  var r =clr[0], g = clr[1], b = clr[2], a = clr[3];
	var min, max, delta;
  var h, s, v;
  
  min = Math.min( r, g, b );
	max = Math.max( r, g, b );
	v = max;				// v
  
	delta = max - min;
	if( max != 0 ) {
		s = delta / max;		// s
	} else {
		// r = g = b = 0		// s = 0, v is undefined
		s = -1;
		h = last_hue;
    
    ret[0] = h; ret[1] = s; ret[2] = v; ret[3] = a;
		return last_hue;
	}
  
  if (delta != 0.0 && s != 0.0) {
    if( r == max )
      h = ( g - b ) / delta;		// between yellow & magenta
    else if( g == max )
      h = 2 + ( b - r ) / delta;	// between cyan & yellow
    else
      h = 4 + ( r - g ) / delta;	// between magenta & cya
    //h *= 60;				// degrees
    //h = h*60 + 360*(h < 0)
    
    h = h/6.0 + 1*(h < 0);
  } else {
    h = last_hue;
  }
  
	if( h < 0 )
		h += 360;
    
  ret[0] = h; ret[1] = s; ret[2] = v; ret[3] = a;
  return h;
}

export function hsva_to_rgba(Array<float> hsva, Array<float> ret, float last_hue) {
  var r, g, b, h=hsva[0]*360.0, s=hsva[1], v=hsva[2];
	var i, f, p, q, t;
  
	if( s == 0 ) {
		// achromatic (grey)
    ret[0] = ret[1] = ret[2] = v;
    ret[3] = hsva[3];
    
		return last_hue;
	}
  
	h /= 60;			// sector 0 to 5
	i = Math.floor( h );
	f = h - i;			// factorial part of h
	p = v * ( 1 - s );
	q = v * ( 1 - s * f );
	t = v * ( 1 - s * ( 1 - f ) );
	switch( i ) {
		case 0:
			r = v;
			g = t;
			b = p;
			break;
		case 1:
			r = q;
			g = v;
			b = p;
			break;
		case 2:
			r = p;
			g = v;
			b = t;
			break;
		case 3:
			r = p;
			g = q;
			b = v;
			break;
		case 4:
			r = t;
			g = p;
			b = v;
			break;
		default:		// case 5:
			r = v;
			g = p;
			b = q;
			break;
	}
  
  ret[0] = r; ret[1] = g; ret[2] = b; ret[3] = hsva[3];
  
  return hsva[0];
}