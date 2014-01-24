﻿//TODO: (test) buffer layers to one (what?)
//TODO: total radius to params
//TODO: do not redraw brush visual circle when restoring from history

//просто линия между точками
CanvasRenderingContext2D.prototype.line = function(x0,y0,x1,y1) {
	this.beginPath();
	this.moveTo(x0,y0);
	this.lineTo(x1,y1);
	this.stroke();
}
//просто круг с координатами и радиусом
CanvasRenderingContext2D.prototype.circle = function(x,y,r) {
	this.beginPath();
	this.arc(x,y, r, 0,3.1415927*2, false);
	this.stroke();
}

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
function Paint(canvas, wacom_plugin) {
	var p = this;
	var rc = canvas.getContext("2d");
	canvas.rc = rc;
	p.canvas = canvas;
	p.canvas_pos = getPos(canvas);
	//p.eventGetCoords=function(e) {return [e.clientX-this.canvas_pos[0], e.clientY-this.canvas_pos[1]];}
	var width = canvas.width;
	var height = canvas.height;
	var buffer = createBuffer(p.width,p.height);
	
	//ищем апишечку Bamboo'шечки
	var penAPI;
	if (wacom_plugin && (penAPI = wacom_plugin.penAPI)) //нашли
		p.getPressure = function() {if (penAPI.pointerType!=0) return penAPI.pressure; else return 1.0;}
	else //не нашли
		p.getPressure = function() {return Math.pow(Math.min(1, (new Date().getTime()-p.event_start_time)/100), 0.5)+0.05;}
	
	
	//параметры и методы слоёв
	var layer = []; //массив слоёв (объектов canvas)
	var layer_obj = []; //некий привязанный к слою объект
	var layer_numb = 4; //количество слоёв
	for (var i=0;i<p.layer_numb;i++) //каждому слою по буфферу
		layer.push(createBuffer(p.width,p.height));
	var layer_cur = 0; //текущий
	function getLayerBuffer(id) {//возвращает буффер указанного слоя (текущий по умолчанию)
		if (id === undefined) return this.layer[this.layer_cur];
		//if (id<0 || id>=this.layer_numb) return null;
		return this.layer[id];
	}
	function setLayer(id) { //переключается на слой, устанавливает ему параметры
		id = toRange(0, id, layer_numb-1);
		if (id == layer_cur) return;
		
		var obj = layer_obj[layer_cur];
		if (obj !== undefined) {
			toolSet(p.TOOL_BRUSH);
			obj.disconnect(canvas);
		}
		obj = layer_obj[id];
		if (obj !== undefined) {
			toolDisconnect();
			obj.connect(canvas);
		}
		
		layer_cur = id;
	}
	function setLayerObj(id, obj) {
		layer_obj[id] = obj;
	}
	
	p.autoUpdate = true;//автоматическая перерисовка при рисовании чего-то (отключается при восстановлении из истории)
	//обновляет всё (если указаны координаты, нарисуется кружок кисти)
	p.refresh = function(mouse_x,mouse_y) {
		this.refreshRegion(0,0,width,height,mouse_x,mouse_y);
	}
	//обновляет прямоугольную область
	p.refreshRegion = function(x,y,w,h,mouse_x,mouse_y) {
		this.rc.clearRect(x,y,w,h);
		//старая версия - все слои рисуются последовательно
		/*for (var i=0;i<=this.layer_cur;i++)//всё, что ниже временного слоя
			this.rc.drawImage(this.layer[i], x,y,w,h, x,y,w,h);
			
		this.rc.drawImage(this.buffer, x,y,w,h, x,y,w,h);//временный слой
		
		for (var i=this.layer_cur+1;i<this.layer_numb;i++)//всё, что выше временного
			this.rc.drawImage(this.layer[i], x,y,w,h, x,y,w,h);*/
		
		//новая версия. т.к. хитрые режимы смешивания (типа стёрки)
		//должны влиять на один конкретный слой,
		//сначала копируется этот самый (текущий) слой
		rc.globalCompositeOperation = "source-over";
		rc.drawImage(layer[layer_cur], x,y,w,h, x,y,w,h);
		//поверх него рисуется временный слой с текущим режимом смешивания
		rc.globalCompositeOperation = tools[tool_cur].blendMode;
		rc.drawImage(buffer, x,y,w,h, x,y,w,h);
		//под результат "подрисовываются" все слои, которые ниже
		rc.globalCompositeOperation = "destination-over";
		for (var i=layer_cur-1; i>=0; i--)
			rc.drawImage(layer[i], x,y,w,h, x,y,w,h);
		//и поверх, как и раньше, рисуются все слои, которые выше
		rc.globalCompositeOperation = "source-over";
		for (var i=layer_cur+1; i<layer_numb; i++)
			rc.drawImage(layer[i], x,y,w,h, x,y,w,h);
		
		if (mouse_x!==undefined && mouse_y!==undefined) {
			console.assert(false);
			var cursor = tools[tool_cur].cursor;
			//var d = this.brushBuffer.width*0.5;
			//this.rc.drawImage(this.brushBuffer,mouse_x-d,mouse_y-d);//кружок радиуса кисти
		}
	}
	//обновляет прямоугольную область, расширяемую радиусом. проверяет на выход за границы канваса
	p.refreshRegionCoords = function(x0,y0,x1,y1,r,mouse_x,mouse_y) {
		if (x0 < x1) {w = x1-x0;} else {w = x0-x1; x0 = x1;}
		if (y0 < y1) {h = y1-y0;} else {h = y0-y1; y0 = y1;}
		x0 = Math.floor(x0-r);
		y0 = Math.floor(y0-r);
		w = Math.ceil(w+r*2);
		h = Math.ceil(h+r*2);
		if (x0 < 0) x0 = 0;
		if (y0 < 0) y0 = 0;
		if (x0+w > width) w = width-x0;
		if (y0+h > height) h = height-y0;
		if (w<=0 || h<=0) return;
		this.refreshRegion(x0,y0,w,h,mouse_x,mouse_y);
	}
	
	p.refreshRect = new Rect();
	var frameDelta = 16; //ограничение кол-ва обновлений канваса в секунду (FPS = 1000/frameDelta)
	var lastFrameTime = 0; //время последнего обновления канваса
	
	function tryToUpdate() {
		var ct = new Date().getTime();
		if (ct-lastFrameTime > frameDelta) {
			var rect = p.refreshRect;
			p.refreshRegionCoords(rect.x0,rect.y0, rect.x1,rect.y1, r+2, x,y);
			rect.reset(x,y);
			lastFrameTime = ct;
		}
	}
	
	
	//события управления
	p.event_start_time = new Date().getTime(); //время начала события. пригодится
	p.SimpleEventWrapper = {
		COORDS: 1,
		PRESSURE: 2,
		PREVENT: 4,
		UPDATE_TIME: 8,
		wrap: function(type, func, cancel_func, flags) {
			var coords      = flags & this.COORDS;
			var pressure    = flags & this.PRESSURE;
			var prevent     = flags & this.PREVENT;
			var update_time = flags & this.UPDATE_TIME;
			return new Function("p",
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
	p.handlersConnect = function(event_list) {
		for (var i in event_list)
			//log(event_list[i][1]);
			event_list[i][0].addEventListener(i, event_list[i][1], false);
	}
	//отключение событий
	p.handlersDisconnect = function(event_list) {
		for (var i in event_list)
			event_list[i][0].removeEventListener(i, event_list[i][1], false);
	}
	
	
	//TODO: большое: вынести кисточку и пипетку в отдельные объекты
	//      todoing...
	//тулзы
	p.tools = {};//{"режим": <объект, реализующий режим>}
	var tool = null;
	p.toolsAdd = function(obj) {
		var modes = obj.modes;
		for (var i=0; i<modes.length; i++)
			tools[modes[i]] = obj;
	}
	
	
	//устанавливает инстумент
	p.toolSet = function(tool) {
		if (!(tool in this.tools)) return;//TODO: неправильная проверка. либо заменить [] на {}, либо проверять нормально
		                                  //хотя почему? вроде норм
		
		var group = this.tools[tool][0];
		if (group != this.tools_cur_group) { //группа поменялась? перключаем обработчики
			this.handlersDisconnect(this.tools_events[this.tools_cur_group]);
			this.handlersConnect(this.tools_events[group]);
			this.tools_cur_group=group;
		}
		
		var func = this.tools[tool][1];
		if (func) func(); //если функция переключения есть, вызываем
	}
	p.toolDisconnect = function() {
		if (this.tools_cur_group == -1) return;
		this.handlersDisconnect(this.tools_events[this.tools_cur_group]);
		this.tools_cur_group = -1;
	}
	
	
	p.merge = function(src_buf_id) {
		if (this.historyEnabled)
			this.history.addMerge(this.layer,this.layer_cur,src_buf_id);
		this.layer[this.layer_cur].rc.drawImage(this.layer[src_buf_id], 0,0);
		this.refresh();
	}
	
	
	p.undo = function() {
		if (!historyEnabled) return;
		history.undo(this.layer);
		refresh();
	}
	p.redo = function() {
		if (!historyEnabled) return;
		history.redo();
		refresh();
	}
	p.redoAll = function(forceLayer) {
		if (!historyEnabled) return;
		while (this.history.redo(forceLayer)) {};
		this.refresh();
	}
	//rc.globalCompositeOperation = Math.random()>0.5?"source-over":"destination-out";
	//вызываемая извне(например, из истории) функция, отрисовывающая путь
	//путь - [[слой,размер,блюр,полный радиус,шаг,цвет,форма,режим],[x0,y0,p0, x1,y1,p1, ...]]
	p.onRestorePath = function(path) {
		var _p = this.getParams();
		this.setParams(path[0]);
		path = path[1];
		
		this.historyEnabled = false;
		this.autoUpdate = false;
		this.brushStart(path[0],path[1],path[2]);
		for (var i=3; i<path.length; i+=3) {
			this.brushMove(path[i],path[i+1],path[i+2]);
		}
		this.brushEnd();
		this.setParams(_p);
		this.historyEnabled = true;
		this.autoUpdate = true;
		
		this.refresh();
	}
	p.onRestoreMerge = function(dest_buf_id,src_buf_id) {
		this.historyEnabled = false;
		var t = this.layer_cur;
		this.layer_cur = dest_buf_id;
		
		this.merge(src_buf_id);
		
		this.layer_cur = t;
		this.historyEnabled = true;
		
		this.refresh();
	}
	
	
	
	p.kbdEvent = function(e) {
		switch (e.keyCode) {
		case 90: //'Z'
			p.undo();
			e.preventDefault();
			break;
		case 89: //'Y'
			p.redo();
			e.preventDefault();
			break;
		default:
			if (e.keyCode>=48 && e.keyCode<=57) { //'0' - '9'
				p.brushSetAlpha((e.keyCode-47)*0.1);
				e.preventDefault();
			}
		}
	}
	p.connect = function() {
		document.addEventListener('keyup', p.kbdEvent, false);
	}
	p.disconnect = function() {
		p.toolDisconnect();
		document.removeEventListener('keyup', p.kbdEvent, false);
	}
	
	
	p.historyEnabled = true;
	p.history = new History(p);
	
	p.brushSetSize(2);
	p.setLayer(0);
	p.brushSpriteUpdate();
	p.toolSet(p.TOOL_BRUSH);
	
	p.connect();
}
