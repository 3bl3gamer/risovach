function Brush(paint) {
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
	var lastX = 0, lastY = 0;
	var mouse_x = 0, mouse_y = 0;
	var lastPressure = 1;
	
	var isDrawing = false; //идёт ли сейчас рисование
	var path = []; //путь (или полоса). массив вида [x0,y0,pressure0, x1,y1,pressure1, ...]
	var params = []; //параметры [слой,размер,блюр,шаг,цвет,форма]
	
	var cursorBuffer = createBuffer(sizeMax*2+4);
	var cursor = {img: cursorBuffer, xo: cursorBuffer.width/2, yo: cursorBuffer.height/2};
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
			
			paint.refreshRegionCoords(
				mouse_x-buf.width*0.5, mouse_y-buf.height*0.5,
				mouse_x+buf.width*0.5, mouse_y+buf.height*0.5,
				mouse_x, mouse_y);
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
		mouse_x = x;
		mouse_y = y;
		
		if (isDrawing) return false;
		
		path = [x, y, pressure];
		this.simpleStart(paint.buffer.rc, x, y, pressure);
		isDrawing = true;
		
		var r = getTotalRadius();
		paint.refreshRect.extend_r(x,y,r+2);
		if (paint.tryToUpdate(x,y))
			paint.refreshRect.reset_r(x,y,r+2);//TODO: ну вообще неочень. дважды.
		
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
		mouse_x = x;
		mouse_y = y;
		
		if (isDrawing) {
			path.push(x,y,pressure);
			this.simpleMove(paint.buffer.rc, x, y, pressure);
		}
		
		var r = getTotalRadius();
		paint.refreshRect.extend_r(x,y,r+2);//+2, т.к. курсор-кружок
		if (paint.tryToUpdate(x,y))
			paint.refreshRect.reset_r(x,y,r+2);//TODO: чёт как-то неочень
		
		return isDrawing;
	}
	//Зе Енд
	b.end = function() {
		if (!isDrawing) return false;
		
		paint.history.add(new BrushHistoryStep(paint, this, getParams(), path));
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
			"blendMode": blendMode
		}
	}
	//восстановление параметров из массива
	function setParams(params) {
		b.size = params.size;
		b.blur = params.blur;
		step = params.step;
		b.color = params.color;
		//b.shape = params.shape;
		blendMode = params.blendMode;
	}
	
	b.asBrush = function() {
		return {
			onStart: function() {blendMode = BLEND_MODE_NORMAL;},
			events: events,
			cursor: cursor,
			get blendMode() {return blendMode},
		};
	}
	
	b.asEraser = function() {
		return {
			onStart: function() {blendMode = BLEND_MODE_ERASER;},
			events: events,
			cursor: cursor,
			get blendMode() {return blendMode},
		};
	}
	
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
	//b.events = events;
	b.getParams = getParams;
	b.setParams = setParams;
	b.getTotalRadius = getTotalRadius;
	spriteUpdate();
}



function BrushHistoryStep(paint, brush, params, path) {
	var s = this;
	s.brush = brush;
	s.region = [];//массив из getImageData
	s.regionPos = [];//массив параметров прямоугольников в region вида [x0,y0,w0,h0, x1,y1,w1,h2, ...]
	s.params = params;
	s.path = path;
	s.layer_id = paint.layer_id;
	s.addPathAndCapture(paint.getLayerBuffer(), params, path);
}

//возвращает площадь i-го прямоугольника
BrushHistoryStep.prototype.getSquare = function(i) {
	var rp = this.regionPos;
	return rp[i+2]*rp[i+3];
}

//возвращает площать прямоугольника, который содержит оба
//переданных прямоугольника (выбирает минимальный естественно)
BrushHistoryStep.prototype.getMergedSquare = function(i1,i2) {
	var l,t,r,b, rp=this.regionPos;
	l=Math.min(rp[i1  ], rp[i2  ]);
	t=Math.min(rp[i1+1], rp[i2+1]);
	r=Math.max(rp[i1  ]+rp[i1+2], rp[i2  ]+rp[i2+2]);
	b=Math.max(rp[i1+1]+rp[i1+3], rp[i2+1]+rp[i2+3]);
	return (r-l)*(b-t);
}

//растягивает первый прямоугольник так, чтобы второй полностью был внутри 1го
BrushHistoryStep.prototype.rectMerge = function(i1,i2) {
	var l,t,r,b, rp=this.regionPos;
	l=Math.min(rp[i1  ], rp[i2  ]);
	t=Math.min(rp[i1+1], rp[i2+1]);

	r=Math.max(rp[i1  ]+rp[i1+2], rp[i2  ]+rp[i2+2]);
	b=Math.max(rp[i1+1]+rp[i1+3], rp[i2+1]+rp[i2+3]);
	rp[i1  ]=l;
	rp[i1+1]=t;
	rp[i1+2]=r-l;
	rp[i1+3]=b-t;
}

//добавление участка (буфер, размеры области)
BrushHistoryStep.prototype.rectAdd = function(buf,left,top,right,bottom) {
	if (left < 0) left = 0;
	if (top < 0) top = 0;
	if (right > buf.width) right = buf.width;
	if (bottom > buf.height) bottom = buf.height;
	if (left >= right || top >= bottom) return; //за пределами канваса или пустой
	
	var w = right-left, h = bottom-top;
	var rp = this.regionPos;
	rp.push(left,top,w,h);
	
	//*-----*    *-------*
	//|  A  |    |       |
	//|   *---*  |  C - -|
	//*---| B |  |   |   |
	//    *---*  *-------*
	//если площадь A+B>C, выгоднее прямоугольники A и B заменить на один C. это и делается
	for (var i=4; i<rp.length; i+=4) {
		if (rp[i] === undefined) {console.error("Tried to access undefined rect."); break;} //DEBUG
		for (var j=0;j<i;j+=4) {
			if (rp[j] === undefined) {console.error("Tried to access undefined rect."); break;} //DEBUG
			var t1 = this.getSquare(i)+this.getSquare(j);
			var t2 = this.getMergedSquare(i,j);
			if (t1 > t2) {
				this.rectMerge(i,j);
				rp.splice(j,4);
				i -= 4;
				j -= 4;
			}
		}
	}
}

//расчитывает, какими прямоугольниками покрыть весь штрих, сохраняет
BrushHistoryStep.prototype.addPathAndCapture = function(buf, params, path) {
	if (path.length == 0) {console.error("tried to add empty path to BHS"); return;} //DEBUG
	var r = this.brush.getTotalRadius(params.size, params.blur);
	
	var left=path[0], top=path[1], right=path[0], bottom=path[1];
	for (var i=3; i<path.length; i+=3) {
		var x=path[i], y=path[i+1];
		if (left > x) left = x;
		if (right < x) right = x;
		if (top > y) top = y;
		if (bottom < y) bottom = y;
		var square = (right-left)*(bottom-top);
		if (i < path.length-3 && square > 64*64) {
			this.rectAdd(buf, left-r, top-r, right+r, bottom+r);
			left = path[i];  top = path[i+1];
			right = path[i]; bottom = path[i+1];
		}
	}
	this.rectAdd(buf, left-r, top-r, right+r, bottom+r);
	this.capture(paint);
}

//проход по массиву прямоугольников, копирование пикселов
BrushHistoryStep.prototype.capture = function(paint, forceLayer) {
	if (forceLayer !== undefined) this.layer_id = forceLayer;
	this.region = [];
	var buf = paint.getLayerBuffer(this.layer_id);
	var rc=buf.rc, rp=this.regionPos;
	for (var i=0; i<rp.length; i+=4) {
		this.region.push(rc.getImageData(rp[i],rp[i+1],rp[i+2],rp[i+3]));
		//rc.strokeRect(rp[i],rp[i+1],rp[i+2],rp[i+3]);
	}
}

//восстановление пикселов
BrushHistoryStep.prototype.undo = function(paint) {
	var buf = paint.getLayerBuffer(this.layer_id);
	var rc=buf.rc, rp=this.regionPos;
	for (var i=0; i<this.region.length; i++) {
		rc.putImageData(this.region[i],rp[i*4],rp[i*4+1]);
	}
}

//повторение
BrushHistoryStep.prototype.redo = function(paint) {
	var brush = this.brush;
	var path = this.path;
	var params = brush.getParams();
	var buf = paint.getLayerBuffer(this.layer_id);
	brush.setParams(this.params);
	buf.rc.globalCompositeOperation = brush.blendMode;
	brush.simpleStart(buf.rc, path[0], path[1], path[2]);
	for (var i=3; i<path.length; i+=3)
		brush.simpleMove(buf.rc, path[i], path[i+1], path[i+2]);
	buf.rc.globalCompositeOperation = "source-over";
	brush.setParams(params);
}

