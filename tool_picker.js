function Picker(paint) {
	var p = this;
	var canvas = paint.canvas;
	var isDrawing = false;
	var lastColor = null;
	function RGB3iv_to_HTMLrgb(c) {
		return "rgb("+c[0]+","+c[1]+","+c[2]+")";
	}
	function RGB3iv_to_HTML7c(c) {
		var str = "#";
		for (var i=0; i<3; i++) str += c[i]>15 ? c[i].toString(16) : "0"+c[i].toString(16);
		return str;
	}
	Object.defineProperties(p, {
		"RGB3i": {get: function() {
			return lastColor;
		}},
		"RGB3f": {get: function() {
			return [lastColor[0]/255, lastColor[1]/255, lastColor[2]/255];
		}},
		"HTMLrgb": {get: function() {
			return RGB3iv_to_HTMLrgb(lastColor);
		}},
		"HTML7c": {get: function() {
			return RGB3iv_to_HTML7c(lastColor);
		}}
	});
	
	p.onColorPick = function() {log(color);} //каллбек. сработает при получении цвета пипеткой
	p.onFinalColorPick = function() {log(color);} //каллбек. сработает при отпускании пипетки
	function pick(x,y) {
		var data = paint.canvas.rc.getImageData(x,y,2,2).data;
		p.onColorPick(lastColor = [data[0],data[1],data[2],data[3]]);
	}
	p.start = function(x,y) {
		if (isDrawing) return false;
		isDrawing = true;
		pick(x,y);
		return true;
	}
	p.move = function(x,y) {
		if (!isDrawing) return false;
		pick(x,y);
		return true;
	}
	p.end = function() {
		if (!isDrawing) return false;
		isDrawing = false;
		this.onFinalColorPick(lastColor);
		return true;
	}
	
	p.modes = ["picker"];
	p.mode = "picker";
	
	var w = paint.SimpleEventWrapper;
	var events = {
		'mousedown': [ canvas,   w.wrap(p, 0,"start","", w.COORDS | w.PRESSURE | w.PREVENT | w.UPDATE_TIME) ],
		'mousemove': [ document, w.wrap(p, 0,"move", "", w.COORDS) ],
		'mouseup':   [ document, w.wrap(p, 0,"end",  "") ],
		'touchstart': [ canvas,   w.wrap(p, 1,"start","", w.COORDS | w.PRESSURE | w.PREVENT | w.UPDATE_TIME) ],
		'touchmove':  [ document, w.wrap(p, 1,"move", "", w.COORDS) ],
		'touchend':   [ document, w.wrap(p, 1,"end",  "") ],
	};
	p.events = events;
}

