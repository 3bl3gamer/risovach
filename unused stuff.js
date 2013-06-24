//рисование круга hue
function hsvToRgb(h, s, v){
	var r, g, b;

	var i = Math.floor(h * 6);
	var f = h * 6 - i;
	var p = v * (1 - s);
	var q = v * (1 - f * s);
	var t = v * (1 - (1 - f) * s);

	switch(i % 6){
		case 0: r = v, g = t, b = p; break;
		case 1: r = q, g = v, b = p; break;
		case 2: r = p, g = v, b = t; break;
		case 3: r = p, g = q, b = v; break;
		case 4: r = t, g = p, b = v; break;
		case 5: r = v, g = p, b = q; break;
	}

	return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
}
var stt=new Date().getTime();
var x=96,y=96,r=48,w=16,rw=r+w;
rc.lineWidth=2;
for (var i=0;i<1;i+=0.005) {
	var a=i*2*3.1415927;
	var c=Math.cos(a), s=Math.sin(a);
	rc.strokeStyle="rgba("+hsvToRgb(i,1,1).join(",")+",1)";//alert(hsvToRgb(a/10,1,1));
	rc.beginPath();
	rc.moveTo(x+c*r,y+s*r);
	rc.lineTo(x+c*rw,y+s*rw);
	rc.stroke();
}
alert(new Date().getTime()-stt);







//покомпонентная работа с цветами (из paint.js)
p.brushColorPack=function() {return "rgba("+this.brushColor.join(",")+")";}
p.brushSetColorHTML=function(color) {
	var c=this.brushColor;
	if (color.length == 7) {
		c[0]=parseInt('0x' + color.substring(1, 3));
		c[1]=parseInt('0x' + color.substring(3, 5));
		c[2]=parseInt('0x' + color.substring(5, 7));
	}// else if (color.length == 4) {
	//	return [parseInt('0x' + color.substring(1, 2)) / 15,
	//	parseInt('0x' + color.substring(2, 3)) / 15,
	//	parseInt('0x' + color.substring(3, 4)) / 15];
	//}
	this.brushSpriteUpdate();
}
p.brushSetColor=function(a,r,g,b) {this.brushSpriteUpdate();}
p.brushSetColorRGB=function(r,g,b) {var c=this.brushColor; c[0]=r; c[1]=g; c[2]=b; this.brushSpriteUpdate();}
p.brushSetColorA=function(a) {this.brushColor[3]=a; this.brushSpriteUpdate();}




//обработка мыши в общем виде
var mouse_x=0,mouse_y=0,mouse_xp=0,mouse_yp=0;
var mouse_shift=[0,0],mouseDown=-1,mousePressTime=0;
//var refresh_stt=new Date().getTime();
function handleMouseMove(event) {
	event=event || window.event;//IE fix
	mouse_xp=mouse_x;
	mouse_yp=mouse_y;
	mouse_x=event.clientX-mouse_shift[0];
	mouse_y=event.clientY-mouse_shift[1];
	
	/*code*/
}
function handleMouseDown(event) {
	/*code*/
	
	mouseDown = event.which;
}
function handleMouseUp(event) {
	/*code*/
	mouseDown = -1;
}


