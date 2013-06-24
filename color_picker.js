function ColorPicker(canvas) {
	var p=this;
	p.buf=canvas;
	p.rc=canvas.getContext("2d");
	p.circle_width=this.buf.width/8;
	
	p.hsvToRgb=function (h, s, v){
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
	
	p.drawCircle=function() {
		var stt=new Date().getTime();
		for (var j=0;j<1;j++) {
			var x=this.buf.width/2, y=this.buf.height/2;
			var rw=x, w=this.circle_width, r=rw-w;
			var rc=this.rc;
			var step=1/3.1415927/rw;
			rc.lineWidth=2;
			for (var i=0;i<1;i+=step) {
				var a=i*2*3.1415927;
				var c=Math.cos(a), s=Math.sin(a);
				rc.strokeStyle="rgba("+this.hsvToRgb(i,1,1).join(",")+",1)";//alert(hsvToRgb(a/10,1,1));
				rc.beginPath();
				rc.moveTo(x+c*r,y+s*r);
				rc.lineTo(x+c*rw,y+s*rw);
				rc.stroke();
			}
		}
		log(new Date().getTime()-stt);
	}
	
	p.drawCircle();
	
	return this;
}