function History(paint) {
	var h = this;
	
	h.historyLen = 0;//текущая длина истории (учитывая undo)
	h.step = [];//массив шагов
	h.action = "none";
	
	
	//добавляет в историю шаг
	h.add = function(newStep) {
		if (this.historyLen !== this.step.length) //отбрасывает отменённое (есть есть)
			this.step.splice(this.historyLen, this.step.length-this.historyLen);
		//newStep.capture();
		this.step.push(newStep);
		this.historyLen++;
	};
	
	h.unshift = function() {
		if (this.historyLen === 0) return;
		this.historyLen--;
		this.step.unshift();
	};
	
	//получает массив слоёв, выбирает нужный,
	//восстанавливает участки в него
	h.undo = function() {console.log(this.step)
		if (this.historyLen === 0) return;
		var s = this.step[--this.historyLen];
		h.action = "undo";
		s.undo(paint);
		h.action = "none";
	};
	//если передан номер слоя, делает redo в слой с этим номером
	//иначе - в слой, записанный в параметрах
	h.redo = function(forceLayer) {
		if (this.historyLen === this.step.length) return false;
		var s = this.step[this.historyLen++];
		h.action = "redo";
		if (forceLayer !== undefined) {
			s.capture(paint, forceLayer);
		}
		s.redo(paint);
		h.action = "none";
		return true;
	};
}

