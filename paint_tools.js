//вместо ​sizeSilent мб провеять что-то типа brush.autoUpdate

function Brush(paint, disableHistory) {
	var b = this;
	var canvas = paint.canvas;
	//var history = disableHistory ? null : new BrushHistoryHandler(paint, this);
	
	var color = ['#000000',1];
	Object.defineProperty(b, "color", {
		get: function() {return color.slice();},
		set: function(v) {color[0] = v[0]; color[1] = v[1]; spriteUpdate();}
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
	
	var buffer = createBuffer(b.sizeMax*2+4);
	var spriteSizeStep = 2;//2->   1,2,  4,      8,    16
	var sprite = [];       //2-> 1,1,2,4,4,8,8,8,8,...
	//полный радиус кисти. по сути - ребро bounding box'а пополам
	function getTotalRadius(radius) {
		return (radius !== undefined ? radius : size)*(1+blur);
	}
	
	Object.defineProperty(b, "blur", {
		get: function() {return blur;},
		set: function(v) {blur = toRange(0, v, blurMax); spriteUpdate();}
	});
	
	Object.defineProperty(b, "size", {
		get: function() {return size;},
		set: function(v) {
			size = toRange(1, v, sizeMax);
			
			//рисуем кружок кисти в буффер, потом будет рисовать этот буффер под мышкой
			//отрисовка буффера проходит быстрее, чем отрисовка 2х кругов, в ~10 раз
			var buf=buffer, brc=buf.rc;
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
				brushSprite[i] = cbuf;
			size = next_size;
		}
		brushSprite[0] = brushSprite[1] = brushSprite[2];
		for (var i=0; i<=brushSizeMax; i++) {
			if (brushSprite[i]) document.body.appendChild(brushSprite[i]);
			log(i+": "+(brushSprite[i] ? brushSprite[i].cur_size : -1));
		}
		
		log("Sprite updated");
	}
	
	//рисует точку спрайтом
	function drawDot(x,y,pressure) {
		var rc = paint.buffer.rc;
		rc.globalAlpha = color[1];
		var size = size * pressure;
		var buf = sprite[size<<0];
		var src_w=buf.width, dest_w=src_w*size/buf.cur_size;
		rc.drawImage(buf,
		             0,0, src_w,src_w,
		             x-dest_w/2,y-dest_w/2, dest_w,dest_w);
		rc.globalAlpha = 1;
	}
	
	//рисует линию спрайтом
	function drawLine(x0,y0,x1,y1,p0,p1) {
		var rc = buffer.rc;
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
			var size = size * cp;
			var buf = sprite[size<<0];
			var src_w = buf.width, dest_w = src_w*size/buf.cur_size;
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
	function start(x,y,pressure) {
		if (isDrawing) return false;
		
		if (isHistoryEnabled = paint.historyEnabled) {
			//this.params = this.getParams();//???
			path = [x,y,pressure];
		}
		
		drawDot(x,y,pressure);
		stepLeft = step;
		isDrawing = true;
		
		if (paint.autoUpdate) {
			var r = getTotalRadius();
			paint.refreshRect.reset(x,y,r);
			paint.tryToUpdate();
		}
		
		lastX = x;
		lastY = y;
		lastPressure = pressure;
		
		return true;
	}
	//отмена текущего штриха (например, при касании вторым пальцем)
	function cancel() {
		if (!isDrawing) return false;
		paint.buffer.rc.clearRect(0,0,paint.buffer.width,paint.buffer.height);
		isDrawing = false;
		return true;
	}
	//шаг рисования
	function move(x,y,pressure) {
		if (isDrawing) {
			if (isHistoryEnabled)
				path.push(x,y,pressure);
			
			var dx=x-lastX, dy=y-lastY, len=Math.sqrt(dx*dx+dy*dy), dp;
			if (len > stepLeft) {
				dx *= stepLeft/len;
				dy *= stepLeft/len;
				dp = (pressure-lastPressure)*stepLeft/len;
				stepLeft = step - drawLine(
					lastX+dx,lastY+dy, x,y, lastPressure+dp,pressure);
			} else if (len == stepLeft) {
				drawDot(x,y,pressure);
				stepLeft = step;
			} else {
				stepLeft -= len;
			}
		}
		
		if (this.autoUpdate) {
			var r = getTotalRadius();
			paint.refreshRect.extend_r(x,y,r);
			paint.tryToUpdate();
		}
		
		lastX = x;
		lastY = y;
		lastPressure = pressure;
		
		return isDrawing;
	}
	//p.brushMoveOnEvent = function(e) {e = p.eventGetCoords(e); p.brushMove(e[0], e[1], getPressure());}
	function end() {
		if (!isDrawing) return false;
		
		if (isHistoryEnabled && paint.historyEnabled) //вдруг у paint'а история успела отключиться
			paint.history.add(new BrushHistoryStep(paint, getParams(), path));
			//this.history.addPath(this.layer,[this.getParams(),this.path],this.brushGetTotalRadius());
		
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
			"mode": mode
		}
	}
	//восстановление параметров из массива
	function setParams(params) {
		b.size = params.size;
		b.blur = params.blur;
		step = params.step;
		b.color = params.color;
		//b.shape = params.shape;
		//b.mode = params.moed;
	}
	
	b.modes = ["brush", "eraser"];
	Object.defineProperty(b, "mode", {
		//get: function() {return mode;}
		set: function(new_mode) {
			blendMode = new_mode == "eraser" ? BLEND_MODE_ERASER : BLEND_MODE_NORMAL;
		}
	});
	
	var w = paint.SimpleEventWrapper;
	var events = {
		'mousedown': [ canvas,   w.wrap(0,"start","cancel", w.COORDS | w.PRESSURE | w.PREVENT | w.UPDATE_TIME) ],
		'mousemove': [ document, w.wrap(0,"move", "cancel", w.COORDS | w.PRESSURE) ],
		'mouseup':   [ document, w.wrap(0,"end",  "cancel") ],
		'touchstart': [ canvas,   w.wrap(1,"start","cancel", w.COORDS | w.PRESSURE | w.PREVENT | w.UPDATE_TIME) ],
		'touchmove':  [ document, w.wrap(1,"move", "cancel", w.COORDS | w.PRESSURE) ],
		'touchend':   [ document, w.wrap(1,"end",  "cancel") ],
		'mousewheel':     [ canvas, function(e) {p.brushSizeAdd( e.wheelDelta/120); e.preventDefault();}],
		'DOMMouseScroll': [ canvas, function(e) {p.brushSizeAdd(-e.detail        ); e.preventDefault();}]
	};
	p.events = events;
}

function Picker(paint) {
	var p = this;
	var canvas = paint.canvas;
	var isDrawing = false;
	
	p.onColorPick = function(color) {log(color);} //каллбек. сработает при получении цвета пипеткой
	function pick(x,y) {
		var data = paint.canvas.rc.getImageData(x,y,2,2).data;
		p.onColorPick([data[0],data[1],data[2],data[3]]);
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
		return true;
	}
	
	p.modes = ["picker"];
	p.mode = "picker";
	
	var events = {
		'mousedown': [ canvas,   paint.wrap(0,"start","", true,false,true,true)],
		'mousemove': [ document, paint.wrap(0,"move", "", true) ],
		'mouseup':   [ document, paint.wrap(0,"end",  "") ],
		'touchstart': [ canvas,   paint.wrap(1,"start","", true,false,true,true)],
		'touchmove':  [ document, paint.wrap(1,"move", "", true) ],
		'touchend':   [ document, paint.wrap(1,"end",  "") ]
	};
	p.events = events;
}

function Merge(paint) {
	var m = this;
	m.mergeCurrentWith = function(layer_id) {
		throw new Error("Not yet.");
	}
	m.drawCurrentLayerOn = function(layer_id) {
		if (paint.historyEnabled)
			paint.history.add(new MergeHistoryStep(paint, paint.layer_id));
		paint.getLayerBuffer(layer_id).rc.drawImage(paint.getLayerBuffer(), 0,0);
		paint.refresh();
	}
}
