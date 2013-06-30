//модуль рисовача
//должен содержать 2 метода:
// * onConnect(buf) - передача управления модулю
//    * buf - буфер для рисования
// * onDisconnect - отключение модуля, передача управления рисовачу
//TODO: надо бы передавать временный буфер рисовача вместо основного (или по выбору)
//TODO: да и историю б запилить не мешало

﻿var imgDefault="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAIAAAACDbGyAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9oMCRUiMrIBQVkAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAADElEQVQI12NgoC4AAABQAAEiE+h1AAAAAElFTkSuQmCC";

function point_distance(x0,y0,x1,y1) {
	return Math.sqrt((x0-x1)*(x0-x1)+(y0-y1)*(y0-y1));
}

//спрайт. содержит:
// * коэффициенты растяжения по Х и У
// * угол поворота
// * координаты центра
// * объект Image
function Sprite(img) {
	this.x=0;
	this.y=0;
	this.xscale=1;
	this.yscale=1;
	this.rotation=0;
	this.xo=0;
	this.yo=0;
	this.img=img;
	//рисует себя на переданный контекст
	this.draw=function(rc) {
		rc.save()
		rc.translate(this.x,this.y);
		rc.rotate(this.rotation);
		rc.scale(this.xscale,this.yscale);
		rc.drawImage(this.img,-this.xo,-this.yo);
		rc.restore();
	}
	
	//возвращает координаты 4х угловых точек (привет, тригонометрия :3)
	this.getPoints = function() {
		var _cos = Math.cos(this.rotation)
		  , _sin = Math.sin(this.rotation)
		  , xo = this.xo, yo = this.yo
		  , w = this.img.width, h = this.img.height
		  , xs = this.xscale, ys = this.yscale
		  , x = this.x, y = this.y;
		return [
			[( -xo   *_cos  +yo   *_sin)*xs+x, ( -yo   *_cos  -xo   *_sin)*ys+y],
			[((-xo+w)*_cos  +yo   *_sin)*xs+x, ( -yo   *_cos+(-xo+w)*_sin)*ys+y],
			[((-xo+w)*_cos+(+yo-h)*_sin)*xs+x, ((-yo+h)*_cos+(-xo+w)*_sin)*ys+y],
			[( -xo   *_cos+(+yo-h)*_sin)*xs+x, ((-yo+h)*_cos  -xo   *_sin)*ys+y]
		];
	}
	this.getPointsRelativePolar = function() {
		var x0=-this.xo, y0=-this.yo;
		var x1=this.img.width+x0, y1=this.img.height+y0;
		return [
			[Math.sqrt(x0*x0+y0*y0), Math.atan2(y0,x0)],
			[Math.sqrt(x1*x1+y0*y0), Math.atan2(y0,x1)],
			[Math.sqrt(x1*x1+y1*y1), Math.atan2(y1,x1)],
			[Math.sqrt(x0*x0+y1*y1), Math.atan2(y1,x0)]
		];
	}
	this.getPointRelativePolar = function(id) {
		var x0=-this.xo, y0=-this.yo;
		var x1=this.img.width+x0, y1=this.img.height+y0;
		switch (id) { //хм. как-то неэстетично
			case 0: return [Math.sqrt(x0*x0+y0*y0), Math.atan2(y0,x0)];
			case 1: return [Math.sqrt(x1*x1+y0*y0), Math.atan2(y0,x1)];
			case 2: return [Math.sqrt(x1*x1+y1*y1), Math.atan2(y1,x1)];
			case 3: return [Math.sqrt(x0*x0+y1*y1), Math.atan2(y1,x0)];
		}
	}
}


//содержит спрайт и функции для управления его трансформацией
function ImageTransformer(paint, buffer_id, url, onload) {
	var buffer = paint.getLayerBuffer(buffer_id);
	var rc = buffer.getContext("2d");
	
	var img = new Image();
	var sprite = new Sprite(img);
	sprite.x = buffer.width*0.5;
	sprite.y = buffer.height*0.5;
	
	var EVENT_DOWN=1, EVENT_MOVE=2, EVENT_UP=4;
	var grab_x=NaN, grab_y=NaN, grab_i=-1;
	var min_dis, min_i;
	function draw(cx,cy,event) {
		/*var line = function(x0,y0,x1,y1) {
			rc.beginPath();
			rc.moveTo(x0,y0);
			rc.lineTo(x1,y1);
			rc.stroke();
		}*/
		rc.clearRect(0,0, buffer.width,buffer.height);
		sprite.draw(rc);
		
		if (event==EVENT_UP) {
			grab_i = -1;
			grab_x = grab_y = NaN;
		}
		
		//нет координат мыши(и др.) - рисуем картинку и хватит
		if (cx === undefined) return;
		
		//var p = sprite.getPoints();
		//for (var i=0;i<4;i++) rc.fillText(i,p[i][0],p[i][1]);//line(0,0,p[i][0],p[i][1]);
		
		var p = sprite.getPoints();
		for (var i=0; i<4; i++)
			circleFill(p[i][0],p[i][1],3);
		
		if (event == EVENT_MOVE) {
			if (grab_i != -1) { //перетаскивается точка
				var rpx=cx-grab_x-sprite.x, rpy=cy-grab_y-sprite.y;
				var pp = sprite.getPointRelativePolar(grab_i);
				sprite.xscale = sprite.yscale = Math.sqrt(rpx*rpx+rpy*rpy)/pp[0];
				sprite.rotation = Math.atan2(rpy, rpx)-pp[1];
			} else
			if (grab_x == grab_x) { //перетаскивается вся картинка
				sprite.x = cx-grab_x;
				sprite.y = cy-grab_y;
			}
		}
		
		if (grab_i != -1) { //захвачена точка. рисуем её и выходим
			circleStroke(p[grab_i][0],p[grab_i][1], 8);
			return;
		}
		if (grab_x == grab_x) return; //просто перетаскивается. даже точку обводить не надо
		
		var min_dis=Infinity, min_i;
		for (var i=0; i<4; i++) {
			var dis = point_distance(cx,cy,p[i][0],p[i][1]);
			if (dis < min_dis) {min_dis=dis; min_i=i}
		}
		circleStroke(p[min_i][0],p[min_i][1], min_dis<8?8:5);
		
		if (event == EVENT_DOWN) {
			if (min_dis < 8) { //ткнули в точку
				grab_x = cx-p[min_i][0];
				grab_y = cy-p[min_i][1];
				grab_i = min_i;
			} else { //ткнули не в точку (простое перетаскивание)
				grab_x = cx-sprite.x;
				grab_y = cy-sprite.y;
			}
		}
	}
	
	img.src=imgDefault;//загружаем дефолтное изображение из base64
	var sender=this;
	//как дефолтное "загрузилось", ставим параметры
	//для дефолтной картинки и пускаем загрузку по переданной ссылке
	img.onload=function() {
		sprite.xo = this.width*0.5;
		sprite.yo = this.height*0.5;
		sprite.xscale=8;
		sprite.yscale=8;
		draw();//рисуем дефолтную на канвас
		onload();//сигнализируем об этом
		img.src=url;//заменяем ссылку
		img.onload=function() {
			sprite.xo=this.width*0.5;
			sprite.yo=this.height*0.5;
			sprite.xscale=0.25;
			sprite.yscale=0.25;
			sprite.rotation=0.1;
			draw();//рисуем загруженную на канвас
			onload();//сигнализируем об этом
		}
	}
	
	function circleFill(x,y,r) {
		rc.beginPath();
		rc.arc(x,y, r, 0,3.1415927*2, false);
		rc.fill();
	}
	function circleStroke(x,y,r) {
		rc.beginPath();
		rc.arc(x,y, r, 0,3.1415927*2, false);
		rc.stroke();
	}
	
	function grab(e) {
		var cx = e.pageX-paint.canvas_pos[0];
		var cy = e.pageY-paint.canvas_pos[1];
		draw(cx, cy, EVENT_DOWN);
		e.preventDefault();
	}
	function move(e) {
		var cx = e.pageX-paint.canvas_pos[0];
		var cy = e.pageY-paint.canvas_pos[1];
		
		draw(cx, cy, EVENT_MOVE);
		
		paint.refresh();
		e.preventDefault();
	}
	function drop(e) {
		draw(undefined, undefined, EVENT_UP);
		paint.refresh();
		e.preventDefault();
	}
	
	this.connect = function() {
		document.addEventListener("mousedown", grab, false);
		document.addEventListener("mousemove", move, false);
		document.addEventListener("mouseup",   drop, false);
	}
	this.disconnect = function() {
		document.removeEventListener("mousedown", grab, false);
		document.removeEventListener("mousemove", move, false);
		document.removeEventListener("mouseup",   drop, false);
	}
}

