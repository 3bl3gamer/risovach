function getPos(obj) {
	var curleft = 0, curtop = 0;
	if (obj.offsetParent)
		do {
			curleft += obj.offsetLeft;
			curtop += obj.offsetTop;
		} while (obj = obj.offsetParent);
	return [curleft,curtop];
}
function getPosScroll(obj) {
	var curleft = 0, curtop = 0;
	if (obj.offsetParent)
		do {
			curleft += obj.offsetLeft;
			curtop += obj.offsetTop;
		} while (obj = obj.offsetParent);
	return [curleft-document.body.scrollLeft, curtop-document.body.scrollTop];
}

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

