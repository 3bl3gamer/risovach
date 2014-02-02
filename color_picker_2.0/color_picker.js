//based on Farbtastic Color Picker 1.2

function getPos(obj) {
	var curleft = curtop = 0;
	if (obj.offsetParent)
		do {
			curleft += obj.offsetLeft;
			curtop += obj.offsetTop;
		} while (obj = obj.offsetParent);
	return [curleft,curtop];
}
function toRange(a,x,b) {return x<a?a:x>b?b:x}


function ColorPicker(host, img_path) {
	if (!img_path) img_path = "";
	var p = this;
	var s;
	
	//стилизация
	s = host.style;
	s.position = "relative";
	s.display = "inline-block";
	s.cursor = "crosshair";
	
	var wheel = new Image();
	wheel.src = img_path+"wheel.png";
	s = wheel.style;
	s.position = "relative";
	wheel.width = wheel.height = 195;
	host.appendChild(wheel);
	
	var color = document.createElement("div");
	s = color.style;
	s.position = "absolute";
	s.left = s.top = "24%";
	s.background = "#0F0";
	host.appendChild(color);
	
	var rect = new Image();
	rect.src = img_path+"rect.png";
	s = rect.style;
	s.position = "relative";
	rect.width = rect.height = 101;
	color.appendChild(rect);
	
	function mm(parent) { //make marker
		var m = new Image();
		m.src = img_path+"marker.png";
		s = m.style;
		s.position = "absolute";
		s.margin = "-8px";
		parent.appendChild(m);
		return m;
	}
	wheel_marker = mm(host);
	rect_marker = mm(color);
	
	//функции для конвертирования цветов
	var P3 = 0.33333333, P6 = 1-P3;
	function HSL2RGB(h, s, l) {
		var m1, m2;
		m2 = (l <= 0.5) ? l * (s + 1) : l + s - l*s;
		m1 = l * 2 - m2;
		return [hue2RGB(m1, m2, h<P6 ? h+P3 : h+P3-1),
		        hue2RGB(m1, m2, h),
		        hue2RGB(m1, m2, h>P3 ? h-P3 : h-P3+1)];
	}
	function hue2RGB(m1, m2, h) {
		if (h * 6 < 1) return m1 + (m2 - m1) * h * 6;
		if (h * 2 < 1) return m2;
		if (h * 3 < 2) return m1 + (m2 - m1) * (P6 - h) * 6;
		return m1;
	}
	function RGB2HTML(r, g, b) {
		return "rgb("+((r*256+0.5)|0)+","+
		              ((g*256+0.5)|0)+","+
		              ((b*256+0.5)|0)+")";
	}
	function RGBa2HTML(c) {
		return "rgb("+((c[0]*256+0.5)|0)+","+
		              ((c[1]*256+0.5)|0)+","+
		              ((c[2]*256+0.5)|0)+")";
	}
	function RGB2HSL(r, g, b) {
		var min = Math.min(r, g, b);
		var max = Math.max(r, g, b);
		var delta = max - min;
		var l = (min + max) / 2;
		var s = 0;
		var h = 0;
		if (l > 0 && l < 1) {
			s = delta / (l < 0.5 ? (2 * l) : (2 - 2 * l));
		}
		if (delta > 0) {
			if (max == r && max != g) h += (g - b) / delta;
			if (max == g && max != b) h += (2 + (b - r) / delta);
			if (max == b && max != r) h += (4 + (r - g) / delta);
			h /= 6;
		}
		return [h, s, l];
	}
	
	//геттеры-сеттеры
	this.setRGB = function(r, g, b, silent) {
		var hsl = RGB2HSL(r, g, b);
		hue = hsl[0];
		sat = hsl[1];
		lum = hsl[2];
		updateAll();
		if (p.onfinalchange && !silent) p.onfinalchange();
	}
	this.getRGB = function() {
		return HSL2RGB(hue, sat, lum);
	}
	this.getHTML = function() {
		return RGBa2HTML(HSL2RGB(hue, sat, lum));
	}
	
	//размеры частей
	var wheel_x,wheel_y,wheel_r, wheel_w,wheel_w2;
	var rect_x,rect_y, rect_w,rect_w2;
	//обновление размеров
	function updateMetrics() {
		wheel_w = wheel.offsetWidth;
		wheel_r = wheel_w*0.43;
		wheel_w2 = wheel_w*0.5;
		rect_w = rect.offsetWidth;
		rect_w2 = rect_w*0.5;
		var pos = getPos(wheel);
		wheel_x = pos[0];
		wheel_y = pos[1];
		rect_x = wheel_x+color.offsetTop;
		rect_y = wheel_y+color.offsetLeft;
	}
	//событие сработало над центральным квадратом?
	function isEventOverRect(e) {
		var dx = e.pageX - wheel_x - wheel_w2;
		var dy = e.pageY - wheel_y - wheel_w2;
		return Math.abs(dx) < rect_w2 && Math.abs(dy) < rect_w2;
	}
	
	//обновление расположения маркеров
	function updateAll() {
		updateMetrics();
		var ang = hue*3.1415927*2;
		markerSetPos(wheel_marker, wheel_w2+Math.sin(ang)*wheel_r,
		                           wheel_w2-Math.cos(ang)*wheel_r);
		markerSetPos(rect_marker, (1-sat)*rect_w, (1-lum)*rect_w);
		color.style.background = RGBa2HTML(HSL2RGB(hue, 1, 0.5));
		if (p.onchange) p.onchange();
	}
	function markerSetPos(marker, dx, dy) {
		marker.style.left = (dx|0)+"px";
		marker.style.top  = (dy|0)+"px";
	}
	
	//обработчики h-колеса и sl-квадрата
	var hue=0, sat=0, lum=0;
	function wheelProcess(pageX, pageY) {
		var dx = pageX-wheel_x-wheel_w2;
		var dy = pageY-wheel_y-wheel_w2;
		var len = Math.sqrt(dx*dx+dy*dy);
		if (len == 0) {dx = 1; len = 1;}
		dx *= wheel_r/len;
		dy *= wheel_r/len;
		hue = Math.atan2(dx, -dy) / 3.1415927/2;
		if (hue < 0) hue += 1;
		markerSetPos(wheel_marker, wheel_w2+dx, wheel_w2+dy);
		color.style.background = RGBa2HTML(HSL2RGB(hue,1,0.5));
		if (p.onchange) p.onchange();
	}
	function rectProcess(pageX, pageY) {
		var dx = toRange(0, pageX-rect_x, rect_w);
		var dy = toRange(0, pageY-rect_y, rect_w);
		sat = 1-dx/rect_w;
		lum = 1-dy/rect_w;
		markerSetPos(rect_marker, dx, dy);
		if (p.onchange) p.onchange();
	}
	
	//магия
	function makeStartFunc(move_event, end_event, is_touch) {
		//функция, извлекающая из евента координаты и передающая их далее
		var moveFuncGenerator = new Function("extractedCoordsHandler",
			"return function(e) {\
				e.preventDefault();"+
				(is_touch?"e = e.touches[0];":"")+
				"extractedCoordsHandler(e.pageX, e.pageY);\
			}"
		);
		var rect_on_move  = moveFuncGenerator(rectProcess);
		var wheel_on_move = moveFuncGenerator(wheelProcess);
		
		//функция, отключающая обработчики от документа
		var endFuncGenerator = new Function("picker", "moveHandler",
			"return function(e) {\
				e.preventDefault();"+
				(is_touch?"if (e.touches.length != 0) return;":"")+
				"document.removeEventListener(\""+move_event+"\", moveHandler, false);\
				 document.removeEventListener(\""+end_event+"\",  arguments.callee,  false);\
				if (picker.onfinalchange) picker.onfinalchange();\
			}"
		);
		var rect_on_end  = endFuncGenerator(p, rect_on_move);
		var wheel_on_end = endFuncGenerator(p, wheel_on_move);
		
		//подключающая функция
		//подключает либо обработчики колеса, либо квадрата. смотря, куда ткнуть
		return new Function("updateMetrics", "isEventOverRect",
		                    "rectMoveHandler",  "rectEndHandler",
		                    "wheelMoveHandler", "wheelEndHandler",
		                    "rectProcess", "wheelProcess",
			"return function(e) {\
				e.preventDefault();"+
				(is_touch?"if (e.touches.length > 1) return;\
				           e = e.touches[0];":"")+
				"updateMetrics();\
				if (isEventOverRect(e)) {\
					document.addEventListener(\""+move_event+"\", rectMoveHandler, false);\
					document.addEventListener(\""+end_event+"\",  rectEndHandler,  false);\
					rectProcess(e.pageX, e.pageY);\
				} else {\
					document.addEventListener(\""+move_event+"\", wheelMoveHandler, false);\
					document.addEventListener(\""+end_event+"\",  wheelEndHandler, false);\
					wheelProcess(e.pageX, e.pageY);\
				}\
			}"
		)(updateMetrics, isEventOverRect,
		  rect_on_move,  rect_on_end,
		  wheel_on_move, wheel_on_end,
		  rectProcess,   wheelProcess);
	}
	host.onmousedown = makeStartFunc("mousemove", "mouseup", false);
	host.ontouchstart = makeStartFunc("touchmove", "touchend", true);
	
	this.setRGB(0,1,0);
}
