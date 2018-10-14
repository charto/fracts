import { State } from './History';
import { KeyFrame } from './KeyFrame';
import { Render } from './Render';

const history = new State();

const content = document.getElementById('content') as HTMLDivElement;
const canvas = document.getElementById('gc') as HTMLCanvasElement;
const bgCanvas = [
	document.getElementById('bg1') as HTMLCanvasElement,
	document.getElementById('bg2') as HTMLCanvasElement
];

const gc = [
	bgCanvas[0].getContext('2d')!,
	bgCanvas[1].getContext('2d')!
];
const render = new Render(canvas);

/*
// const ratio = window.devicePixelRatio;
const ratio = 1.0;
const width = canvas.offsetWidth * ratio;
const height = canvas.offsetHeight * ratio;
*/

/*
let frameNum = 0;
const frameCount = 19;

function foo()  {
	if(frameNum < frameCount) {
		window.requestAnimationFrame(foo);
	}

	if(frameNum) render.draw(frame);

	++frameNum;
}

foo();
*/

const step = -1 / 16;
let zooming = false;
let mx = canvas.offsetWidth / 2;
let my = canvas.offsetHeight / 2;

function hideHelp() {
	document.getElementById('fullscreen')!.style.display = 'none';
	document.getElementById('help')!.style.display = 'none';
	document.getElementById('github')!.style.display = 'none';
}

let frame: KeyFrame;
let bgNum = 0;

function animate() {
	window.requestAnimationFrame(animate);

	if(zooming || !frame) {
		const ratio = 1.0;
		const width = canvas.offsetWidth * ratio;
		const height = canvas.offsetHeight * ratio;
		const size = Math.min(width, height);
		let x: number, y: number, z: number;

		if(zooming) history.view.zoomTo((mx * 2 - width) / size, (height - my * 2) / size, step);

		if(!frame || history.view.zoomExponent <= frame.view.zoomExponent - 1) {
			if(frame) {
				({ x, y } = history.view.toLocal(frame.view.center.value.real, frame.view.center.value.imag));
				z = Math.pow(2, frame.view.zoomExponent - history.view.zoomExponent);

				bgNum = 1 - bgNum;

				if(bgCanvas[bgNum].width != width) bgCanvas[bgNum].width = width;
				if(bgCanvas[bgNum].height != height) bgCanvas[bgNum].height = height;

				gc[bgNum].clearRect(0, 0, width, height);

				gc[bgNum].drawImage(
					bgCanvas[1 - bgNum],
					(width - (width + x * size) / z) / 2,
					(height - (height - y * size) / z) / 2,
					width, height, 0, 0, width * z, height * z
				);

				gc[bgNum].drawImage(
					canvas,
					(width - (width + x * size) / z) / 2,
					(height - (height - y * size) / z) / 2,
					width, height, 0, 0, width * z, height * z
				);

				bgCanvas[bgNum].style.visibility = 'visible';
				bgCanvas[1 - bgNum].style.visibility = 'hidden';
			}

			frame = new KeyFrame(history.view, {
				maxIterations: 64 * 2,
				maxPeriod: 8192,
				widthPixels: width,
				heightPixels: height
			});
		}

		// Transform canvas so frame.view corresponds to history.view
		// http://127.0.0.1:8080/?imag=0.1c06d586455aed802a8&real=-0.c51853637238e184ec&zoom=-14
		({ x, y } = history.view.toLocal(frame.view.center.value.real, frame.view.center.value.imag));

		x *= size / 2;
		y *= -size / 2;
		//	const x = frame.view.center.value.real.valueOf() - history.view.center.value.real.valueOf();
		//	const y = frame.view.center.value.imag.valueOf() - history.view.center.value.imag.valueOf();
		z = Math.pow(2, frame.view.zoomExponent - history.view.zoomExponent);
		canvas.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + z + ')';
		bgCanvas[bgNum].style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + z + ')';
	}

	render.draw(frame);
}

animate();

content.onmousemove = (e: MouseEvent) => {
	mx = e.clientX;
	my = e.clientY;
};

content.onmousedown = (e: MouseEvent) => {
	zooming = true;
	hideHelp();

	mx = e.clientX;
	my = e.clientY;
};

content.onmouseup = (e: MouseEvent) => {
	zooming = false;
};

content.onmouseout = (e: MouseEvent) => {
	zooming = false;
};

document.getElementById('fullscreen')!.onclick = (e: MouseEvent) => {
	hideHelp();

	try {
		const element = document.documentElement!;

		(
			element.requestFullscreen ||
			(element as any).webkitRequestFullscreen ||
			(element as any).mozRequestFullScreen ||
			(element as any).msRequestFullscreen
		).call(element);
	} catch(err) {}
};
