function History(paint) {
	var h = this;
	
	h.historyLen = 0;//текущая длина истории (учитывая undo)
	h.step = [];//массив шагов
	
	
	//добавляет в историю шаг
	h.add = function(newStep) {
		if (this.historyLen !== this.step.length) //отбрасывает отменённое (есть есть)
			this.step.splice(this.historyLen, this.step.length-this.historyLen);
		//newStep.capture();
		this.step.push(newStep);
		this.historyLen++;
	};
	
	//получает массив слоёв, выбирает нужный,
	//восстанавливает участки в него
	h.undo = function(buffers) {
		if (this.historyLen === 0) return;
		var s = this.step[--this.historyLen];
		var layer_id = s.layer_id;
		s.undo(buffers[layer_id]);
	};
	//если передан номер слоя, делает redo в слой с этим номером
	//иначе - в слой, записанный в параметрах
	h.redo = function(forceLayer) {
		if (this.historyLen === this.step.length) return false;
		var s = this.step[this.historyLen++];
		if (forceLayer !== undefined) {
			s.layer_id = forceLayer;
			s.capture(paint.getLayerBuffer(forceLayer));
		}
		s.redo(paint.getLayerBuffer(s.layer_id));
		return true;
	};
}


/*
function createHistory() {
	var h=new Object();
	
	h.layer=[];//слои. храним для каждого все пути и немного кейфреймов
	h.snapshotStep=10;//шаг кейфреймов
	h.historyLen=0;//текущая длина истории (учитывая undo)
	h.layerHistory=[];
	h.createLayer=function() {
		l=new Object();
		l.path=[];
		l.snapshot=[];
		return l;
	}
	h.initLayers=function(w,h,numb) {
		for (var i=0;i<numb;i++)
			this.layer[i]=this.createLayer();
	}
	//добавление
	// * номер слоя
	// * путь - массив [x0,y0,x1,y1,...]
	// * канвас, который (возможно) будет скопированч
	h.add=function(layer_id,path,buffer) {
		var l=this.layer[layer_id];
		var cacheLen=l.path.length;
		
		if (this.historyLen!=cacheLen) {
			l.path.splice(0,this.historyLen);
			l.snapshot.splice(0,Math.ceil(this.historyLen/this.snapshotStep));
		}
		
		if (l.path.length%this.snapshotStep==0) {
			l.snapshot.push(
				buffer.rc.getImageData(0,0,buffer.width,buffer.height));
		}
		l.path.push(path.slice());
		this.historyLen++;
	}
	
	h.undo=function()
	
	return h;
}
*/
