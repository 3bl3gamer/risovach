//модуль рисовача
//должен содержать 2 метода:
// * onConnect(buf) - передача управления модулю
//    * buf - буфер для рисования
// * onDisconnect - отключение модуля, передача управления рисовачу
//TODO: надо бы передавать временный буфер рисовача вместо основного (или по выбору)
//TODO: да и историю б запилить не мешало

﻿var imgDefault="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAIAAAACDbGyAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9oMCRUiMrIBQVkAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAADElEQVQI12NgoC4AAABQAAEiE+h1AAAAAElFTkSuQmCC";

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
	
	//возвразает координаты 4х угловых точек (привет, тригонометрия :3)
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
}


//содержит спрайт и функции для управления его трансформацией
//принимает:
// * буфер для рисования
// * ссылку на загружаемый файл
function ImageTransformer(buffer,url,onload) {
	this.buffer = buffer;
	this.rc = buffer.getContext("2d");
	
	this.onload = onload;
	
	var img = new Image();
	this.sprite = new Sprite(img);
	this.sprite.x = buffer.width*0.5;
	this.sprite.y = buffer.height*0.5;
	this.draw = function() {
		var rc = this.rc;
		var line = function(x0,y0,x1,y1) {
			rc.beginPath();
			rc.moveTo(x0,y0);
			rc.lineTo(x1,y1);
			rc.stroke();
		}
		this.sprite.draw(this.rc);
		//var p = this.sprite.getPoints();
		//for (var i=0;i<4;i++) line(0,0,p[i][0],p[i][1]);
	}
	
	img.src=imgDefault;//загружаем дефолтное изображение из base64
	var sender=this;
	//как дефолтное "загрузилось", ставим параметры
	//для дефолтной картинки и пускаем загрузку по переданной ссылке
	img.onload=function() {
		sender.sprite.xo=this.width*0.5;
		sender.sprite.yo=this.height*0.5;
		sender.sprite.xscale=8;
		sender.sprite.yscale=8;
		sender.draw();//рисуем дефолтную на канвас
		sender.onload();//сигнализируем об этом
		img.src=url;//заменяем ссылку
		img.onload=function() {
			sender.sprite.xo=this.width*0.5;
			sender.sprite.yo=this.height*0.5;
			sender.sprite.xscale=0.25;
			sender.sprite.yscale=0.25;
			sender.sprite.rotation=0.1;
			sender.draw();//рисуем загруженную на канвас
			sender.onload();//сигнализируем об этом
		}
	}
	
	
	this.prevX=0;
	this.prevY=0;
	this.grabbed=false;
	this.grab=function(mx,my) {
		this.prevX=mx;
		this.prevY=my;
		this.grabbed=true;
	}
	this.move=function(mx,my) {
		if (!this.grabbed) return;
		this.x+=mx-this.prevX;
		this.y+=my-this.prevY;
		this.prevX=mx;
		this.prevY=my;
		this.rc.clearRect(0,0,this.buffer.width,this.buffer.height);
		this.draw();
	}
	this.drop=function() {
		this.grabbed=false;
	}
	
	this.scale=function(xs,ys) {
		this.sprite.xscale*=xs;
		this.sprite.yscale*=ys;
		this.rc.clearRect(0,0,this.buffer.width,this.buffer.height);
		this.draw();
	}
	
	this.rotate=function(a) {
		//if (!this.grabbed) return;
		this.sprite.rotation+=a;//(mx-this.prevX)*0.005;
		//this.prevX=mx;
		//this.prevY=my;
		this.rc.clearRect(0,0,this.buffer.width,this.buffer.height);
		this.draw();
	}
}


/*function Point(x,y,t) {
	this.x=x;
	this.y=y;
	this.r=r;
	this.move=function(x,y) {
		this.x=x;
		this.y=y;
	}
	this.isMoudeOver=function(mx,my) {
		if (mx<this.x-r || mx>this.x+r ||
		    my<this.y-t || my<this.r+r) return false;
		var dx=mx-this.x, dy=my-this.y;
		if (Math.sqrt(dx*dx+dy*dy)>r*r) return false;
		return true;
	}
}

function ImageTransformer(img,x,y) {
	this.image=img;
	this.center=new Point(x,y,5);
	this.vertex=new Point(x+16,y+16,5);
	this.point=[this.center,this.vertex];
	this.draw=function(rc) {
		var pa=this.point;
		for (var i in pa) {
			var p=pa[i];
			rc.beginPath();
			rc.arc(p.x,p.y,p.r,  0,3.1415927*2, false);
		}
	}
}*/
