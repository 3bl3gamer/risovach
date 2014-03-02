function Merge(paint) {
	var m = this;
	m.mergeCurrentWith = function(layer_id) {
		throw new Error("Not yet.");
	}
	m.simpleDraw = function(layer_id, upper_layer_id) {
		var lower = paint.getLayerBuffer(layer_id);
		var upper = paint.getLayerBuffer(upper_layer_id);
		lower.rc.drawImage(upper, 0,0);
	}
	m.drawCurrentLayerOn = function(layer_id) {
		paint.history.add(new MergeHistoryStep(paint, this, "draw", layer_id, paint.layer_id));
		this.simpleDraw(layer_id, paint.layer_id);
		paint.refresh();
	}
}



function MergeHistoryStep(paint, merge, mode, layer_id, upper_layer_id) {
	var s = this;
	s.merge = merge;
	s.mode = mode;
	s.data = null;
	s.layer_id = layer_id;
	s.upper_layer_id = upper_layer_id;
	this.capture(paint);
}
MergeHistoryStep.prototype.capture = function(paint, forceLayer) {
	if (forceLayer !== undefined) this.layer_id = forceLayer;
	var buf = paint.getLayerBuffer(this.layer_id);
	this.data = buf.rc.getImageData(0,0,buf.width,buf.height);
}
MergeHistoryStep.prototype.undo = function(paint) {
	var buf = paint.getLayerBuffer(this.layer_id);
	buf.rc.putImageData(this.data,0,0);
}
MergeHistoryStep.prototype.redo = function(paint) {
	switch(this.mode) {
	case "draw":
		this.merge.simpleDraw(this.layer_id, this.upper_layer_id);
		break;
	default:
		console.error("Wrong mode"); //DEBUG
	}
}
