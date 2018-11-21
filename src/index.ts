import { State } from './History';
import { Render } from './Render';

const thumbSize = 0;

const history = new State();

const canvas = document.getElementById('gc') as HTMLCanvasElement;
const render = new Render(canvas);

const step = -1 / 16;

function redraw() {
	window.requestAnimationFrame(() => render.draw(history.view));
}

window.onresize = redraw;

let zooming = false;
let mx = canvas.offsetWidth / 2;
let my = (canvas.offsetHeight - thumbSize) / 2;

function hideHelp() {
	document.getElementById('fullscreen')!.style.display = 'none';
	document.getElementById('help')!.style.display = 'none';
	document.getElementById('github')!.style.display = 'none';
}

canvas.onmousemove = (e: MouseEvent) => {
	mx = e.offsetX;
	my = e.offsetY;
};

canvas.onmousedown = (e: MouseEvent) => {
	zooming = true;
	hideHelp();

	mx = e.offsetX;
	my = e.offsetY;

	animate();
};

canvas.onmouseup = (e: MouseEvent) => {
	zooming = false;
};

function animate() {
	if(zooming) {
		window.requestAnimationFrame(animate);

		const width = canvas.offsetWidth;
		const height = (canvas.offsetHeight - thumbSize);
		const size = Math.min(width, height);

		history.view.zoomTo((mx * 2 - width) / size, (height - my * 2) / size, step);
	}

	console.log(history.view);
	render.draw(history.view);
}

animate();

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
