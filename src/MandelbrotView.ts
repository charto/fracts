import {
	BigFloat32 as BigFloat,
	BigComplex32 as BigComplex
} from 'bigfloat';

import { MandelbrotOptions, OrbitSample, tempFloats } from './util';
import { mandelbrotPeriod } from './mandelbrotPeriod';

function iterateMandelbrot(
	param: BigComplex,
	orbitState: OrbitSample<BigFloat>,
	orbitChunk: OrbitSample<number>[],
	options: MandelbrotOptions
) {
	let { real, imag, dReal, dImag } = orbitState;
	let realParam = param.real;
	let imagParam = param.imag;
	const bailOut = options.bailOut || 2;
	/** Number of arbitrary precision limbs to use in calculations. */
	const limbCount = options.limbCount || 2;
	const real2 = real.mul(real).truncate(limbCount);
	const imag2 = imag.mul(imag).truncate(limbCount);
	const [ temp1, temp2, temp3 ] = tempFloats;
	const dNext = new BigFloat();
	const one = new BigFloat(1);
	const two = new BigFloat(2);

	real = real.clone();
	imag = imag.clone();

	const bailOut2 = bailOut * bailOut;
	const maxIter = options.iterationsPerFrame || 256;
	let iter = 0;

	do {
		const sample = orbitChunk[iter++];

		sample.real = real.valueOf();
		sample.imag = imag.valueOf();
		sample.dReal = dReal.valueOf();
		sample.dImag = dImag.valueOf();

		// dz = 2 * z * dz + 1
		real.mul(dReal, temp1).sub(
			imag.mul(dImag, temp2),
			temp3
		).truncate(limbCount).mul(two, dNext);

		real.mul(dImag, temp1).add(
			imag.mul(dReal, temp2),
			temp3
		).truncate(limbCount).mul(two, dImag);

		dNext.add(one, dReal);

		// z = z^2 + c
		real.mul(imag, temp1).truncate(limbCount).mul(two, temp2).add(imagParam, imag);
		real2.sub(imag2, temp1).add(realParam, real);

		real.mul(real, real2).truncate(limbCount);
		imag.mul(imag, imag2).truncate(limbCount);
	} while(iter < maxIter && real2.add(imag2, temp1).valueOf() < bailOut2);

	orbitState.real = real;
	orbitState.imag = imag;
	orbitState.dReal = dReal;
	orbitState.dImag = dImag;

	return(iter);
}

/** Represents a view of the Mandelbrot fractal with a center point and zoom.
  * From them, a suitable permutation reference orbit location is calculated.
  * The full reference orbit can be retrieved in chunks for iteratively
  * producing an image of the fractal. */

export class MandelbrotView implements MandelbrotOptions {

	constructor(
		center?: BigComplex | [number, number],
		public zoomExponent = 0,
		options: MandelbrotOptions = {}
	) {
		if(center) {
			if(!(center instanceof BigComplex)) center = new BigComplex(center[0], center[1]);
		} else center = new BigComplex();

		this.center = center;
		this.iterationsPerFrame = options.iterationsPerFrame || 64;
		this.bailOut = options.bailOut || 256;
		this.maxPeriod = options.maxPeriod || 8192;

		this.setPixelSize(options.widthPixels || 1024, options.heightPixels || 1024);

		const sw = this.offsetCenter(-1, -1);
		const ne = this.offsetCenter(1, 1);

		this.periods = mandelbrotPeriod(sw, ne, this);
		this.calculateReferencePoint(sw, ne, this.periods);
// this.referencePoint = this.center.clone();
		this.restartOrbit();

		// Initialize empty reference orbit chunk.

		for(let iter = 0; iter < this.iterationsPerFrame; ++iter) {
			this.orbitChunk[iter] = {
				real: 0,
				imag: 0,
				dReal: 0,
				dImag: 0
			};
		}
	}

	/** Get complex coordinates from local view coordinates.
	  *
	  * Local coordinates have the view center at the origin and all edges are
	  * one unit away from it. This matches a WebGL viewport.
	  *
	  * @param x Local horizontal coordinate from -1 (left) to 1 (right edge).
	  * @param y Local vertical coordinate from -1 (bottom) to 1 (top edge).
	  * @return Complex coordinates matching given local coordinates. */

	offsetCenter(x: number, y: number) {
		const zoom = this.zoomExponent;
		const scale = Math.pow(2, zoom);

		return(new BigComplex(
			this.center.real.add(x * this.scaleReal * scale),
			this.center.imag.add(y * this.scaleImag * scale)
		));
	}

	toView(real: BigFloat, imag: BigFloat) {
		const [ temp1, temp2, temp3 ] = tempFloats;
		const zoom = this.zoomExponent;
		const scale = Math.pow(2, zoom);

		const x = (1 + real.sub(this.center.real, temp1).valueOf() / (this.scaleReal * scale)) * (this.widthPixels / 2);
		const y = (1 - imag.sub(this.center.imag, temp1).valueOf() / (this.scaleImag * scale)) * (this.heightPixels / 2);

		return({ x, y });
	}

	private calculateReferencePoint(
		sw: BigComplex,
		ne: BigComplex,
		periods: number[]
	) {
		const [ temp1, temp2, temp3 ] = tempFloats;
		const epsilon2 = this.pixelSize * this.pixelSize / 4;
		const referencePoint = new BigComplex();
		let period: number | undefined;
		let i: number;

		const canvas = document.getElementById('gc2') as HTMLCanvasElement;
		const gc = canvas.getContext('2d')!;
		gc.clearRect(0, 0, canvas.width, canvas.height);
		gc.lineWidth = 2;
		gc.strokeStyle = '#ff0000';
		gc.font = '24px sans-serif';

		gc.beginPath();
		gc.arc(this.widthPixels * 0.5, this.heightPixels * 0.5, 10, 0, Math.PI * 2);
		gc.stroke();

		const options: MandelbrotOptions = {
			bailOut: this.bailOut,
			limbCount: this.limbCount
		};

		const orbitChunk: OrbitSample<number>[] = [];
console.log(this.center.real.valueOf(), this.center.imag.valueOf());

		while((period = periods.shift())) {
			for(let iter = orbitChunk.length; iter < period; ++iter) {
				orbitChunk[iter] = {
					real: 0,
					imag: 0,
					dReal: 0,
					dImag: 0
				};
			}

			referencePoint.setValue(this.center);
			options.iterationsPerFrame = period;

			for(i = 0; i < 100; ++i) {
				this.orbitState = {
					real: referencePoint.real,
					imag: referencePoint.imag,
					dReal: new BigFloat(1),
					dImag: new BigFloat(0)
				};

				try {
					iterateMandelbrot(referencePoint, this.orbitState, orbitChunk, options);
				} catch(err) { debugger; }

				const { real, imag, dReal, dImag } = this.orbitState;

				const dMag2 = dReal.mul(dReal, temp1).add(dImag.mul(dImag, temp2), temp3).valueOf();
				const deltaReal = real.mul(dReal, temp1).add(imag.mul(dImag, temp2), temp3).valueOf() / dMag2 / 2;
				const deltaImag = imag.mul(dReal, temp1).sub(real.mul(dImag, temp2), temp3).valueOf() / dMag2 / 2;

				if(deltaReal * deltaReal + deltaImag * deltaImag < epsilon2) {
					break;
				}

				referencePoint.real.sub(deltaReal, temp1);
				temp1.add(0, referencePoint.real).truncate(this.limbCount);
				referencePoint.imag.sub(deltaImag, temp1);
				temp1.add(0, referencePoint.imag).truncate(this.limbCount);

				if(i % 10 == 0) console.log('ref', referencePoint.real.valueOf(), referencePoint.imag.valueOf());

				gc.strokeStyle = i ? '#ff00ff' : '#ff0000';

				const { x, y } = this.toView(
					referencePoint.real,
					referencePoint.imag
				);

				gc.beginPath();
				gc.arc(x, y, 10, 0, Math.PI * 2);
				gc.stroke();
			}

			const { x, y } = this.toView(
				referencePoint.real,
				referencePoint.imag
			);

			gc.fillText('' + period, x, y);

			const { real, imag } = referencePoint;

			// Report point if it converged inside the view.
			if(i < 100 && real > sw.real && imag > sw.imag && real < ne.real && imag < ne.imag) {
				this.referencePoint.setValue(this.center);
				return;
			}
		}

		debugger;
		this.referencePoint.setValue(this.center);
	}

	restartOrbit() {
		// TODO: use setValue on component BigFloats instead.
		this.orbitState = {
			real: this.referencePoint.real,
			imag: this.referencePoint.imag,
			dReal: new BigFloat(1),
			dImag: new BigFloat(0)
		};
	}

	updateOrbit() {
		this.orbitChunkLen = iterateMandelbrot(
			this.referencePoint,
			this.orbitState,
			this.orbitChunk,
			this
		);
	}

	setPixelSize(widthPixels: number, heightPixels: number) {
		const size = Math.min(widthPixels, heightPixels);

		this.widthPixels = widthPixels;
		this.heightPixels = heightPixels;

		this.scaleReal = widthPixels / size * 2;
		this.scaleImag = heightPixels / size * 2;
		this.bitsNeeded = Math.ceil(Math.log(size) / Math.log(2) - this.zoomExponent);
		this.pixelSize = Math.pow(2, this.zoomExponent) / size;
		this.limbCount = (this.bitsNeeded >> 5) + 1;
	}

	/** Create another view from this one, zoomed towards (x, y) in local view
	  * coordinates (see offsetCenter for details).
	  *
	  * Complex coordinates at local (x, y) coordinates in both views will match.
	  *
	  * @param x Horizontal coordinate from -1 (left) to 1 (right edge).
	  * @param y Vertical coordinate from -1 (bottom) to 1 (top edge).
	  * @param amount Zoom exponent offset. For example 1 makes a new view
	  * zoomed to a one quarter sized part of this one. */

	zoomedTo(x: number, y: number, amount: number) {
		const scale = 1 - Math.pow(2, amount);

		const view = new MandelbrotView(
			this.offsetCenter(x * scale, y * scale),
			this.zoomExponent + amount,
			this
		);

		view.setPixelSize(this.widthPixels, this.heightPixels);

		return(view);
	}

	iterationsPerFrame: number;
	bailOut: number;
	maxPeriod: number;

	widthPixels: number;
	heightPixels: number;
	pixelSize: number;

	/** View center location. */
	center: BigComplex;

	/** Lowest limit cycle period within the view. */
	periods: number[];
	/** Perturbation reference orbit parameter. */
	referencePoint = new BigComplex();

	/** Latest <iterationsPerFrame> points on the reference orbit. */
	orbitChunk: OrbitSample<number>[] = [];
	/** Should equal <iterationsPerFrame>, but less if
	  * (badly chosen) reference orbit just escaped. */
	orbitChunkLen: number;

	/** Latest arbitrary precision state of the reference orbit,
	  * for initializing the next chunk. */
	orbitState: OrbitSample<BigFloat>;

	/** Horizontal scale compared to a square-shaped view.
	  * Equals aspect ratio (width / height) for landscape orientation, 1 for portrait. */
	scaleReal = 1;
	/** Vertical scale compared to a square-shaped view.
	  * Equals aspect ratio (height / width) for portrait orientation, 1 for landscape. */
	scaleImag = 1;
	/** Bits of precision needed to distinguish pixel coordinates. */
	bitsNeeded: number;
	limbCount: number;

}
