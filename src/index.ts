/// <reference path="glsl.d.ts" />

import { Shader } from 'charto-3d';
import { OrbitSample } from './util';
import { MandelbrotView } from './MandelbrotView';

import mandelVertex from '../glsl/mandel.vert';
import mandelFragment from '../glsl/mandel.frag';
import { BigFloat32 as BigFloat, BigComplex32 as BigComplex } from 'bigfloat';

const perturbStride = 256;
const thumbSize = 0;

const enum Attribute {
	aPos = 0
}

const f32 = new Float32Array(1);

function die(msg: string): never {
	throw(new Error(msg));
}

class Render {

	constructor(public canvas: HTMLCanvasElement) {
		const gl = canvas.getContext('experimental-webgl') || die('Error creating WebGL context');

		gl.getExtension('OES_texture_float');
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);

		gl.clearColor(1, 0, 1, 0.25);

		this.gl = gl;

		this.shader = new Shader(gl, {
			vertex: mandelVertex,
			fragment: mandelFragment,
			attributes: {
				[ Attribute.aPos ]: 'aPos'
			}
		});

		const vertices = [
			-1, -1,
			-1, 1,
			1, -1,
			1, 1
		];

		gl.enableVertexAttribArray(Attribute.aPos);
		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer() || die('Error creating WebGL buffer'));
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		gl.vertexAttribPointer(Attribute.aPos, 2, gl.FLOAT, false, 0, 0);

		gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		[ this.uCenterHi, this.uCenterLo, this.uScale, this.uSize, this.uZoom, this.uReferenceOffset ] = this.getUniformLocations([
			'uCenterHi', 'uCenterLo', 'uScale', 'uSize', 'uZoom', 'uReferenceOffset'
		]);

		if(0) {
			const fb = gl.createFramebuffer();

			if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) { /* ERROR */ }

			gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, gl.createTexture(), 0);
		}
	}

	getUniformLocations(nameList: string[]) {
		return(nameList.map(
			(name: string) => {
				const num = this.gl.getUniformLocation(this.shader.program, name);
				if(!num && num !== 0) throw(new Error('Missing WebGL uniform ' + name));
				return(num as WebGLUniformLocation);
			}
		));
	}

	draw(view: MandelbrotView) {
		const gl = this.gl;

		let x = view.center.real.valueOf();
		let y = view.center.imag.valueOf();
		let zoom = Math.pow(2, view.zoomExponent);

		// const ratio = window.devicePixelRatio;
		const ratio = 1.0;
		const width = this.canvas.offsetWidth * ratio;
		const height = (this.canvas.offsetHeight - thumbSize) * ratio;

		if(width != this.width || height != this.height) {
			this.width = width;
			this.height = height;

			this.canvas.width = width;
			this.canvas.height = height;
(document.getElementById('gc2') as HTMLCanvasElement).width = width;
(document.getElementById('gc2') as HTMLCanvasElement).height = height;

			gl.viewport(0, 0, width, height);
		}

		const size = Math.min(width, height);
		const xScale = width / size * 2;
		const yScale = height / size * 2;

		view.updateOrbit();
		const data = new Float32Array(perturbStride * perturbStride * 4);

		let ptr = 0;
		let num = 0;
		let sample: OrbitSample<number>;

		while(num < perturbStride * perturbStride) {
			sample = view.orbitChunk[num++] || {};

			data[ptr++] = sample.real;
			data[ptr++] = sample.imag;
			data[ptr++] = sample.dReal;
			data[ptr++] = sample.dImag;
		}

		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, perturbStride, perturbStride, 0, gl.RGBA, gl.FLOAT, data);

		f32[0] = x;
		const xHi = f32[0];

		f32[0] = y;
		const yHi = f32[0];

		const offset = view.getOffset(view.referencePoint.real, view.referencePoint.imag);

		// gl.uniform1i(this.uMaxIter, maxIter);
		gl.uniform2f(this.uCenterHi, xHi, yHi);
		gl.uniform2f(this.uCenterLo, x - xHi, y - yHi);
		gl.uniform2f(this.uScale, xScale, yScale);
		gl.uniform1f(this.uSize, size / zoom);
		gl.uniform1f(this.uZoom, zoom);
		console.log(offset.x.valueOf(), offset.y.valueOf())
		gl.uniform2f(this.uReferenceOffset, -offset.x, -offset.y);

		// gl.uniform1i(this.uDebug, view.period);

		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	gl: WebGLRenderingContext;
	shader: Shader;

	uCenterHi: WebGLUniformLocation;
	uCenterLo: WebGLUniformLocation;
	uScale: WebGLUniformLocation;
	uSize: WebGLUniformLocation;
	uZoom: WebGLUniformLocation;
	uReferenceOffset: WebGLUniformLocation;

	width: number;
	height: number;

}

const canvas = document.getElementById('gc') as HTMLCanvasElement;
const render = new Render(canvas);

const real = new BigFloat();
const imag = new BigFloat();
let zoom = 0;

// const step = Math.pow(2, -1 / 2);
const step = -1 / 16;

let view = new MandelbrotView(new BigComplex(real, imag), zoom, {
	iterationsPerFrame: 64 * 8,
	bailOut: 256,
	maxPeriod: 512
});

function redraw() {
	window.requestAnimationFrame(() => render.draw(view));
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
}

canvas.onmousedown = (e: MouseEvent) => {
	zooming = true;
	hideHelp();

	mx = e.offsetX;
	my = e.offsetY;

	animate();
}

canvas.onmouseup = (e: MouseEvent) => {
	zooming = false;
}

function animate() {
	if(zooming) window.requestAnimationFrame(animate);

	const width = canvas.offsetWidth;
	const height = (canvas.offsetHeight - thumbSize);
	const size = Math.min(width, height);

	// x = x + (mx / width - 0.5) * width / size * 4 * Math.pow(2, zoom) * (1 - Math.pow(2, step));
	// y = y + (0.5 - my / height) * height / size * 4 * Math.pow(2, zoom) * (1 - Math.pow(2, step));
	// zoom += step;
	view.setPixelSize(width, height);
	view = view.zoomedTo(mx / width * 2 - 1, 1 - my / height * 2, step);

	render.draw(view);
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

/*
canvas.onclick = (e: MouseEvent) => {
	const width = canvas.offsetWidth;
	const height = canvas.offsetHeight;
	const size = Math.min(width, height);

	x = x + (e.offsetX / width - 0.5) * width / size * 4 * zoom * (1 - step);
	y = y + (0.5 - e.offsetY / height) * height / size * 4 * zoom * (1 - step);
	zoom *= step;

	redraw();
};

redraw();
*/
