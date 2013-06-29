//TODO: (test) buffer layers to one (what?)
//TODO: total radius to params
//TODO: do not redraw brush visual circle when restoring from history

//создаёт канвас. работает как буффер для рисования
function createBuffer(w, h) {
	h || (h=w);//если не указан 2й параметр,
	           //делаем квадратный
	var buffer = document.createElement('canvas');
	buffer.rc=buffer.getContext("2d");
	buffer.width = w;
	buffer.height = h;
	return buffer;
}

//прямоугольник
function Rect() {
	this.clear=function() {
		this.x0=+Infinity;//(x0,y0)----*
		this.y0=+Infinity;//   |       |
		this.x1=-Infinity;//   |       |
		this.y1=-Infinity;//   *----(x1,y1)
	}
	this.reset=function(x,y) {
		this.x0=x;
		this.x1=x;
		this.y0=y;
		this.y1=y;
	}
	this.reset_r=function(x,y,r) {
		this.x0=x-r;
		this.x1=x+r;
		this.y0=y-r;
		this.y1=y+r;
	}
	this.extend=function(x,y) {
		if (this.x0>x) this.x0=x;
		if (this.x1<x) this.x1=x;
		if (this.y0>y) this.y0=y;
		if (this.y1<y) this.y1=y;
	}
	this.extend_r=function(x,y,r) {
		if (this.x0>x-r) this.x0=x-r;
		if (this.x1<x+r) this.x1=x+r;
		if (this.y0>y-r) this.y0=y-r;
		if (this.y1<y+r) this.y1=y+r;
	}
	
	this.clear();
	//if (arr)
	//	for (var i=0;i<arr.length;i+=2)
	//		this.extend(arr[i],arr[i+1]);
	return this;
}


//создаёт объект рисовальщика, завязан на canvas'е
function Paint(canvas, wacom_plugin) {
	var p=this;
	p.rc=canvas.getContext("2d");
	p.canvas_pos=getPos(canvas);
	//p.eventGetCoords=function(e) {return [e.clientX-this.canvas_pos[0], e.clientY-this.canvas_pos[1]];}
	p.width=canvas.width;
	p.height=canvas.height;
	p.buffer=createBuffer(p.width,p.height);
	
	//ищем апишечку Bamboo'шечки
	var penAPI;
	if (wacom_plugin && (penAPI = wacom_plugin.penAPI)) //нашли
		p.getPressure=function() {if (penAPI.pointerType!=0) return penAPI.pressure; else return 1.0;}
	else //не нашли
		p.getPressure=function() {return Math.pow(Math.min(1, (new Date().getTime()-p.event_start_time)/100), 0.5)+0.05;}
	
	
	//просто линия между точками
	p.line=function(rc,x0,y0,x1,y1) {
		rc.beginPath();
		rc.moveTo(x0,y0);
		rc.lineTo(x1,y1);
		rc.stroke();
	}
	//просто круг с координатами и радиусом
	p.circle=function(rc,x,y,r) {
		rc.beginPath();
		rc.arc(x,y, r, 0,3.1415927*2, false);
		rc.stroke();
	}
	
	
	
	//параметры и методы кисти
	p.brushColor=['#000000',1];
	p.brushSetColor=function(c) {
		this.brushColor[0]=c;
		this.brushSpriteUpdate();
	}
	p.brushGetColor=function() {
		return this.brushColor[0];
	}
	p.brushSetAlpha=function(a) {
		this.brushColor[1]=a;
	}
	p.brushSize=0; //радиус
	p.brushSizeMax=16;
	p.brushBlur=1/32;
	p.brushBlurMax=1;
	p.brushStep=2;
	p.brushBuffer=createBuffer(p.brushSizeMax*2+4);
	//p.brushSpriteBlurStretch=1.25;//на сколько увеличивается bounding box кисти при увеличении блюра на 1 (с запасом)
	p.brushSpriteSizeStep=2;//2->   1,2,  4,      8,    16
	p.brushSprite=[];       //2-> 1,1,2,4,4,8,8,8,8,...
	//полный радиус кисти. по сути - ребро bounding box'а пополам
	p.brushGetTotalRadius=function(radius) {
		//return (radius!==undefined?radius:this.brushSize)*0.5+Math.max(this.brushBlur*this.brushSpriteBlurStretch,2);
		return (radius!==undefined?radius:this.brushSize)*(1+this.brushBlur);
	}
	//перерисовываем спрайт кисти
	p.brushSpriteUpdate=function() {
		var dx = this.brushGetTotalRadius(this.brushSizeMax);
		var buf = createBuffer((dx*2)<<0);
		var brc = buf.rc;
		
		//brc.strokeRect(0,0,buf.width,buf.height);
		
		brc.shadowBlur = this.brushBlur*this.brushSizeMax;
		brc.shadowOffsetX = dx*3;
		brc.shadowColor = this.brushColor[0];
		
		brc.beginPath();
		brc.arc(dx-brc.shadowOffsetX,dx, this.brushSizeMax, 0,3.1415927*2, false);
		brc.fill();
		
		buf.cur_width = dx*2; //ширина для текущего содержимого
		buf.cur_size = this.brushSizeMax; //радиус текущего содержимого
		
		var ds = 1/this.brushSpriteSizeStep;
		
		var size = this.brushSizeMax*ds;
		for (var i=size+1; i<=this.brushSizeMax; i++)
			this.brushSprite[i] = buf;
		
		while (size>0.99) {
			var cdx = this.brushGetTotalRadius(size);
			var cbuf = createBuffer((cdx*2)<<0);
			cbuf.rc.drawImage(buf, 0,0, cdx*2,cdx*2);
			cbuf.cur_width = cdx*2; //ширина для текущего содержимого
			cbuf.cur_size = size; //радиус текущего содержимого
			buf = cbuf;
			dx = cdx;
			var next_size = size*ds;
			for (var i=next_size+1; i<=size; i++)
				this.brushSprite[i] = cbuf;
			size = next_size;
		}
		this.brushSprite[0] = this.brushSprite[1] = this.brushSprite[2];
		for (var i=0;i<=this.brushSizeMax;i++) {
			if (this.brushSprite[i]) document.body.appendChild(this.brushSprite[i]);
			//this.brushSprite[i]=buf;
			log(i+": "+(this.brushSprite[i]?this.brushSprite[i].cur_size:-1));
		}
		
		log("Sprite updated");
	}
	//меняет силу разблюра
	p.brushSetBlur=function(blur) {
		if (this.brushBlur=blur) return;
		if (blur>this.brushBlurMax) blur=this.brushBlurMax;
		if (blur<0) blur=0;
		this.brushBlur=blur;
		this.brushSpriteUpdate();
	}
	//устанавливает силу разблюра
	p.brushGetBlur=function() {
		return this.brushBlur;
	}
	//устанавливает размер кисти
	p.brushSetSize=function(size, hidden) {
		if (size>this.brushSizeMax) size=this.brushSizeMax;
		if (size<1) size=1;
		this.brushSize=size;
		//this.getLayerBuffer().rc.lineWidth=size;//зачем это здесь?
		
		if (!hidden) {
			//рисуем кружок кисти в буффер, потом будет рисовать этот буффер под мышкой
			//отрисовка буффера проходит быстрее, чем отрисовка 2х кругов, в ~10 раз
			var buf=this.brushBuffer, brc=buf.rc;
			brc.clearRect(0,0,buf.width,buf.height);
			
			brc.strokeStyle="white";
			brc.lineWidth=3;
			this.circle(brc, buf.width*0.5,buf.height*0.5, size);
			
			brc.strokeStyle="black";
			brc.lineWidth=1;
			this.circle(brc, buf.width*0.5,buf.height*0.5, size);
		}
		
		//this.brushSpriteUpdate();
	}
	//возвращает размер кисти
	p.brushGetSize=function() {
		return this.brushSize;
	}
	//добавляет d к размеру кисти. d может быть отрицательным
	p.brushSizeAdd=function(d) {
		this.brushSetSize(this.brushSize+d);
	}
	
	
	//рисует линию спрайтом
	p.brushLine=function(x0,y0,x1,y1,p0,p1) {
		var rc=this.buffer.rc;
		rc.globalAlpha=this.brushColor[1];
		var d=this.brushGetTotalRadius(), dr;
		var d2=d*2, d2r;
		//x0-=d; y0-=d; x1-=d; y1-=d;
		var s;
		var k, dx=x1-x0, dy=y1-y0, len=Math.sqrt(dx*dx+dy*dy), dp=p1-p0,
			adx=Math.abs(dx), ady=Math.abs(dy);
		var modifyer=this.brushStep/len;
		dx*=modifyer;
		dy*=modifyer;
		dp*=modifyer;
		var cx=x0,cy=y0,cp=p0;
		var i;
		for (i=0; i<len-0.001; i+=this.brushStep) {
			var size=this.brushSize*cp;
			var buf=this.brushSprite[size<<0];
			var src_w=buf.width, dest_w=src_w*size/buf.cur_size;
			rc.drawImage(buf,
			             0,0, src_w,src_w,
			             cx-dest_w/2,cy-dest_w/2, dest_w,dest_w);
			cx+=dx;
			cy+=dy;
			cp+=dp;
		}
		rc.globalAlpha=1;
		i-=this.brushStep;
		//log(len+"\t"+i+"\t="+(len-i));
		return len-i;
	}
	//рисует точку спрайтом
	p.brushDot=function(x,y,pressure) {
		var rc=this.buffer.rc;
		rc.globalAlpha=this.brushColor[1];
		var size=this.brushSize*pressure;
		var buf=this.brushSprite[size<<0];
		var src_w=buf.width, dest_w=src_w*size/buf.cur_size;
		rc.drawImage(buf,
		             0,0, src_w,src_w,
		             x-dest_w/2,y-dest_w/2, dest_w,dest_w);
		rc.globalAlpha=1;
	}
	
	
	
	//параметры и методы слоёв
	p.layer=[];//массив слоёв (объектов canvas)
	p.layer_numb=4;//количество слоёв
	for (var i=0;i<p.layer_numb;i++)//каждому слою по буфферу
		p.layer.push(createBuffer(p.width,p.height));
	p.layer_cur=0;//текущий
	p.getLayerBuffer=function(id) {//возвращает буффер узананного слоя (текущий по умолчанию)
		if (id===undefined) return this.layer[this.layer_cur];
		//if (id<0 || id>=this.layer_numb) return null;
		return this.layer[id];
	}
	p.setLayer=function(id) {//переключается на слой, устанавливает ему параметры
		if (id>=this.layer_numb) id=this.layer_numb-1;
		if (id<0) id=0;
		this.layer_cur=id;
	}
	
	p.autoUpdate=true;//автоматическая перерисовка при рисовании чего-то (отключается при восстановлении из истории)
	//обновляет всё (если указаны координаты, нарисуется кружок кисти)
	p.refresh=function(mouse_x,mouse_y) {
		this.refreshRegion(0,0,this.width,this.height,mouse_x,mouse_y);
	}
	//обновляет прямоугольную область
	p.refreshRegion=function(x,y,w,h,mouse_x,mouse_y) {
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
		this.rc.globalCompositeOperation=this.BRUSH_MODE_NORMAL;
		this.rc.drawImage(this.layer[this.layer_cur], x,y,w,h, x,y,w,h);
		//поверх него рисуется временный слой с текущим режимом смешивания
		this.rc.globalCompositeOperation=this.brushMode;
		this.rc.drawImage(this.buffer, x,y,w,h, x,y,w,h);
		//под результат "подрисовываются" все слои, которые ниже
		this.rc.globalCompositeOperation="destination-over";
		for (var i=this.layer_cur-1;i>=0;i--)
			this.rc.drawImage(this.layer[i], x,y,w,h, x,y,w,h);
		//и поверх, как и раньше, рисуются все слои, которые выше
		this.rc.globalCompositeOperation=this.BRUSH_MODE_NORMAL;
		for (var i=this.layer_cur+1;i<this.layer_numb;i++)
			this.rc.drawImage(this.layer[i], x,y,w,h, x,y,w,h);
		
		if (mouse_x!==undefined && mouse_y!==undefined) {
			var d=this.brushBuffer.width*0.5;
			this.rc.drawImage(this.brushBuffer,mouse_x-d,mouse_y-d);//кружок радиуса кисти
		}
	}
	//обновляет прямоугольную область, расширяемую радиусом. проверяет на выход за границы канваса
	p.refreshRegionCoords=function(x0,y0,x1,y1,r,mouse_x,mouse_y) {
		if (x0<x1) {w=x1-x0;} else {w=x0-x1; x0=x1;}
		if (y0<y1) {h=y1-y0;} else {h=y0-y1; y0=y1;}
		x0=Math.floor(x0-r);
		y0=Math.floor(y0-r);
		w=Math.ceil(w+r*2);
		h=Math.ceil(h+r*2);
		if (x0<0) x0=0;
		if (y0<0) y0=0;
		if (x0+w>this.width) w=this.width-x0;
		if (y0+h>this.height) h=this.height-y0;
		if (w<=0 || h<=0) return;
		this.refreshRegion(x0,y0,w,h,mouse_x,mouse_y);
	}
	
	p.brushLeft=0;//через сколько пикселов начинать новый отрезок
	p.lastX=0;//TODO: use path | or not
	p.lastY=0;
	p.lastPressure=1;
	p.refreshRect=new Rect();
	p.isDrawing=false;//идёт ли сейчас рисование}
	p.path=[];//путь (или полоса). массив вида [x0,y0,pressure0, x1,y1,pressure1, ...]
	p.params=[];//параметры [слой,размер,блюр,шаг,цвет,форма]
	p.frameDelta=16;//ограничение кол-ва обновлений канваса в секунду (FPS=1000/frameDelta)
	p.lastFrameTime=0;//время последнего обновления канваса
	
	//начало рисования штриха
	p.brushStart=function(x,y,pressure) {
		if (this.isDrawing) return false;
		
		if (this.historyEnabled) {
			this.params=this.getParams();
			this.path=[x,y,pressure];
		}
		
		this.brushDot(x,y,pressure);
		this.brushLeft=this.brushStep;
		this.isDrawing=true;
		if (this.autoUpdate) {
			//document.addEventListener('mousemove', this.brushMoveOnEvent);
			var r=this.brushGetTotalRadius();
			this.refreshRegionCoords(x,y, x,y, r,x,y);
			this.refreshRect.reset(x,y,r);
			this.lastFrameTime=new Date().getTime();
		}
		this.lastX=x;
		this.lastY=y;
		this.lastPressure=pressure;
		
		this.getLayerBuffer().rc.globalCompositeOperation=this.brushMode;
		
		return true;
	}
	//отмена текущего штриха (например, при касании вторым пальцем)
	p.brushCancel=function() {
		if (!this.isDrawing) return false;
		this.buffer.rc.clearRect(0,0,this.buffer.width,this.buffer.height);
		this.isDrawing=false;
		return true;
	}
	//шаг рисования
	p.brushMove=function(x,y,pressure) {
		if (this.isDrawing) {
			if (this.historyEnabled)
				this.path.push(x,y,pressure);
			
			var dx=x-this.lastX, dy=y-this.lastY, len=Math.sqrt(dx*dx+dy*dy), dp;
			//console.log("START len: "+len+" left:"+this.brushLeft+
			//            "("+this.lastX+","+this.lastY+") - ("+x+","+y+")");
			if (len>this.brushLeft) {
				dx*=this.brushLeft/len;
				dy*=this.brushLeft/len;
				dp=(pressure-this.lastPressure)*this.brushLeft/len;
				this.brushLeft = this.brushStep-this.brushLine(
					this.lastX+dx,this.lastY+dy, x,y, this.lastPressure+dp,pressure);
				//this.brushStep-(len-this.brushLeft)%this.brushStep
				//console.log("line ("+(this.lastX+dx)+","+(this.lastY+dy)+")");
			} else if (len==this.brushLeft) {
				this.brushDot(x,y,pressure);
				this.brushLeft=this.brushStep;
				//console.log("dot");
			} else {
				this.brushLeft-=len;
				//console.log("skip");
			}
			//console.log("END len: "+len+" left: "+this.brushLeft);
		}
		if (this.autoUpdate) {
			var r=this.brushGetTotalRadius();
			var ct=new Date().getTime();
			this.refreshRect.extend(x,y);
			if (ct-this.lastFrameTime>this.frameDelta) {
				var rect=this.refreshRect;
				this.refreshRegionCoords(rect.x0,rect.y0, rect.x1,rect.y1, r+2, x,y);
				rect.reset(x,y);
				this.lastFrameTime=ct;
			}
		}
		this.lastX=x;
		this.lastY=y;
		this.lastPressure=pressure;
		
		return this.isDrawing;
	}
	//p.brushMoveOnEvent=function(e) {e=p.eventGetCoords(e); p.brushMove(e[0], e[1], getPressure());}
	p.brushEnd=function() {
		if (!this.isDrawing) return false;
		
		if (this.historyEnabled)
			this.history.addPath(this.layer,[this.getParams(),this.path],this.brushGetTotalRadius());
		
		this.getLayerBuffer().rc.drawImage(this.buffer,0,0);//TODO: draw only changed
		this.buffer.rc.clearRect(0,0,this.buffer.width,this.buffer.height);
		this.isDrawing=false;
		
		//for speed comparison
		/*var dt=new Date().getTime()-this.lastFrameTime;
		var l=0;
		for (var i=3;i<this.path.length;i+=3) {
			var dx=this.path[i]-this.path[i-3], dy=this.path[i+1]-this.path[i-2];
			l+=Math.sqrt(dx*dx+dy*dy);
		}
		return [l/dt,this.path.length/dt];*/
		return true;
	}
	
	
	p.BRUSH_MODE_NORMAL="source-over";
	p.BRUSH_MODE_ERASER="destination-out";
	p.brushMode=p.BRUSH_MODE_NORMAL;
	p.brushSetMode=function(mode) {
		this.brushMode=mode;
	}
	p.brushGetMode=function() {
		return this.brushMode;
	}
	
	
	
	//пипетка
	p.onColorPick=function(color) {log(color);} //каллбек. сработает при получении цвета пипеткой
	p.pickerPick=function(x,y) {
		var data=this.rc.getImageData(x,y,2,2).data;
		this.onColorPick([data[0],data[1],data[2],data[3]]);
	}
	p.pickerStart=function(x,y) {
		if (this.isDrawing) return false;
		this.isDrawing=true;
		this.pickerPick(x,y);
		return true;
	}
	p.pickerMove=function(x,y) {
		if (!this.isDrawing) return false;
		this.pickerPick(x,y);
		return true;
	}
	p.pickerEnd=function() {
		if (this.isDrawing) {
			this.isDrawing=false;
			return true;
		}
		return false;
	}
	
	//события управления
	p.event_start_time = new Date().getTime(); //время начала события. пригодится
	function wrap(type, func, cancel_func, coords, pressure, prevent, update_time) {
		return new Function("p",
			 "return function(e) {"
			+(update_time?"p.event_start_time = new Date().getTime();":"")
			+(type==0
				?(pressure?"var pr=p.getPressure();":"")
				+(coords?"var t=e;":"")
				:"if (e.touches.length>1||(e.touches.length==1&&e.touches[0].identifier!=0))"
				+"{"+(cancel_func?"p."+cancel_func+"();":"")+"return;}"
				+(coords|pressure?"var t=e.touches[0];":"")
				+(pressure?"var pr=t.webkitForce; pr=pr===undefined?1:pr>1?1:pr<0?0:pr;":"")
			 )
			+(coords?"var x=t.clientX-p.canvas_pos[0]+document.body.scrollLeft;"
			+        "var y=t.clientY-p.canvas_pos[1]+document.body.scrollTop;":"")
			//+"p."+func+"("+(coords?pressure?"x,y,pr":"x,y":pressure?"pr":"")+");"
			//+(prevent?"e.preventDefault();":"")
			+"if (p."+func+"("+(coords?pressure?"x,y,pr":"x,y":pressure?"pr":"")+"))"
			+" e.preventDefault();"
			+"}"
		)(p);
	}
	
	p.brushEvents ={'mousedown': [ canvas,   wrap(0,"brushStart","brushCancel", true,true,true,true) ],
	                'mousemove': [ document, wrap(0,"brushMove", "brushCancel", true,true) ],
	                'mouseup':   [ document, wrap(0,"brushEnd",  "brushCancel") ],
	                'touchstart': [ canvas,   wrap(1,"brushStart","brushCancel", true,true,true,true) ],
	                'touchmove':  [ document, wrap(1,"brushMove", "brushCancel", true,true) ],
	                'touchend':   [ document, wrap(1,"brushEnd",  "brushCancel")],
	                'mousewheel':     [ canvas, function(e) {p.brushSizeAdd( e.wheelDelta/120); e.preventDefault();}],
	                'DOMMouseScroll': [ canvas, function(e) {p.brushSizeAdd(-e.detail        ); e.preventDefault();}]};//hello FF!
	p.pickerEvents={'mousedown': [ canvas,   wrap(0,"pickerStart","", true,false,true,true)],
	                'mousemove': [ document, wrap(0,"pickerMove", "", true) ],
	                'mouseup':   [ document, wrap(0,"pickerEnd",  "") ],
	                'touchstart': [ canvas,   wrap(1,"pickerStart","", true,false,true,true)],
	                'touchmove':  [ document, wrap(1,"pickerMove", "", true) ],
	                'touchend':   [ document, wrap(1,"pickerEnd",  "") ]};
	
	//подключение событий
	p.handlersConnect=function(event_list) {
		for (var i in event_list)
			//log(event_list[i][1]);
			event_list[i][0].addEventListener(i, event_list[i][1], false);
	}
	//отключение событий
	p.handlersDisconnect=function(event_list) {
		for (var i in event_list)
			event_list[i][0].removeEventListener(i, event_list[i][1], false);
	}
	
	
	//TODO: большое: вынести кисточку и пипетку в отдельные объекты
	//тулзы
	p.TOOL_BRUSH=0;
	p.TOOL_ERASER=1;
	p.TOOL_PICKER=2;
	p.tools=[]; //[группа, функция]
	            //группа: например, пипетка и стёрка - разные инструменты, но реализуются одним и тем же кодом, потому в одной группе
	            //функция: переключатель на конкретный инструмент
	p.tools[p.TOOL_BRUSH]  = [0, function() {p.brushSetMode(p.BRUSH_MODE_NORMAL)}];
	p.tools[p.TOOL_ERASER] = [0, function() {p.brushSetMode(p.BRUSH_MODE_ERASER)}];
	p.tools[p.TOOL_PICKER] = [1, null];
	p.tools_events=[]; //обработчики событий для каждой группы, переключаются при смене группы
	p.tools_events[0] = p.brushEvents;
	p.tools_events[1] = p.pickerEvents;
	
	//p.tools_cur = 0;
	p.tools_cur_group = -1;
	
	//устанавливает инстумент
	p.toolSet = function(tool) {
		if (!(tool in this.tools)) return;
		
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
	
	
	p.merge=function(src_buf_id) {
		if (this.historyEnabled)
			this.history.addMerge(this.layer,this.layer_cur,src_buf_id);
		this.layer[this.layer_cur].rc.drawImage(this.layer[src_buf_id], 0,0);
		this.refresh();
	}
	
	
	p.undo=function() {
		if (!this.historyEnabled) return;
		this.history.undo(this.layer);
		this.refresh();
	}
	p.redo=function() {
		if (!this.historyEnabled) return;
		this.history.redo();
		this.refresh();
	}
	p.redoAll=function(forceLayer) {
		if (!this.historyEnabled) return;
		while (this.history.redo(forceLayer)) {};
		this.refresh();
	}
	//rc.globalCompositeOperation=Math.random()>0.5?"source-over":"destination-out";
	//вызываемая извне(например, из истории) функция, отрисовывающая путь
	//путь - [[слой,размер,блюр,полный радиус,шаг,цвет,форма,режим],[x0,y0,p0, x1,y1,p1, ...]]
	p.onRestorePath=function(path) {
		var _p=this.getParams();
		this.setParams(path[0]);
		path=path[1];
		
		this.historyEnabled=false;
		this.autoUpdate=false;
		this.brushStart(path[0],path[1],path[2]);
		for (var i=3;i<path.length;i+=3) {
			this.brushMove(path[i],path[i+1],path[i+2]);
		}
		this.brushEnd();
		this.setParams(_p);
		this.historyEnabled=true;
		this.autoUpdate=true;
		
		this.refresh();
	}
	p.onRestoreMerge=function(dest_buf_id,src_buf_id) {
		this.historyEnabled=false;
		var t=this.layer_cur;
		this.layer_cur=dest_buf_id;
		
		this.merge(src_buf_id);
		
		this.layer_cur=t;
		this.historyEnabled=true;
		
		this.refresh();
	}
	
	//упаковка всех текущих параметров в массив
	p.getParams=function() {
		var _p=[this.layer_cur,this.brushSize,this.brushBlur,
		        this.brushStep,this.brushColor.slice(),0,0];
		return _p;
	}
	//восстановление параметров из массива
	p.setParams=function(_p) {
		this.setLayer(_p[0]);
		this.brushSetSize(_p[1]);
		this.brushSetBlur(_p[2]);
		this.brushStep=_p[3];
		this.brushColor=_p[4];
		//,0=_p[5];
		//this.brushSpriteUpdate();
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
	
	
	p.historyEnabled=true;
	p.history=new History(p);
	
	p.brushSetSize(2);
	p.setLayer(0);
	p.brushSpriteUpdate();
	p.toolSet(p.TOOL_BRUSH);
	
	p.connect();
	
	return p;
}
