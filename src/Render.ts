/// <reference path="glsl.d.ts" />

import { Shader } from 'charto-3d';
import { OrbitSample } from './util';
import { MandelbrotView } from './MandelbrotView';
import { KeyFrame } from './KeyFrame';

import calcVertex from '../glsl/calculate.vert';
import calcFragment from '../glsl/calculate.frag';
import countVertex from '../glsl/count.vert';
import countFragment from '../glsl/count.frag';
import colorVertex from '../glsl/colorize.vert';
import colorFragment from '../glsl/colorize.frag';

const countBlockSize = 32;
const perturbStride = 256;
const thumbSize = 0;

const countInterval = 2;
const readInterval = 6;
const renderInterval = 4;

const enum Attribute {
	aPos = 0
}

const xy32 = new Float32Array(2);

function die(msg: string): never {
	throw(new Error(msg));
}

export class Render {

	constructor(public canvas: HTMLCanvasElement) {
		const gl = canvas.getContext(
			'experimental-webgl',
			{ preserveDrawingBuffer: true }
		) || die('Error creating WebGL context');
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

		[ this.uCenterHi, /* this.uCenterLo, */ this.uScale, this.uSize, this.uZoomCalc, this.uOrbitCalc, this.uDataCalc, this.uIterCalc, this.uReferenceOffset, this.uExact ] = this.getUniformLocations(
			this.calcShader, [
				'uCenterHi', /* 'uCenterLo', */ 'uScale', 'uSize', 'uZoom', 'uOrbit', 'uData', 'uIter', 'uReferenceOffset', 'uExact'
			]
		);

		this.countShader = new Shader(gl, {
			vertex: countVertex.replace(/BLOCK_SIZE/g, countBlockSize + '.0'),
			fragment: countFragment.replace(/BLOCK_SIZE/g, countBlockSize + '.0'),
			attributes: {
				[ Attribute.aPos ]: 'aPos'
			}
		});

		[ this.uDataCount, this.uSizeCount, this.uIterCount ] = this.getUniformLocations(
			this.countShader, [
				'uData', 'uSize', 'uIter'
			]
		);

		this.colorShader = new Shader(gl, {
			vertex: colorVertex,
			fragment: colorFragment,
			attributes: {
				[ Attribute.aPos ]: 'aPos'
			}
		});

		[ this.uZoomColor, this.uOrbitColor, this.uDataColor, this.uTransparentColor ] = this.getUniformLocations(
			this.colorShader, [
				'uZoom', 'uOrbit', 'uData', 'uTransparent'
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
			ext.COLOR_ATTACHMENT1_WEBGL
		];

		this.ext = ext;
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
			this.textures[num] = tex;
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

	resize(width: number, height: number) {
		const gl = this.gl;

		this.width = width;
		this.height = height;

		this.canvas.width = width;
		this.canvas.height = height;
(document.getElementById('gc2') as HTMLCanvasElement).width = width;
(document.getElementById('gc2') as HTMLCanvasElement).height = height;

		gl.viewport(0, 0, width, height);

		// const width2 = Math.pow(2, Math.ceil(Math.log(width) / Math.log(2)));
		// const height2 = Math.pow(2, Math.ceil(Math.log(height) / Math.log(2)));

		for(let num = 0; num < 4; ++num) {
			gl.bindTexture(gl.TEXTURE_2D, this.textures[num]);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, null);
		}
	}

	private bindCalcShader(pass: number, data: Float32Array) {
		const gl = this.gl;

		this.calcShader.activate([]);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.refTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, perturbStride, perturbStride, 0, gl.RGBA, gl.FLOAT, data);
		gl.uniform1i(this.uExact, 0);

		const inputOffset = (pass & 1) * 2;
		const outputOffset = 2 - inputOffset;

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.textures[inputOffset + 0]);
		gl.uniform1i(this.uOrbitCalc, 1);

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, this.textures[inputOffset + 1]);
		gl.uniform1i(this.uDataCalc, 2);

		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			this.ext.COLOR_ATTACHMENT1_WEBGL,
			gl.TEXTURE_2D,
			this.textures[outputOffset + 0],
			0
		);

		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			this.ext.COLOR_ATTACHMENT0_WEBGL,
			gl.TEXTURE_2D,
			this.textures[outputOffset + 1],
			0
		);

		// if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
			// die('Error configuring WebGL framebuffer');
		// }
	}

	private bindColorShader(pass: number) {
		const gl = this.gl;

		this.colorShader.activate([]);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		const inputOffset = (pass & 1) * 2;
		const outputOffset = 2 - inputOffset;

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.textures[outputOffset + 0]);
		gl.uniform1i(this.uOrbitColor, 1);

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, this.textures[outputOffset + 1]);
		gl.uniform1i(this.uDataColor, 2);
	}

	/** Count unescaped pixels in a rendered set.
	  * Must be called immediately after executing the calculation shader. */

	private updateUnescapedCount(keyFrame: KeyFrame) {
		const { width, height } = keyFrame;
		const gl = this.gl;

		const sizeMax = Math.max(width, height);

		this.countShader.activate([]);

		gl.uniform1i(this.uDataCount, 2);
		gl.uniform2f(this.uSizeCount, width, height);
		gl.uniform1i(this.uIterCount, keyFrame.renderPassCount);

		gl.colorMask(false, false, false, true);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		gl.colorMask(true, true, true, true);

		// Pixels are counted in nested blocks.
		// Every frame increments the "recursion depth".
		// Result is correct only after all nesting levels are counted.
		// Total depth is logarithm of image size with block size as the base.
	}

	private readUnescapedCount() {
		const gl = this.gl;
		const buf = new Float32Array(4);
		gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, buf);

		return(buf[3]);
	}

	draw(keyFrame: KeyFrame) {
		const { width, height, view, mini } = keyFrame;
		const gl = this.gl;

		if(keyFrame.maxIterReached) return;

		const center = view.center.value;
		let x = center.real.valueOf();
		let y = center.imag.valueOf();
		let zoom = Math.pow(2, view.zoomExponent);

		if(width != this.width || height != this.height) this.resize(width, height);

		const sizeMin = Math.min(width, height);
		const sizeMax = Math.max(width, height);
		const xScale = width / sizeMin * 2;
		const yScale = height / sizeMin * 2;

		const data = new Float32Array(perturbStride * perturbStride * 4);
		let sample: OrbitSample<number>;
		let ptr = 0;

		// Calculate next reference orbit chunk.

		if(keyFrame.renderPassCount == 0) {
			// First chunk needs an extra step because the shader peeks ahead one iteration.
			++mini.maxIterations;

			mini.restartOrbit();
			mini.updateOrbit();

			--mini.maxIterations;
		} else {
			// Prepend last iteration from the previous chunk because the shader still needs it.
			sample = mini.orbitChunk[mini.orbitChunkLen - 1] || {};

			data[ptr++] = sample.real;
			data[ptr++] = sample.imag;
			data[ptr++] = sample.dcReal;
			data[ptr++] = sample.dcImag;

			mini.updateOrbit();
		}

		// Encode reference orbit chunk into an input texture.

		for(let num = 0; num < mini.orbitChunkLen; ++num) {
			sample = mini.orbitChunk[num] || {};

			data[ptr++] = sample.real;
			data[ptr++] = sample.imag;
			data[ptr++] = sample.dcReal;
			data[ptr++] = sample.dcImag;
		}

		this.bindCalcShader(keyFrame.renderPassCount, data)

		xy32[0] = x;
		xy32[1] = y;

		const offset = view.toLocal(mini.referencePoint.real, mini.referencePoint.imag);

		gl.uniform2f(this.uCenterHi, xy32[0], xy32[1]);
		// gl.uniform2f(this.uCenterLo, x - xy32[0], y - xy32[1]);
		gl.uniform2f(this.uScale, xScale, yScale);
		gl.uniform1f(this.uSize, sizeMin / zoom);
		gl.uniform1f(this.uZoomCalc, zoom);
		gl.uniform1i(this.uIterCalc, keyFrame.renderPassCount * mini.maxIterations);
		gl.uniform2f(this.uReferenceOffset, -offset.x / width * sizeMin, -offset.y / height * sizeMin);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		if(keyFrame.renderPassCount % countInterval == 0) {
			this.updateUnescapedCount(keyFrame);
		}

		if(keyFrame.renderPassCount % readInterval == 0 && keyFrame.renderPassCount / countInterval >= Math.log(sizeMax) / Math.log(countBlockSize) + 1) {
			const escapedCount = this.readUnescapedCount();
			const escapedDelta = escapedCount - keyFrame.escapedCount;
			keyFrame.escapedCount = escapedCount;

			console.log('Number of escaped pixels: ' + escapedCount + ' delta ' + escapedDelta + ' pass ' + keyFrame.renderPassCount + ' foo ' + keyFrame.escapedCount);

			if(escapedDelta < width * height / 100 && keyFrame.minIterReached) {
				if(escapedDelta < 10) keyFrame.maxIterReached = true;
				keyFrame.niceIterReached = true;
			} else if(escapedCount) {
				keyFrame.minIterReached = true;
			}
		}

		if(keyFrame.renderPassCount % renderInterval == 0) {
			this.bindColorShader(keyFrame.renderPassCount);
			gl.uniform1f(this.uZoomColor, zoom);
			gl.uniform1f(this.uTransparentColor, +!keyFrame.niceIterReached);
			console.log(+keyFrame.maxIterReached, keyFrame.renderPassCount);

			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		}

		++keyFrame.renderPassCount;
	}

	gl: WebGLRenderingContext;
	ext: WEBGL_draw_buffers;

	frameBuffer: WebGLFramebuffer;
	calcShader: Shader;
	countShader: Shader;
	colorShader: Shader;

	refTexture: WebGLTexture;
	textures: WebGLTexture[] = [];

	uCenterHi: WebGLUniformLocation;
	// uCenterLo: WebGLUniformLocation;
	uScale: WebGLUniformLocation;
	uSize: WebGLUniformLocation;
	uZoomCalc: WebGLUniformLocation;
	uZoomColor: WebGLUniformLocation;
	uReferenceOffset: WebGLUniformLocation;
	uIterCalc: WebGLUniformLocation;
	uIterCount: WebGLUniformLocation;
	uExact: WebGLUniformLocation;
	uOrbitCalc: WebGLUniformLocation;
	uOrbitColor: WebGLUniformLocation;
	uDataCalc: WebGLUniformLocation;
	uDataCount: WebGLUniformLocation;
	uDataColor: WebGLUniformLocation;
	uSizeCount: WebGLUniformLocation;
	uTransparentColor: WebGLUniformLocation;

	width: number;
	height: number;

}
