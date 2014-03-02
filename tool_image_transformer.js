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
}
//рисует себя на переданный контекст
Sprite.prototype.draw=function(rc) {
	rc.save()
	rc.translate(this.x,this.y);
	rc.rotate(this.rotation);
	rc.scale(this.xscale,this.yscale);
	rc.drawImage(this.img,-this.xo,-this.yo);
	rc.restore();
}
//возвращает координаты 4х угловых точек (привет, тригонометрия :3)
Sprite.prototype.getPoints = function() {
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
Sprite.prototype.getPointsRelativePolar = function() {
	var x0=-this.xo, y0=-this.yo;
	var x1=this.img.width+x0, y1=this.img.height+y0;
	return [
		[Math.sqrt(x0*x0+y0*y0), Math.atan2(y0,x0)],
		[Math.sqrt(x1*x1+y0*y0), Math.atan2(y0,x1)],
		[Math.sqrt(x1*x1+y1*y1), Math.atan2(y1,x1)],
		[Math.sqrt(x0*x0+y1*y1), Math.atan2(y1,x0)]
	];
}
Sprite.prototype.getPointRelativePolar = function(id) {
	var x0=-this.xo, y0=-this.yo;
	var x1=this.img.width+x0, y1=this.img.height+y0;
	switch (id) { //хм. как-то неэстетично
		case 0: return [Math.sqrt(x0*x0+y0*y0), Math.atan2(y0,x0)];
		case 1: return [Math.sqrt(x1*x1+y0*y0), Math.atan2(y0,x1)];
		case 2: return [Math.sqrt(x1*x1+y1*y1), Math.atan2(y1,x1)];
		case 3: return [Math.sqrt(x0*x0+y1*y1), Math.atan2(y1,x0)];
	}
}


//содержит спрайт и функции для управления его трансформацией
function ImageTransformer(paint) {
	var transf = this;
	var buffer = paint.buffer;
	var rc = buffer.rc;
	
	var sprite = null;
	function setImage(image) {
		sprite = new Sprite(image);
		sprite.x = buffer.width*0.5;
		sprite.y = buffer.height*0.5;
		sprite.xo = image.width*0.5;
		sprite.yo = image.height*0.5;
		sprite.xscale = 0.75;
		sprite.yscale = 0.75;
		sprite.rotation = 0;
	}
	
	var prev_state = null;
	function getState() {
		return {
			x: sprite.x,
			y: sprite.y,
			xscale: sprite.xscale,
			yscale: sprite.yscale,
			rotation: sprite.rotation
		};
	}
	function setState(st) {
		sprite.x = st.x;
		sprite.y = st.y;
		sprite.xscale = st.xscale;
		sprite.yscale = st.yscale;
		sprite.rotation = st.rotation;
	}
	
	//grab_x, grab_y - относительные координаты точки, за которую схватили
	//grab_i - id угла, за который схватили (если за угол)
	var grab_x=NaN, grab_y=NaN, grab_i=-1;
	//grab_dir - разность направления тач0-тач1 и поворота спрайта
	//grab_xscale, grab_yscale - трансформация по осям относительно расстояния между тачами
	var grab_dir=NaN, grab_xscale=NaN, grab_yscale=NaN;
	var sprite_p, min_dis, min_i;
	
	function updateSpritePoints(x,y) {
		if (x === undefined || y === undefined) return;
		var p = sprite_p || sprite.getPoints();
		min_dis = Infinity;
		for (var i=0; i<4; i++) {
			var dis = point_distance(x,y,p[i][0],p[i][1]);
			if (dis < min_dis) {min_dis=dis; min_i=i}
		}
		//if (grab_i != -1) rc.circleStroke(p[grab_i][0],p[grab_i][1], 8);
		//else if (min_dis<8) rc.circleStroke(p[min_i][0],p[min_i][1], 8);
	}
	
	function drawWithFrame() {
		rc.clearRect(0,0, buffer.width,buffer.height);
		sprite.draw(rc);
		
		var p = sprite_p = sprite.getPoints();
		
		for (var i=0; i<4; i++)
			rc.circleFill(p[i][0],p[i][1],3);
		
		rc.beginPath();
		rc.moveTo(p[3][0],p[3][1]);
		for (var i=0; i<4; i++)
			rc.lineTo(p[i][0],p[i][1]);
		rc.stroke();
	}
	
	
	function singleDown(x,y) {
		updateSpritePoints(x,y);
		if (min_dis < 8) { //ткнули в точку
			grab_x = x - sprite_p[min_i][0];
			grab_y = y - sprite_p[min_i][1];
			grab_i = min_i;
		} else { //ткнули не в точку (простое перетаскивание)
			grab_x = x - sprite.x;
			grab_y = y - sprite.y;
		}
		prev_state = getState();
		drawWithFrame();
		paint.refresh();
	}
	function singleMove(x,y) {
		if (grab_x != grab_x) return;
		updateSpritePoints(x,y);
		if (grab_i != -1) { //перетаскивается точка
			var rpx=x-grab_x-sprite.x, rpy=y-grab_y-sprite.y;
			var pp = sprite.getPointRelativePolar(grab_i);
			sprite.xscale = sprite.yscale = Math.sqrt(rpx*rpx+rpy*rpy)/pp[0];
			sprite.rotation = Math.atan2(rpy, rpx)-pp[1];
		} else
		if (grab_x == grab_x) { //перетаскивается вся картинка
			sprite.x = x - grab_x;
			sprite.y = y - grab_y;
		}
		drawWithFrame();
		paint.refresh();
	}
	function singleUp(with_history) {
		if (grab_x == grab_x && with_history) {
			paint.history.add(new ImageTransformerChange_HistoryStep(paint, transf, prev_state, getState()));
		}
		grab_i = -1;
		grab_x = grab_y = NaN;
		drawWithFrame();
		paint.refresh();
	}
	function doubleDown(x0,y0, x1,y1) {
		grab_x = (x0+x1)/2 - sprite.x;
		grab_y = (y0+y1)/2 - sprite.y;
		grab_dir = Math.atan2(y1-y0, x1-x0) - sprite.rotation;
		grab_xscale = sprite.xscale / point_distance(x0,y0,x1,y1);
		grab_yscale = sprite.yscale / point_distance(x0,y0,x1,y1);
		prev_state = getState();
	}
	function doubleMove(x0,y0, x1,y1) {
		sprite.x = (x0+x1)/2 - grab_x;
		sprite.y = (y0+y1)/2 - grab_y;
		sprite.rotation = Math.atan2(y1-y0, x1-x0) - grab_dir;
		sprite.xscale = point_distance(x0,y0,x1,y1) * grab_xscale;
		sprite.yscale = point_distance(x0,y0,x1,y1) * grab_yscale;
		drawWithFrame();
		paint.refresh();
	}
	function doubleUp(with_history) {
		grab_x = grab_y = grab_dir = grab_xscale = grab_yscale = NaN;
	}
	
	function grab(e) {
		singleDown(e.pageX-paint.canvas_pos[0], e.pageY-paint.canvas_pos[1]);
		e.preventDefault();
	}
	function move(e) {
		singleMove(e.pageX-paint.canvas_pos[0], e.pageY-paint.canvas_pos[1]);
		e.preventDefault();
	}
	function drop(e) {
		singleUp(true);
		e.preventDefault();
	}
	
	var touch_numb = 0;
	function touchStart(e) {
		if (e.touches.length > 2) return;
		e.preventDefault();
		
		if (e.touches.length == 1) {
			var t = e.touches[0];
			singleDown(t.pageX-paint.canvas_pos[0], t.pageY-paint.canvas_pos[1]);
		} else {
			if (touch_numb == 1) singleUp(false);
			var t0 = e.touches[0], t1 = e.touches[1];
			doubleDown(
				t0.pageX-paint.canvas_pos[0], t0.pageY-paint.canvas_pos[1],
				t1.pageX-paint.canvas_pos[0], t1.pageY-paint.canvas_pos[1]
			);
		}
		touch_numb = e.touches.length;
	}
	function touchMove(e) {
		if (e.touches.length > 2) return;
		if (e.touches.length != touch_numb) return; //тут что-то нетак
		e.preventDefault();
		
		if (e.touches.length == 1) {
			var t = e.touches[0];
			singleMove(t.pageX-paint.canvas_pos[0], t.pageY-paint.canvas_pos[1]);
		} else {
			var t0 = e.touches[0], t1 = e.touches[1];
			//мобильная Опера 12.04 в передёт тачи сюда в обратном порядке
			if (t0.identifier > t1.identifier) {var t=t0; t0=t1; t1=t;}
			doubleMove(
				t0.pageX-paint.canvas_pos[0], t0.pageY-paint.canvas_pos[1],
				t1.pageX-paint.canvas_pos[0], t1.pageY-paint.canvas_pos[1]
			);
		}
	}
	function touchEnd(e) {
		if (e.touches.length > 1) return;
		e.preventDefault();
		
		if (e.touches.length == 0) {
			singleUp(true);
		} else {
			doubleUp(false);
			var t = e.touches[0];
			singleDown(t.pageX-paint.canvas_pos[0], t.pageY-paint.canvas_pos[1]);
		}
		touch_numb = e.touches.length;
	}
	
	this.modes = ["image-transform"];
	this.mode = "image-transform";
	
	this.events = {
		'mousedown': [canvas, grab],
		'mousemove': [document, move],
		'mouseup': [document, drop],
		'touchstart': [canvas, touchStart],
		'touchmove': [document, touchMove],
		'touchend': [document, touchEnd]
	};
	
	this.onStart = function() {
		if (paint.history.action != "none") return;
		if (!sprite) {
			paint.toolUsePrevious();
			console.warn("Image transformer started without sprite"); //DEBUG
			return;
		}
		paint.history.add(new ImageTransformerStart_HistoryStep(paint, this));
		this.update();
	}
	this.onLayerChange =
	this.onToolChange = function(oldTool, newTool) {
		if (paint.history.action != "none" || !sprite) return;
		paint.history.add(new ImageTransformerDone_HistoryStep(paint, this));
		rc.clear();
		sprite.draw(rc);
		sprite = null;
		paint.applyBuffer();
		paint.refresh();
		paint.toolUsePrevious();
	}
	this.setImage = setImage;
	Object.defineProperty(this, "sprite", {
		get: function() {return sprite;},
		set: function(s) {sprite = s;}
	});
	this.setState = setState;
	this.update = function() {
		drawWithFrame();
		paint.refresh();
	}
}


function ImageTransformerStart_HistoryStep(paint, tool) {
	this.tool = tool;
	this.layer_id = paint.layer_id;
	this.sprite = tool.sprite;
}
ImageTransformerStart_HistoryStep.prototype.capture = function(paint, forceLayer) {
	if (forceLayer !== undefined) this.layer_id = forceLayer;
}
ImageTransformerStart_HistoryStep.prototype.undo = function(paint) {
	paint.toolUsePrevious();
	paint.buffer.rc.clear();
}
ImageTransformerStart_HistoryStep.prototype.redo = function(paint) {
	this.tool.sprite = this.sprite;
	paint.layer_id = this.layer_id;
	paint.toolSet("image-transform");
	this.tool.update();
}


function ImageTransformerChange_HistoryStep(paint, tool, prev_state, new_state) {
	this.tool = tool;
	this.prev_state = prev_state;
	this.new_state = new_state;
}
ImageTransformerChange_HistoryStep.prototype.capture = function() {}
ImageTransformerChange_HistoryStep.prototype.undo = function() {
	this.tool.setState(this.prev_state);
	this.tool.update();
}
ImageTransformerChange_HistoryStep.prototype.redo = function() {
	this.tool.setState(this.new_state);
	this.tool.update();
}


function ImageTransformerDone_HistoryStep(paint, tool) {
	this.tool = tool;
	this.layer_id = paint.layer_id;
	this.sprite = tool.sprite;
	this.data = null;
	this.capture(paint);
}
ImageTransformerDone_HistoryStep.prototype.capture = function(paint, forceLayer) {
	if (forceLayer !== undefined) this.layer_id = forceLayer;
	var buf = paint.getLayerBuffer(this.layer_id);
	this.data = buf.rc.getImageData(0,0,buf.width,buf.height);
}
ImageTransformerDone_HistoryStep.prototype.undo = function(paint) {
	var buf = paint.getLayerBuffer(this.layer_id);
	buf.rc.putImageData(this.data,0,0);
	this.tool.sprite = this.sprite;
	paint.layer_id = this.layer_id;
	paint.toolSet("image-transform");
	this.tool.update();
}
ImageTransformerDone_HistoryStep.prototype.redo = function(paint) {
	var buf = paint.getLayerBuffer(this.layer_id);
	this.tool.sprite.draw(buf.rc);
	paint.toolUsePrevious();
	paint.buffer.rc.clear();
}

