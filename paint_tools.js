//вместо ​sizeSilent мб провеять что-то типа brush.autoUpdate

function Brush(paint/*, disableHistory*/) {
	var b = this;
	var canvas = paint.canvas;
	//var history = disableHistory ? null : new BrushHistoryHandler(paint, this);
	
	var color = ['#000000',1];
	Object.defineProperty(b, "color", {
		get: function() {return color.slice();},
		set: function(v) {color[1] = v[1]; if (color[0] == v[0]) return; color[0] = v[0]; spriteUpdate();}
	});
	Object.defineProperty(b, "colorHTML", {
		get: function() {return color[0];},
		set: function(v) {color[0] = v; spriteUpdate();}
	});
	Object.defineProperty(b, "alpha", {
		get: function() {return color[1];},
		set: function(v) {color[1] = v;}
	});
	
	var size = 0; //радиус
	var sizeMax = 16;
	var blur = 1/32;
	var blurMax = 1;
	var step = 2;
	var stepLeft = 0; //через сколько пикселов начинать новый отрезок
	var lastX = 0;
	var lastY = 0;
	var lastPressure = 1;
	
	var isDrawing = false; //идёт ли сейчас рисование
	var isHistoryEnabled = false; //дублирует и кеширует параметр paint'а
	var path = []; //путь (или полоса). массив вида [x0,y0,pressure0, x1,y1,pressure1, ...]
	var params = []; //параметры [слой,размер,блюр,шаг,цвет,форма]
	
	var cursorBuffer = createBuffer(sizeMax*2+4);
	b.cursor = {img: cursorBuffer, xo: cursorBuffer.width/2, yo: cursorBuffer.height/2};
	var spriteSizeStep = 2;//2->   1,2,  4,      8,    16
	var sprite = [];       //2-> 1,1,2,4,4,8,8,8,8,...
	//полный радиус кисти. по сути - ребро bounding box'а пополам
	function getTotalRadius(exSize, exBlur) {
		return (exSize !== undefined ? exSize : size) *
		       (1 + (exBlur !== undefined ? exBlur : blur));
	}
	
	Object.defineProperty(b, "blur", {
		get: function() {return blur;},
		set: function(v) {blur = toRange(0, v, blurMax);}
	});
	
	Object.defineProperty(b, "size", {
		get: function() {return size;},
		set: function(v) {
			size = toRange(1, v, sizeMax);
			
			//рисуем кружок кисти в буффер, потом будет рисовать этот буффер под мышкой
			//отрисовка буффера проходит быстрее, чем отрисовка 2х кругов, в ~10 раз
			var buf=cursorBuffer, brc=buf.rc;
			brc.clearRect(0,0,buf.width,buf.height);
			
			brc.strokeStyle = "white";
			brc.lineWidth = 3;
			brc.circle(buf.width*0.5,buf.height*0.5, size);
			
			brc.strokeStyle = "black";
			brc.lineWidth = 1;
			brc.circle(buf.width*0.5,buf.height*0.5, size);
		}
	});
	Object.defineProperty(b, "sizeSilent", {
		set: function(v) {size = toRange(1, v, sizeMax);}
	});
	
	var BLEND_MODE_NORMAL = "source-over";
	var BLEND_MODE_ERASER = "destination-out";
	var blendMode = BLEND_MODE_NORMAL;
	Object.defineProperty(b, "blendMode", {
		get: function() {return blendMode;}
	});
	
	//перерисовываем спрайт кисти
	function spriteUpdate() {
		var dx = getTotalRadius(sizeMax);
		var buf = createBuffer((dx*2)<<0);
		var brc = buf.rc;
		
		//brc.strokeRect(0,0,buf.width,buf.height);
		
		brc.shadowBlur = blur * sizeMax;
		brc.shadowOffsetX = dx*3;
		brc.shadowColor = color[0];
		
		brc.beginPath();
		brc.arc(dx-brc.shadowOffsetX,dx, sizeMax, 0,3.1415927*2, false);
		brc.fill();
		
		buf.cur_width = dx*2; //ширина для текущего содержимого
		buf.cur_size = sizeMax; //радиус текущего содержимого
		
		var ds = 1/spriteSizeStep;
		
		var size = sizeMax * ds;
		for (var i=size+1; i<=sizeMax; i++)
			sprite[i] = buf;
		
		while (size>0.99) {
			var cdx = getTotalRadius(size);
			var cbuf = createBuffer((cdx*2)<<0);
			cbuf.rc.drawImage(buf, 0,0, cdx*2,cdx*2);
			cbuf.cur_width = cdx*2; //ширина для текущего содержимого
			cbuf.cur_size = size; //радиус текущего содержимого
			buf = cbuf;
			dx = cdx;
			var next_size = size*ds;
			for (var i=next_size+1; i<=size; i++)
				sprite[i] = cbuf;
			size = next_size;
		}
		sprite[0] = sprite[1] = sprite[2];
		for (var i=0; i<=sizeMax; i++) {
			if (sprite[i]) document.body.appendChild(sprite[i]);
			log(i+": "+(sprite[i] ? sprite[i].cur_size : -1));
		}
		
		log("Sprite updated");
	}
	
	//рисует точку спрайтом
	function drawDot(rc, x,y,pressure) {
		rc.globalAlpha = color[1];
		var pSize = size * pressure;
		var buf = sprite[pSize<<0];
		var src_w=buf.width, dest_w=src_w*pSize/buf.cur_size;
		rc.drawImage(buf,
		             0,0, src_w,src_w,
		             x-dest_w/2,y-dest_w/2, dest_w,dest_w);
		rc.globalAlpha = 1;
	}
	
	//рисует линию спрайтом
	function drawLine(rc, x0,y0,x1,y1,p0,p1) {
		rc.globalAlpha = color[1];
		var d = getTotalRadius(), dr;
		var d2 = d*2, d2r;
		//var s;
		var /*k, */dx=x1-x0, dy=y1-y0, len=Math.sqrt(dx*dx+dy*dy), dp=p1-p0;
		var adx=Math.abs(dx), ady=Math.abs(dy);
		var modifyer = step/len;
		dx *= modifyer;
		dy *= modifyer;
		dp *= modifyer;
		var cx=x0, cy=y0, cp=p0; //current
		var i;
		for (i=0; i<len-0.001; i+=step) {
			var pSize = size * cp;
			var buf = sprite[pSize<<0];
			var src_w = buf.width, dest_w = src_w*pSize/buf.cur_size;
			rc.drawImage(buf,
			             0,0, src_w,src_w,
			             cx-dest_w/2,cy-dest_w/2, dest_w,dest_w);
			cx += dx;
			cy += dy;
			cp += dp;
		}
		rc.globalAlpha = 1;
		i -= step;
		return len-i;
	}
	
	
	//начало рисования штриха
	b.simpleStart = function(rc, x, y, pressure) {
		drawDot(rc, x, y, pressure);
		stepLeft = step;
		lastX = x;
		lastY = y;
		lastPressure = pressure;
	}
	b.start = function(x,y,pressure) {
		if (isDrawing) return false;
		
		if (isHistoryEnabled = paint.historyEnabled) {
			path = [x, y, pressure];
		}
		
		this.simpleStart(paint.buffer.rc, x, y, pressure);
		isDrawing = true;
		
		if (paint.autoUpdate) {
			var r = getTotalRadius();
			paint.refreshRect.extend_r(x,y,r+2);
			if (paint.tryToUpdate(x,y))
				paint.refreshRect.reset_r(x,y,r+2);//TODO: ну вообще неочень. дважды.
		}
		
		return true;
	}
	//отмена текущего штриха (например, при касании вторым пальцем)
	b.cancel = function() {
		if (!isDrawing) return false;
		paint.buffer.rc.clearRect(0,0,paint.buffer.width,paint.buffer.height);
		isDrawing = false;
		return true;
	}
	//шаг рисования
	b.simpleMove = function(rc, x, y, pressure) {
		var dx=x-lastX, dy=y-lastY, len=Math.sqrt(dx*dx+dy*dy), dp;
		if (len > stepLeft) {
			dx *= stepLeft/len;
			dy *= stepLeft/len;
			dp = (pressure-lastPressure)*stepLeft/len;
			stepLeft = step - drawLine(
				rc, lastX+dx,lastY+dy, x,y, lastPressure+dp,pressure);
		} else if (len == stepLeft) {
			drawDot(rc, x, y, pressure);
			stepLeft = step;
		} else {
			stepLeft -= len;
		}
		lastX = x;
		lastY = y;
		lastPressure = pressure;
	}
	b.move = function(x,y,pressure) {
		if (isDrawing) {
			if (isHistoryEnabled)
				path.push(x,y,pressure);
			this.simpleMove(paint.buffer.rc, x, y, pressure);
		}
		
		if (paint.autoUpdate) {
			var r = getTotalRadius();
			paint.refreshRect.extend_r(x,y,r+2);//+2, т.к. курсор-кружок
			if (paint.tryToUpdate(x,y))
				paint.refreshRect.reset_r(x,y,r+2);//TODO: чёт как-то неочень
		}
		
		return isDrawing;
	}
	//Зе Енд
	b.end = function() {
		if (!isDrawing) return false;
		
		if (isHistoryEnabled && paint.historyEnabled) //вдруг у paint'а история успела отключиться
			paint.history.add(new BrushHistoryStep(paint, this, getParams(), path));
			//this.history.addPath(this.layer,[this.getParams(),this.path],this.brushGetTotalRadius());
		
		paint.applyBuffer();
		
		isDrawing = false;
		
		return true;
	}
	
	
	//упаковка всех текущих параметров
	function getParams() {
		return {
			"size": size,
			"blur": blur,
			"step": step,
			"color": b.color,
			"shape": 0,
			"mode": b.mode
		}
	}
	//восстановление параметров из массива
	function setParams(params) {
		b.size = params.size;
		b.blur = params.blur;
		step = params.step;
		b.color = params.color;
		//b.shape = params.shape;
		b.mode = params.mode;
	}
	
	b.modes = ["brush", "eraser"];
	Object.defineProperty(b, "mode", {
		get: function() {return blendMode == BLEND_MODE_ERASER ? "eraser" : "brush";},
		set: function(new_mode) {
			blendMode = new_mode == "eraser" ? BLEND_MODE_ERASER : BLEND_MODE_NORMAL;
		}
	});
	
	var w = paint.SimpleEventWrapper;
	var events = {
		'mousedown': [ canvas,   w.wrap(b, 0,"start","cancel", w.COORDS | w.PRESSURE | w.PREVENT | w.UPDATE_TIME) ],
		'mousemove': [ document, w.wrap(b, 0,"move", "cancel", w.COORDS | w.PRESSURE) ],
		'mouseup':   [ document, w.wrap(b, 0,"end",  "cancel") ],
		'touchstart': [ canvas,   w.wrap(b, 1,"start","cancel", w.COORDS | w.PRESSURE | w.PREVENT | w.UPDATE_TIME) ],
		'touchmove':  [ document, w.wrap(b, 1,"move", "cancel", w.COORDS | w.PRESSURE) ],
		'touchend':   [ document, w.wrap(b, 1,"end",  "cancel") ],
		'mousewheel':     [ canvas, function(e) {b.size += e.wheelDelta/120; e.preventDefault();}],
		'DOMMouseScroll': [ canvas, function(e) {b.size -= e.detail;         e.preventDefault();}]
	};
	b.events = events;
	b.getParams = getParams;
	b.setParams = setParams;
	b.getTotalRadius = getTotalRadius;
	spriteUpdate();
}

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

function Merge(paint) {
	var m = this;
	m.mergeCurrentWith = function(layer_id) {
		throw new Error("Not yet.");
	}
	m.simpleDraw = function(layer_id, upper_layer_id) {
		var lower = paint.getLayerBuffer(layer_id);
		var upper = paint.getLayerBuffer(upper_layer_id);
		lower.rc.drawImage(upper, 0,0);
	}
	m.drawCurrentLayerOn = function(layer_id) {
		if (paint.historyEnabled)
			paint.history.add(new MergeHistoryStep(paint, this, "draw", layer_id, paint.layer_id));
		this.simpleDraw(layer_id, paint.layer_id);
		paint.refresh();
	}
}
