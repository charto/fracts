/// <reference path="glsl.d.ts" />

import { Shader } from 'charto-3d';
import { OrbitSample } from './util';
import { MandelbrotView } from './MandelbrotView';
import { View } from './History';

import calcVertex from '../glsl/calculate.vert';
import calcFragment from '../glsl/calculate.frag';
import colorVertex from '../glsl/colorize.vert';
import colorFragment from '../glsl/colorize.frag';

const perturbStride = 256;
const thumbSize = 0;

const enum Attribute {
	aPos = 0
}

const xy32 = new Float32Array(2);

function die(msg: string): never {
	throw(new Error(msg));
}

export class Render {

	constructor(public canvas: HTMLCanvasElement) {
		const gl = canvas.getContext('experimental-webgl') || die('Error creating WebGL context');
		this.gl = gl;

		// Floating point textures are needed for writing a reference orbit
		// to WebGL and storing per-pixel orbit state between frames.
		gl.getExtension('OES_texture_float') || die('Float textures are unsupported on this machine');

		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);

		gl.clearColor(1, 0, 1, 0.25);

		this.initFramebuffer();
		this.initShader();
		this.initGeometry();
		this.initInputTexture();
	}

	private initShader() {
		const gl = this.gl;

		this.calcShader = new Shader(gl, {
			vertex: calcVertex,
			fragment: calcFragment,
			attributes: {
				[ Attribute.aPos ]: 'aPos'
			}
		});

		[ this.uCenterHi, this.uCenterLo, this.uScale, this.uSize, this.uZoomCalc, this.uIter, this.uReferenceOffset, this.uExact ] = this.getUniformLocations(
			this.calcShader, [
				'uCenterHi', 'uCenterLo', 'uScale', 'uSize', 'uZoom', 'uIter', 'uReferenceOffset', 'uExact'
			]
		);

		this.colorShader = new Shader(gl, {
			vertex: colorVertex,
			fragment: colorFragment,
			attributes: {
				[ Attribute.aPos ]: 'aPos'
			}
		});

		[ this.uZoomColor, this.uOrbitColor, this.uDataColor ] = this.getUniformLocations(
			this.colorShader, [
				'uZoom', 'uOrbit', 'uData'
			]
		);
	}

	/** 2 buffers gives 8 channels. We need 7:
	  * - real and imag z
	  * - real and imag dz/dc
	  * - iter and period
	  * - distMin for finding period
	  * When rendering, a uniform flag should control if the previous state is valid data.
	  * If iter is set, assume point escaped, otherwise keep iterating. */

	private initFramebuffer() {
		const gl = this.gl;
		const ext = gl.getExtension('WEBGL_draw_buffers') || die('Rendering to multiple textures is unsupported on this machine');
		const attachments = [
			ext.COLOR_ATTACHMENT0_WEBGL,
			ext.COLOR_ATTACHMENT1_WEBGL,
			ext.COLOR_ATTACHMENT2_WEBGL,
			ext.COLOR_ATTACHMENT3_WEBGL
		];

		this.frameBuffer = gl.createFramebuffer() || die('Error creating WebGL framebuffer');
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);

		for(let num = 0; num < 4; ++num) {
			const tex = gl.createTexture() || die('Error creating WebGL texture');

			gl.bindTexture(gl.TEXTURE_2D, tex);

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 640, 480, 0, gl.RGBA, gl.FLOAT, null);
			gl.framebufferTexture2D(
				gl.FRAMEBUFFER,
				attachments[num],
				gl.TEXTURE_2D,
				tex,
				0
			);

			this.textures[num] = tex;
		}

		if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
			die('Error configuring WebGL framebuffer');
		}

		ext.drawBuffersWEBGL(attachments);
	}

	private initGeometry() {
		const gl = this.gl;

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
	}

	private initInputTexture() {
		const gl = this.gl;

		this.refTexture = gl.createTexture() || die('Error creating input texture');
		gl.bindTexture(gl.TEXTURE_2D, this.refTexture);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	}

	getUniformLocations(shader: Shader, nameList: string[]) {
		return(nameList.map(
			(name: string) => {
				const num = this.gl.getUniformLocation(shader.program, name);
				if(!num && num !== 0) throw(new Error('Missing WebGL uniform ' + name));
				return(num as WebGLUniformLocation);
			}
		));
	}

	// TODO: The input parameter should be a KeyFrame (renamed MandelbrotView)

	draw(view: View) {
		const gl = this.gl;

		this.calcShader.activate([]);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
		// gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		const center = view.center.value;
		let x = center.real.valueOf();
		let y = center.imag.valueOf();
		let zoom = Math.pow(2, view.zoomExponent);

		const mini = new MandelbrotView(center, view.zoomExponent, {
			widthPixels: this.canvas.offsetWidth,
			heightPixels: this.canvas.offsetHeight,
			maxIterations: 64 * 8,
			bailOut: 256,
			maxPeriod: 512
		}, view).mini;

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

			for(let num = 0; num < 4; ++num) {
				gl.bindTexture(gl.TEXTURE_2D, this.textures[num]);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, null);
			}
		}

		const size = Math.min(width, height);
		const xScale = width / size * 2;
		const yScale = height / size * 2;

		mini.updateOrbit();
		const data = new Float32Array(perturbStride * perturbStride * 4);

		let ptr = 0;
		let num = 0;
		let sample: OrbitSample<number>;

		while(num < perturbStride * perturbStride) {
			sample = mini.orbitChunk[num++] || {};

			data[ptr++] = sample.real;
			data[ptr++] = sample.imag;
			data[ptr++] = sample.dcReal;
			data[ptr++] = sample.dcImag;
		}

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.refTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, perturbStride, perturbStride, 0, gl.RGBA, gl.FLOAT, data);
		gl.uniform1i(this.uExact, 0);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
		gl.uniform1i(this.uOrbitCalc, 1);

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, this.textures[1]);
		gl.uniform1i(this.uDataCalc, 2);

		xy32[0] = x;
		xy32[1] = y;

		const offset = view.toLocal(mini.referencePoint.real, mini.referencePoint.imag);

		// gl.uniform1i(this.uMaxIter, maxIter);
		gl.uniform2f(this.uCenterHi, xy32[0], xy32[1]);
		gl.uniform2f(this.uCenterLo, x - xy32[0], y - xy32[1]);
		gl.uniform2f(this.uScale, xScale, yScale);
		gl.uniform1f(this.uSize, size / zoom);
		gl.uniform1f(this.uZoomCalc, zoom);
		gl.uniform1i(this.uIter, 0);
		gl.uniform2f(this.uReferenceOffset, -offset.x / width * size, -offset.y / height * size);

		// gl.uniform1i(this.uDebug, view.period);

		// gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		this.colorShader.activate([]);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		gl.uniform1f(this.uZoomColor, zoom);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
		gl.uniform1i(this.uOrbitColor, 1);

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, this.textures[1]);
		gl.uniform1i(this.uDataColor, 2);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}

	gl: WebGLRenderingContext;
	frameBuffer: WebGLFramebuffer;
	calcShader: Shader;
	colorShader: Shader;

	refTexture: WebGLTexture;
	textures: WebGLTexture[] = [];

	uCenterHi: WebGLUniformLocation;
	uCenterLo: WebGLUniformLocation;
	uScale: WebGLUniformLocation;
	uSize: WebGLUniformLocation;
	uZoomCalc: WebGLUniformLocation;
	uZoomColor: WebGLUniformLocation;
	uReferenceOffset: WebGLUniformLocation;
	uIter: WebGLUniformLocation;
	uExact: WebGLUniformLocation;
	uOrbitCalc: WebGLUniformLocation;
	uOrbitColor: WebGLUniformLocation;
	uDataCalc: WebGLUniformLocation;
	uDataColor: WebGLUniformLocation;

	width: number;
	height: number;

}
