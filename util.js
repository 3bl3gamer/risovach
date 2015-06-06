function getPos(obj) {
	var curleft = 0, curtop = 0;
	if (obj.offsetParent)
		do {
			curleft += obj.offsetLeft;
			curtop += obj.offsetTop;
		} while (obj = obj.offsetParent);
	return [curleft,curtop];
}
// function getPosScroll(obj) {
// 	var curleft = 0, curtop = 0;
// 	if (obj.offsetParent)
// 		do {
// 			curleft += obj.offsetLeft;
// 			curtop += obj.offsetTop;
// 		} while (obj = obj.offsetParent);
// 	return [curleft-document.body.scrollLeft, curtop-document.body.scrollTop];
// }

function HTML7s_to_RGB3i(str) {
	var rgb = [];
	for (var i=1;i<7;i+=2) rgb.push(parseInt(str.substring(i,i+2),16));
	return rgb;
}
function RGB3i_to_HTML7s(arr) {
	var str = "#";
	for (var i=0; i<3; i++) str += arr[i]>15 ? arr[i].toString(16) : "0"+arr[i].toString(16);
	return str;
}

//просто линия между точками
CanvasRenderingContext2D.prototype.line = function(x0,y0,x1,y1) {
	this.beginPath();
	this.moveTo(x0,y0);
	this.lineTo(x1,y1);
	this.stroke();
}
//ломаная между произвольным кол-вом точек
CanvasRenderingContext2D.prototype.lines = function(/*x0,y0, x1,y2, x2,y2, ...*/) {
	this.beginPath();
	this.moveTo(arguments[0], arguments[1]);
	for (var i=2; i<arguments.length; i+=2)
		this.lineTo(arguments[i], arguments[i+1]);
	this.stroke();
}
//просто круг с координатами и радиусом
CanvasRenderingContext2D.prototype.circleStroke =
CanvasRenderingContext2D.prototype.circle = function(x,y,r) {
	this.beginPath();
	this.arc(x,y, r, 0,3.1415927*2, false);
	this.stroke();
}
CanvasRenderingContext2D.prototype.circleFill = function(x,y,r) {
	this.beginPath();
	this.arc(x,y, r, 0,3.1415927*2, false);
	this.fill();
}
CanvasRenderingContext2D.prototype.circleFillAndStroke = function(x,y,r) {
	this.beginPath();
	this.arc(x,y, r, 0,3.1415927*2, false);
	this.fill();
	this.stroke();
}
CanvasRenderingContext2D.prototype.clear = function() {
	this.clearRect(0, 0,this.canvas.width, this.canvas.height);
}
HTMLCanvasElement.prototype.autoresize = function(scale) {
	if (scale === undefined) scale = devicePixelRatio;
	var w = this.offsetWidth * scale;
	var h = this.offsetHeight * scale;
	if (this.width != w || this.height != h) {
		this.width = w;
		this.height = h;
	}
	if (scale != 1) this.getContext('2d').scale(scale, scale);
}
