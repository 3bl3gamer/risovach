function BrushHistoryStep(paint, params, path) {
	var s = this;
	s.region = [];//массив из getImageData
	s.regionPos = [];//массив параметров прямоугольников в region вида [x0,y0,w0,h0, x1,y1,w1,h2, ...]
	s.params = params;
	s.path = path;
	s.layer_id = paint.layer_id;
	s.addPathAndCapture(paint.getLayerBuffer(), params, path);
}

////устанавливает слой
//BrushHistoryStep.prototype.setLayer = function(layer_id) {
//	this.layer_id = layer_id;
//}

////для какого слоя тут данные
//BrushHistoryStep.prototype.getLayer = function() {
//	return this.layer_id;
//}

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
	var r = params.size;
	
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
	this.capture(buf);
}

//проход по массиву прямоугольников, копирование пикселов
BrushHistoryStep.prototype.capture = function(buf) {
	this.region = [];
	var rc=buf.rc, rp=this.regionPos;
	for (var i=0; i<rp.length; i+=4) {
		this.region.push(rc.getImageData(rp[i],rp[i+1],rp[i+2],rp[i+3]));
		//rc.strokeRect(rp[i],rp[i+1],rp[i+2],rp[i+3]);
	}
}

//восстановление пикселов
BrushHistoryStep.prototype.undo = function(buf) {
	var rc=buf.rc, rp=this.regionPos;
	for (var i=0; i<this.region.length; i++) {
		rc.putImageData(this.region[i],rp[i*4],rp[i*4+1]);
	}
}

BrushHistoryStep.prototype.redo = function(paint) {
	//paint.onRestorePath(this.path);
}

//function BrushHistoryHandler(paint, brush) {
//	var h = this;
//	h.add = function() {
//		paint.history.add(new BrushHistoryStep(paint.layer_id, ));
//	}
//}
//end -> params and path -> calc rects -> save rects -> return Step


function MergeHistoryStep(paint, upper_layer_id) {
	var s = this;
	s.upper_layer_id = upper_layer_id;
	s.data = null;
	s.layer_id = paint.layer_id;
	this.capture(paint.getLayerBuffer());
}
////устанавливает слой
//MergeHistoryStep.prototype.setLayer = function(dest_layer) {
//	this.dest_layer=dest_layer;
//}
////для какого слоя тут данные
//MergeHistoryStep.prototype.getLayer = function() {
//	return this.dest_layer;
//}
MergeHistoryStep.prototype.capture = function(dest_buf) {
	this.data = dest_buf.rc.getImageData(0,0,dest_buf.width,dest_buf.height);
}
MergeHistoryStep.prototype.undo = function(dest_buf) {
	dest_buf.rc.putImageData(this.data,0,0);
}
MergeHistoryStep.prototype.redo=function(paint) {
	paint.onRestoreMerge(this.dest_layer,this.src_layer);
}
