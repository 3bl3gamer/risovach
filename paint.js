﻿//TODO: (test) buffer layers to one (what?)
//TODO: рисуется всё через временный слой, а восстанавливается сразу на нужный
//      теоретически можно огрести проблем и расхождений;
//      проверить, насколько медленнее будет восстановление через временный слой
//TODO: вынести цветоманипуляции в отдельный файл (а м.б. и нет)
//TODO: разобраться с onToolChange, onLayerChange, onStart и т.д. (мб их наследовать от прототипа)
//TODO: canvas_pos x y
//TODO: разобраться со всякими disconnect и слушателями хоткеев (последние вынести наружу)


function toRange(a, x, b) {
	return x<a ? a : x>b ? b : x;
}

//создаёт канвас. работает как буффер для рисования
function createBuffer(w, h) {
	h || (h=w);//если не указан 2й параметр,
	           //делаем квадратный
	var buffer = document.createElement('canvas');
	buffer.rc = buffer.getContext("2d");
	buffer.width = w;
	buffer.height = h;
	return buffer;
}

//прямоугольник
function Rect() {
	this.clear = function() {
		this.x0 =+ Infinity;//(x0,y0)----*
		this.y0 =+ Infinity;//   |       |
		this.x1 =- Infinity;//   |       |
		this.y1 =- Infinity;//   *----(x1,y1)
	}
	this.reset = function(x,y) {
		this.x0 = x;
		this.x1 = x;
		this.y0 = y;
		this.y1 = y;
	}
	this.reset_r = function(x,y,r) {
		this.x0 = x-r;
		this.x1 = x+r;
		this.y0 = y-r;
		this.y1 = y+r;
	}
	this.extend = function(x,y) {
		if (this.x0>x) this.x0 = x;
		if (this.x1<x) this.x1 = x;
		if (this.y0>y) this.y0 = y;
		if (this.y1<y) this.y1 = y;
	}
	this.extend_r = function(x,y,r) {
		if (this.x0>x-r) this.x0 = x-r;
		if (this.x1<x+r) this.x1 = x+r;
		if (this.y0>y-r) this.y0 = y-r;
		if (this.y1<y+r) this.y1 = y+r;
	}
	
	this.clear();
}


//создаёт объект рисовальщика, завязан на canvas'е
function Paint(canvas, opts) {
	var p = this;
	var rc = canvas.getContext("2d");
	canvas.rc = rc;
	p.canvas = canvas;
	p.canvas_pos = getPos(canvas);
	//p.eventGetCoords=function(e) {return [e.clientX-this.canvas_pos[0], e.clientY-this.canvas_pos[1]];}
	var width = canvas.width;
	var height = canvas.height;
	var buffer = createBuffer(width, height);
	Object.defineProperty(p, "buffer", {
		get: function() {return buffer;}
	});
	
	//ищем апишечку Bamboo'шечки
	var penAPI;
	if (opts.wacom_plugin && (penAPI = opts.wacom_plugin.penAPI)) //нашли
		p.getPressure = function() {if (penAPI.pointerType!=0) return penAPI.pressure; else return 1.0;}
	else //не нашли
		p.getPressure = function() {return Math.pow(Math.min(1, (new Date().getTime()-p.event_start_time)/100), 0.5)+0.05;}
	
	
	//параметры и методы слоёв
	var layers = []; //массив слоёв (объектов canvas)
	var layer_numb = opts.layer_numb || 4; //количество слоёв
	for (var i=0;i<layer_numb;i++) //каждому слою по буфферу
		layers.push(createBuffer(width, height));
	var layer_id_cur = 0; //текущий
	
	function getLayerBuffer(id) {//возвращает буффер указанного слоя (текущий по умолчанию)
		if (id === undefined) return layers[layer_id_cur];
		if (id<0 || id>=layer_numb) throw new Error("Wrong layer id.");
		return layers[id];
	}
	p.getLayerBuffer = getLayerBuffer;
	p.forEachLayer = function(fn) {
		for (var i=0; i<layers.length; i++)
			fn(i, layers[i]);
	}
	Object.defineProperty(p, "layer_numb", {
		get: function() {return layer_numb;}
	});
	Object.defineProperty(p, "layer_id", {
		get: function() {return layer_id_cur;},
		set: function(id) {
				id = toRange(0, id, layer_numb-1);
				if (id == layer_id_cur) return;
				if (tool && tool.onLayerChange) tool.onLayerChange(layer_id_cur, id);
				if (opts.onLayerChange) opts.onLayerChange(layer_id_cur, id);
				
				layer_id_cur = id;
			}
	});
	
	//обновляет всё (если указаны координаты, нарисуется кружок кисти)
	p.refresh = function(mouse_x,mouse_y) {
		this.refreshRegion(0,0,width,height,mouse_x,mouse_y);
	}
	//обновляет прямоугольную область
	p.refreshRegion = function(x,y,w,h,mouse_x,mouse_y) {
		rc.clearRect(x,y,w,h);
		
		//т.к. хитрые режимы смешивания (типа стёрки)
		//должны влиять на один конкретный слой,
		//сначала копируется этот самый (текущий) слой
		rc.globalCompositeOperation = "source-over";
		rc.drawImage(layers[layer_id_cur], x,y,w,h, x,y,w,h);
		//поверх него рисуется временный слой с текущим режимом смешивания
		rc.globalCompositeOperation = (tool && tool.blendMode) || "source-over";
		rc.drawImage(buffer, x,y,w,h, x,y,w,h);
		//под результат "подрисовываются" все слои, которые ниже
		rc.globalCompositeOperation = "destination-over";
		for (var i=layer_id_cur-1; i>=0; i--)
			rc.drawImage(layers[i], x,y,w,h, x,y,w,h);
		//и поверх, как и раньше, рисуются все слои, которые выше
		rc.globalCompositeOperation = "source-over";
		for (var i=layer_id_cur+1; i<layer_numb; i++)
			rc.drawImage(layers[i], x,y,w,h, x,y,w,h);
		
		if (mouse_x!==undefined && mouse_y!==undefined && tool) {
			var cursor = tool.cursor;
			if (cursor)
				rc.drawImage(cursor.img, mouse_x-cursor.xo, mouse_y-cursor.yo);
		}
	}
	//обновляет прямоугольную область. проверяет на выход за границы канваса
	p.refreshRegionCoords = function(x0,y0,x1,y1, mouse_x,mouse_y) {
		var w, h;
		if (x0 < x1) {w = x1-x0;} else {w = x0-x1; x0 = x1;}
		if (y0 < y1) {h = y1-y0;} else {h = y0-y1; y0 = y1;}
		x0 = x0 < 0 ? 0 : Math.floor(x0);
		y0 = y0 < 0 ? 0 : Math.floor(y0);
		w = x0+w > width ? width-x0 : Math.ceil(w);
		h = y0+h > height ? height-y0 : Math.ceil(h);
		if (w<=0 || h<=0) return;
		this.refreshRegion(x0,y0,w,h,mouse_x,mouse_y);
	}
	//обновляет прямоугольную область, расширяемую радиусом. проверяет на выход за границы канваса
	p.refreshRegionCoordsRadius = function(x0,y0,x1,y1,r, mouse_x,mouse_y) {
		this.refreshRegionCoords(x0-r, y0-r, x1+r, y1+r, mouse_x, mouse_y);
	}
	
	p.refreshRect = new Rect();
	var frameDelta = 16; //ограничение кол-ва обновлений канваса в секунду (FPS = 1000/frameDelta)
	var lastFrameTime = 0; //время последнего обновления канваса
	
	p.tryToUpdate = function(mouse_x,mouse_y) {
		var ct = new Date().getTime();
		if (ct-lastFrameTime > frameDelta) {
			var rect = p.refreshRect;
			p.refreshRegionCoords(rect.x0,rect.y0, rect.x1,rect.y1, mouse_x,mouse_y);
			rect.clear();
			lastFrameTime = ct;
			return true;
		}
		return false;
	}
	
	
	//события управления
	p.event_start_time = new Date().getTime(); //время начала события. пригодится
	p.SimpleEventWrapper = {
		COORDS: 1,
		PRESSURE: 2,
		PREVENT: 4,
		UPDATE_TIME: 8,
		wrap: function(tool, type, func, cancel_func, flags) {
			var coords      = flags & this.COORDS;
			var pressure    = flags & this.PRESSURE;
			var prevent     = flags & this.PREVENT;
			var update_time = flags & this.UPDATE_TIME;
			return new Function("p", "tool",
				 "return function(e) {"
				+(update_time?"p.event_start_time = new Date().getTime();":"")
				+(type == 0
					? (pressure?"var pr = p.getPressure();":"")
					 +(coords?"var t = e;":"")
					: "if (e.touches.length>1||(e.touches.length==1 && e.touches[0].identifier!=0))"
					 +"{"+(cancel_func?"tool."+cancel_func+"();":"")+"return;}"
					 +(coords||pressure?"var t = e.touches[0];":"")
					 +(pressure?"var pr = t.webkitForce; pr = pr===undefined ? 1 : pr>1?1:pr<0?0:pr;":"")
				 )
				+(coords?"var x = t.clientX-p.canvas_pos[0]+document.body.scrollLeft;"
				+        "var y = t.clientY-p.canvas_pos[1]+document.body.scrollTop;":"")
				//+"p."+func+"("+(coords?pressure?"x,y,pr":"x,y":pressure?"pr":"")+");"
				//+(prevent?"e.preventDefault();":"")
				+"if (tool."+func+"("+(coords?pressure?"x,y,pr":"x,y":pressure?"pr":"")+"))"
				+" e.preventDefault();"
				+"}"
			)(p, tool);
		}
	};
	
	
	//подключение событий
	function handlersConnect(event_list) {
		for (var i in event_list)
			//log(event_list[i][1]);
			event_list[i][0].addEventListener(i, event_list[i][1], false);
	}
	//отключение событий
	function handlersDisconnect(event_list) {
		for (var i in event_list)
			event_list[i][0].removeEventListener(i, event_list[i][1], false);
	}
	
	
	//тулзы
	//var nullTool = {events:[], modes:["dev-null"], mode:"dev-null"}; //заглушка, чтоб не писать везде if (tool)
	var tools = {};//{"режим": <объект, реализующий режим>}
	var tool = null;
	var pushedTool = null;
	//toolsAdd(nullTool);
	//toolSet(nullTool.mode);
	p.toolAdd = function(name, obj) {
		tools[name] = obj;
	}
	//устанавливает инструмент
	function toolSet(newTool) {
		if (tool) {
			pushedTool = tool;
			if (tool.onToolChange) tool.onToolChange(tool, newTool);
			handlersDisconnect(tool.events);
		}
		handlersConnect(newTool.events);
		if (newTool.onStart) newTool.onStart();
		tool = newTool;
	}
	p.toolSet = function(name) {
		if (!(name in tools)) {
			console.warn("No tool named <"+name+">"); //DEBUG
			console.log(name)
			return;
		}
		toolSet(tools[name]);
	}
	p.toolDisconnect = function() {
		handlersDisconnect(tool.events);
		tool = null;
	}
	p.toolUsePrevious = function() {
		if (!pushedTool || pushedTool===tool) return;
		toolSet(pushedTool);
	}
	
	
	p.history = new History(p);
	p.applyBuffer = function() {
		var lrc = this.getLayerBuffer().rc;
		if (tool.blendMode)
			lrc.globalCompositeOperation = tool.blendMode;
		lrc.drawImage(buffer,0,0);//TODO: draw only changed
		lrc.globalCompositeOperation = "source-over";
		this.buffer.rc.clearRect(0,0,buffer.width,buffer.height);
	}
	
	p.undo = function() {
		this.history.undo();
		this.refresh(); //TODO: only updated
	}
	p.redo = function() {
		this.history.redo();
		this.refresh(); //TODO: only updated
	}
	p.redoAll = function(forceLayer) {
		while (this.history.redo(forceLayer)) {};
		this.refresh();
	}
	p.canRedo = function() {
		return this.history.canRedo();
	}
	p.history.onStateUpdate = function(eventName) {
		if (p.onHistoryStateUpdate) p.onHistoryStateUpdate(eventName);
	}
	
	
	p.kbdEvent = function(e) {
		switch (e.keyCode) {
		case 90: //'Z'
			// p.undo();
			// e.preventDefault();
			break;
		case 89: //'Y'
			// p.redo();
			// e.preventDefault();
			break;
		default:
			// if (e.keyCode>=48 && e.keyCode<=57) { //'0' - '9'
			// 	p.brushSetAlpha((e.keyCode-47)*0.1);
			// 	e.preventDefault();
			// }
		}
	}
	p.connect = function() {
		//document.addEventListener('keyup', p.kbdEvent, false);
	}
	p.disconnect = function() {
		p.toolDisconnect();
		//document.removeEventListener('keyup', p.kbdEvent, false);
	}
	
	p.connect();
}
