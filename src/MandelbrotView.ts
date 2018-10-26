import {
	BigFloat32 as BigFloat,
	BigComplex32 as BigComplex
} from 'bigfloat';

import { MandelbrotOptions, OrbitSample, tempFloats } from './util';
import { PeriodFinder } from './PeriodFinder';

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
		// This grows larger at deeper zooms, so we always round
		// to only one fractional limb.
		real.mul(dReal, temp1).sub(
			imag.mul(dImag, temp2),
			temp3
		).truncate(1).mul(two, dNext);

		real.mul(dImag, temp1).add(
			imag.mul(dReal, temp2),
			temp3
		).truncate(1).mul(two, dImag);

		dNext.add(one, dReal);

		// z = z^2 + c
		real.mul(imag, temp1).truncate(limbCount).mul(two, temp2).add(imagParam, imag);
		real2.sub(imag2, temp1).add(realParam, real);

		real.mul(real, real2).truncate(limbCount);
		imag.mul(imag, imag2).truncate(limbCount);
	} while(iter < maxIter && real2.add(imag2, temp1).valueOf() < bailOut2);

	console.log(iter, dReal.toString(), dImag.toString());

	orbitState.real = real;
	orbitState.imag = imag;
	orbitState.dReal = dReal;
	orbitState.dImag = dImag;

	return(iter);
}

interface Newton {
	sw: BigComplex,
	ne: BigComplex,
	period: number;
	orbitChunk: OrbitSample<number>[];
	referencePoint: BigComplex;
	closestReference: BigComplex;
	epsilon2: number;
	gc: CanvasRenderingContext2D,
	view: MandelbrotView
}

function newtonStep(state: Newton, options: MandelbrotOptions) {
	const [ temp1, temp2, temp3 ] = tempFloats;
	const { sw, ne, period, orbitChunk, referencePoint, closestReference, epsilon2, gc, view } = state;
	const tempComplex = new BigComplex();
	const orbitState: OrbitSample<BigFloat> = {
		real: new BigFloat(),
		imag: new BigFloat(),
		dReal: new BigFloat(),
		dImag: new BigFloat()
	};
	let step: number;

	for(let iter = orbitChunk.length; iter < period; ++iter) {
		orbitChunk[iter] = {
			real: 0,
			imag: 0,
			dReal: 0,
			dImag: 0
		};
	}

	options.iterationsPerFrame = period;

	for(step = 0; step < 64; ++step) {
		orbitState.real.setValue(referencePoint.real);
		orbitState.imag.setValue(referencePoint.imag);
		orbitState.dReal.setValue(1);
		orbitState.dImag.setValue(0);

		try {
			iterateMandelbrot(referencePoint, orbitState, orbitChunk, options);
		} catch(err) { debugger; }

		const { real, imag, dReal, dImag } = orbitState;

		const dMag2 = dReal.mul(dReal, temp1).add(dImag.mul(dImag, temp2), temp3).valueOf(); //  * 2;
		const deltaReal = real.mul(dReal, temp1).add(imag.mul(dImag, temp2), temp3).valueOf() / dMag2;
		const deltaImag = imag.mul(dReal, temp1).sub(real.mul(dImag, temp2), temp3).valueOf() / dMag2;

		if(deltaReal * deltaReal + deltaImag * deltaImag < epsilon2) {
			break;
		}

		referencePoint.real.sub(deltaReal, tempComplex.real);
		referencePoint.imag.sub(deltaImag, tempComplex.imag);
		referencePoint.setValue(tempComplex.truncate(options.limbCount!));

		// if(i % 10 == 0) console.log('ref', referencePoint.real.valueOf(), referencePoint.imag.valueOf());

		gc.strokeStyle = step ? '#ff00ff' : '#ff0000';

		const { x, y } = view.toView(
			referencePoint.real,
			referencePoint.imag
		);

		gc.beginPath();
		gc.arc(x, y, 10, 0, Math.PI * 2);
		gc.stroke();
	}

	const { x, y } = view.toView(
		referencePoint.real,
		referencePoint.imag
	);

	gc.fillText('' + period, x, y);

	return(step < 64);
}

/** Represents a view of the Mandelbrot fractal with a center point and zoom.
  * From them, a suitable permutation reference orbit location is calculated.
  * The full reference orbit can be retrieved in chunks for iteratively
  * producing an image of the fractal. */

export class MandelbrotView implements MandelbrotOptions {

	constructor(
		center: BigComplex | [number, number] = new BigComplex(),
		public zoomExponent = 0,
		options: MandelbrotOptions = {}
	) {
		if(!(center instanceof BigComplex)) {
			center = new BigComplex(center[0], center[1]);
		}

		this.center = center;
		this.iterationsPerFrame = options.iterationsPerFrame || 64;
		this.bailOut = options.bailOut || 256;
		this.maxPeriod = options.maxPeriod;

		this.setPixelSize(
			options.widthPixels || 1024,
			options.heightPixels || 1024
		);

		this.calculateReferencePoint(
			this.offsetCenter(-1, -1),
			this.offsetCenter(1, 1)
		);

		this.restartOrbit();
	}

	/** Get complex coordinates from local view coordinates.
	  *
	  * Local coordinates have the view center at the origin and all edges are
	  * one unit away from it. This matches a WebGL viewport.
	  *
	  * @param x Local horizontal coordinate from -1 (left) to 1 (right edge).
	  * @param y Local vertical coordinate from -1 (bottom) to 1 (top edge).
	  * @return Complex coordinates matching given local coordinates. */

	// TODO: Rename to applyOffset
	offsetCenter(x: number, y: number) {
		const zoom = this.zoomExponent;
		const scale = Math.pow(2, zoom);

		return(new BigComplex(
			this.center.real.add(x * this.scaleReal * scale),
			this.center.imag.add(y * this.scaleImag * scale)
		));
	}

	getOffset(real: BigFloat, imag: BigFloat) {
		const [ temp1, temp2, temp3 ] = tempFloats;
		const zoom = this.zoomExponent;
		const scale = Math.pow(2, zoom);

		return({
			x: real.sub(this.center.real, temp1).valueOf() / (this.scaleReal * scale),
			y: imag.sub(this.center.imag, temp1).valueOf() / (this.scaleImag * scale)
		})
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
		ne: BigComplex
	) {
		const options: MandelbrotOptions = {
			bailOut: this.bailOut,
			maxPeriod: this.maxPeriod,
			limbCount: this.limbCount
		};
		const epsilon2 = this.pixelSize * this.pixelSize;
		const periodFinder = new PeriodFinder(sw, ne, options);
		const referencePoint = new BigComplex();
		const tempComplex = new BigComplex();
		let closestReference = this.center.clone();
		let closestDistance = Infinity;
		let outsideCount = 0;
		let period: number | undefined;

		const canvas = document.getElementById('gc2') as HTMLCanvasElement;
		const gc = canvas.getContext('2d')!;
		gc.clearRect(0, 0, canvas.width, canvas.height);
		gc.lineWidth = 2;
		gc.strokeStyle = '#ff0000';
		gc.font = '24px sans-serif';

		gc.beginPath();
		gc.arc(this.widthPixels * 0.5, this.heightPixels * 0.5, 10, 0, Math.PI * 2);
		gc.stroke();

		const orbitChunk: OrbitSample<number>[] = [];
		console.log(this.center.real.valueOf(), this.center.imag.valueOf(), this.zoomExponent);

		const newton: Newton = {
			sw,
			ne,
			period: 0,
			orbitChunk,
			referencePoint,
			closestReference,
			epsilon2,
			gc,
			view: this
		};

		while((period = periodFinder.next()) && outsideCount < 3) {
			referencePoint.setValue(this.center);
			newton.period = period;

			if(newtonStep(newton, options)) {
				const { real, imag } = referencePoint;

				if(
					real.deltaFrom(sw.real) > 0 &&
					imag.deltaFrom(sw.imag) > 0 &&
					real.deltaFrom(ne.real) < 0 &&
					imag.deltaFrom(ne.imag) < 0
				) {
					console.log('FOUND', period, referencePoint.real.valueOf(), referencePoint.imag.valueOf());

					// Report point if it converged inside the view.
					closestReference.setValue(referencePoint);
					break;
				} else {
					console.log('CONVERGE', period, referencePoint.real.valueOf(), referencePoint.imag.valueOf());

					// Store this point if it's closer to the view center than
					// the previous one was.

					referencePoint.sub(this.center, tempComplex);

					const deltaReal = tempComplex.real.valueOf();
					const deltaImag = tempComplex.imag.valueOf();
					const distance = deltaReal * deltaReal + deltaImag * deltaImag;

					if(distance < closestDistance) {
						closestReference.setValue(referencePoint);
						closestDistance = distance;
					}

					++outsideCount;
				}
			}
		}

		for(let i = 0; i < 4; ++i) console.log(periodFinder.samples[i].real.valueOf(), periodFinder.samples[i].imag.valueOf());
		console.log(closestReference.real.valueOf(), closestReference.imag.valueOf());

		let limbCount = options.limbCount!;
		let i: number;

		// Increase precision and refine estimate until reference orbit no longer escapes.

		for(i = 0; i < 10; ++i) {
			// TODO: This should be based on the size estimate.
			newton.epsilon2 /= 65536 * 65536;
			limbCount += 0.5;
			options.limbCount = ~~(limbCount + 0.5);

			console.log(referencePoint.real.toString(), referencePoint.imag.toString());
			console.log('NEWTON', newtonStep(newton, options));
			console.log(referencePoint.real.toString(), referencePoint.imag.toString());

			closestReference.setValue(referencePoint);
			this.referencePoint.setValue(closestReference);

			options.iterationsPerFrame = this.iterationsPerFrame;

			this.restartOrbit();
			const debug = this.updateOrbit(options);
			if(debug >= this.iterationsPerFrame) {
				console.log('ENOUGH', debug, i, period);
				break;
			}

			console.log('NOT ENOUGH', debug, i, period);
			console.log(JSON.stringify(options, null, '\t'));
		}

		if(i == 10) debugger;
	}

	restartOrbit() {
		// TODO: use setValue on component BigFloats instead.
		this.orbitState = {
			real: this.referencePoint.real,
			imag: this.referencePoint.imag,
			dReal: new BigFloat(1),
			dImag: new BigFloat(0)
		};

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

	updateOrbit(options?: MandelbrotOptions) {
		this.orbitChunkLen = iterateMandelbrot(
			this.referencePoint,
			this.orbitState,
			this.orbitChunk,
			options || this
		);

		return(this.orbitChunkLen);
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
	maxPeriod?: number;

	widthPixels: number;
	heightPixels: number;
	pixelSize: number;

	/** View center location. */
	center: BigComplex;

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
