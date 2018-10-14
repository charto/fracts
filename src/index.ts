/// <reference path="glsl.d.ts" />

import { Shader } from 'charto-3d';
import { BigFloat } from 'bigfloat';

import mandelVertex from '../glsl/mandel.vert';
import mandelFragment from '../glsl/mandel.frag';

const BigFloat32 = BigFloat;

const maxIter = 256;
const bailOut = 256;
const bailOut2 = new BigFloat32(bailOut * bailOut);

const enum Attribute {
	aPos = 0
}

const f32 = new Float32Array(1);

function die(msg: string): never {
	throw(new Error(msg));
}

interface State {
	real: BigFloat32;
	imag: BigFloat32;
	reals: number[];
	imags: number[];
	iter?: number;
}

function deep(state: State, maxIter: number, bailOut2: BigFloat32) {
	let { real, imag, reals, imags } = state;
	let real2 = real.mul(real).truncate(2);
	let imag2 = imag.mul(imag).truncate(2);
	let dReal = new BigFloat32(1);
	let dImag = new BigFloat32(0);
	let dNext;

	let iter = maxIter;

	while(--iter && real2.add(imag2).deltaFrom(bailOut2) < 0) {
		// dNext = 2 * (real * dReal - imag * dImag) + 1;
		// dImag = 2 * (real * dImag + imag * dReal);
		// dReal = dNext;

		imag = real.mul(imag).truncate(2).mul(2).add(state.imag);
		real = real2.sub(imag2).add(state.real);

		reals.push(real.valueOf());
		imags.push(imag.valueOf());

		real2 = real.mul(real).truncate(2);
		imag2 = imag.mul(imag).truncate(2);
	}

	state.real = real;
	state.imag = imag;
	state.iter = maxIter - iter;
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

		[ this.uCenterHi, this.uCenterLo, this.uScale, this.uSize, this.uZoom ] = this.getUniformLocations([
			'uCenterHi', 'uCenterLo', 'uScale', 'uSize', 'uZoom'
		]);
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

	redraw(x: number, y: number, zoom: number) {
		const gl = this.gl;

		// const ratio = window.devicePixelRatio;
		const ratio = 1.0;
		const width = this.canvas.offsetWidth * ratio;
		const height = this.canvas.offsetHeight * ratio;

		if(width != this.width || height != this.height) {
			this.width = width;
			this.height = height;

			this.canvas.width = width;
			this.canvas.height = height;

			gl.viewport(0, 0, width, height);
		}

		const size = Math.min(width, height);
		const xScale = width / size * 2;
		const yScale = height / size * 2;

		const w = 16, h = 16;
		const state: State = {
			real: new BigFloat32(x),
			imag: new BigFloat32(y),
			reals: [],
			imags: []
		};

		deep(state, maxIter, bailOut2);
		const data = new Float32Array(w * h * 4);

		let ptr = 0;
		let num = -1;

		while(++num < w * h) {
			data[ptr++] = state.reals[num];
			data[ptr++] = state.imags[num];
			data[ptr++] = 0;
			data[ptr++] = 0;
		}

		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.FLOAT, data);

		f32[0] = x;
		const xHi = f32[0];

		f32[0] = y;
		const yHi = f32[0];

		// gl.uniform1i(this.uMaxIter, maxIter);
		gl.uniform2f(this.uCenterHi, xHi, yHi);
		gl.uniform2f(this.uCenterLo, x - xHi, y - yHi);
		gl.uniform2f(this.uScale, xScale, yScale);
		gl.uniform1f(this.uSize, size / zoom);
		gl.uniform1f(this.uZoom, zoom);

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

	width: number;
	height: number;

}

const canvas = document.getElementById('gc') as HTMLCanvasElement;
const render = new Render(canvas);

let x = 0;
let y = 0;
let zoom = 1;

// const step = Math.pow(2, -1 / 2);
const step = Math.pow(2, -2);

function redraw() {
	window.requestAnimationFrame(() => render.redraw(x, y, zoom));
}

window.onresize = redraw;

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
