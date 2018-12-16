import {
	BigFloat32 as BigFloat,
	BigComplex32 as BigComplex
} from 'bigfloat';

import { MandelbrotOptions, tempFloats } from './util';
import { PeriodFinder } from './PeriodFinder';
import { View } from './History';

export interface OrbitSample<Type> {
	real: Type;
	imag: Type;
	/** Derivative for distance estimation, initially 1. */
	dcReal: Type;
	/** Derivative for distance estimation, initially 0. */
	dcImag: Type;
}

export function iterateMandelbrot(
	param: BigComplex,
	orbitState: OrbitSample<BigFloat>,
	maxIter = 256,
	options: MandelbrotOptions = {},
	orbitChunk?: OrbitSample<number>[]
) {
	let { real, imag, dcReal, dcImag } = orbitState;
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
	let iter = 0;

	while(iter < maxIter && real2.add(imag2, temp1).valueOf() < bailOut2) {
		if(orbitChunk) {
			const sample = orbitChunk[iter];

			sample.real = real.valueOf();
			sample.imag = imag.valueOf();
			sample.dcReal = dcReal.valueOf();
			sample.dcImag = dcImag.valueOf();
		}

		// dc = 2 * z * dc + 1
		// This grows larger at deeper zooms, so we always round
		// to only one fractional limb.
		real.mul(dcReal, temp1).sub(
			imag.mul(dcImag, temp2),
			temp3
		).truncate(1).mul(two, dNext);

		real.mul(dcImag, temp1).add(
			imag.mul(dcReal, temp2),
			temp3
		).truncate(1).mul(two, dcImag);

		dNext.add(one, dcReal);

		// z = z^2 + c
		real.mul(imag, temp1).truncate(limbCount).mul(two, temp2).add(imagParam, imag);
		real2.sub(imag2, temp1).add(realParam, real);

		real.mul(real, real2).truncate(limbCount);
		imag.mul(imag, imag2).truncate(limbCount);
		++iter;
	}

	orbitState.real = real;
	orbitState.imag = imag;
	orbitState.dcReal = dcReal;
	orbitState.dcImag = dcImag;

	return(iter);
}

export class MinibrotFinder implements MandelbrotOptions {

	constructor(
		public center: BigComplex,
		public sw: BigComplex,
		public ne: BigComplex,
		public zoomExponent: number,
		options: MandelbrotOptions
	) {
		this.maxIterations = options.maxIterations || 64;
		this.bailOut = options.bailOut || 256;
		this.maxPeriod = options.maxPeriod || 512;

		const size = Math.min(
			options.widthPixels || 1024,
			options.heightPixels || 1024
		);

		const bitsNeeded = Math.ceil(Math.log(size) / Math.log(2) - this.zoomExponent);
		const pixelSize = Math.pow(2, this.zoomExponent) / size;

		this.limbCount = (bitsNeeded >> 5) + 1 + 1;
		this.epsilon2 = pixelSize * pixelSize;

		this.canvas = document.getElementById('gc2') as HTMLCanvasElement;
		this.gc = this.canvas.getContext('2d')!;
	}

	find() {
		const { center, sw, ne, epsilon2, referencePoint, canvas, gc } = this;
		const periodFinder = new PeriodFinder(sw, ne, this);
		const tempComplex = new BigComplex();
		let closestReference = center.clone();
		let closestDistance = Infinity;
		let closestPeriod = 0;
		let outsideCount = 0;

		gc.clearRect(0, 0, canvas.width, canvas.height);
		gc.lineWidth = 2;
		gc.strokeStyle = '#ff0000';
		gc.font = '24px sans-serif';

		gc.beginPath();
		gc.arc(canvas.width * 0.5, canvas.height * 0.5, 10, 0, Math.PI * 2);
		gc.stroke();

		const orbitChunk: OrbitSample<number>[] = [];
		console.log(center.real.valueOf(), center.imag.valueOf(), this.zoomExponent);

		// TODO: outsideCount limit is a random magic constant...
		while((this.period = periodFinder.next()) && outsideCount < 32) {
			console.log(this.period);
			referencePoint.setValue(center);

			if(this.newtonStep()) {
				const { real, imag } = referencePoint;

				if(
					real.deltaFrom(sw.real) > 0 &&
					imag.deltaFrom(sw.imag) > 0 &&
					real.deltaFrom(ne.real) < 0 &&
					imag.deltaFrom(ne.imag) < 0
				) {
					console.log('FOUND', this.period, referencePoint.real.valueOf(), referencePoint.imag.valueOf());

					// Report point if it converged inside the view.
					closestReference.setValue(referencePoint);
					closestPeriod = this.period;
					break;
				} else {
					console.log('CONVERGE', this.period, referencePoint.real.valueOf(), referencePoint.imag.valueOf());

					// Store this point if it's closer to the view center than
					// the previous one was.

					referencePoint.sub(center, tempComplex);

					const deltaReal = tempComplex.real.valueOf();
					const deltaImag = tempComplex.imag.valueOf();
					const distance = deltaReal * deltaReal + deltaImag * deltaImag;

					if(distance < closestDistance) {
						closestReference.setValue(referencePoint);
						closestDistance = distance;
						closestPeriod = this.period;
					}

					++outsideCount;
				}
			}
		}

		for(let i = 0; i < 4; ++i) console.log(periodFinder.samples[i].real.valueOf(), periodFinder.samples[i].imag.valueOf());
		console.log(closestReference.real.valueOf(), closestReference.imag.valueOf());

		referencePoint.setValue(closestReference);
		this.period = closestPeriod;

		let limbCount = this.limbCount;
		let i: number;

		// Increase precision and refine estimate until reference orbit no longer escapes.

		// TODO: loop max count is a random magic constant...
		// TODO: need size estimate to verify point is inside the minibrot!
		for(i = 0; i < 100; ++i) {
			this.epsilon2 /= 65536 * 65536;
			limbCount += 0.5;
			this.limbCount = ~~(limbCount + 0.5);

			console.log(referencePoint.real.toString(), referencePoint.imag.toString());
			console.log('NEWTON', this.newtonStep());
			console.log(referencePoint.real.toString(), referencePoint.imag.toString());

			// closestReference.setValue(referencePoint);
			// this.referencePoint.setValue(closestReference);

			// options.maxIterations = this.maxIterations;

			// TODO: replace arbitrary multiplication and this entire test by using size estimate.
			this.maxIterations *= 32;
			this.restartOrbit();
			const debug = this.updateOrbit();
			this.maxIterations /= 32;
			if(debug >= this.maxIterations * 32) {
				console.log('ENOUGH', debug, i, this.period);
				break;
			}

			console.log('NOT ENOUGH', debug, i, this.period);
			// console.log(JSON.stringify(this, null, '\t'));
		}

		if(i == 100) debugger;
	}

	restartOrbit() {
		// TODO: use setValue on component BigFloats instead.
		this.orbitState = {
			real: this.referencePoint.real,
			imag: this.referencePoint.imag,
			dcReal: new BigFloat(1),
			dcImag: new BigFloat(0)
		};

		// Initialize empty reference orbit chunk.

		for(let iter = 0; iter < this.maxIterations; ++iter) {
			this.orbitChunk[iter] = {
				real: 0,
				imag: 0,
				dcReal: 0,
				dcImag: 0
			};
		}
	}

	updateOrbit() {
		this.orbitChunkLen = iterateMandelbrot(
			this.referencePoint,
			this.orbitState,
			this.maxIterations,
			this,
			this.orbitChunk
		);

		return(this.orbitChunkLen);
	}

	newtonStep() {
		const widthPixels = this.canvas.offsetWidth;
		const heightPixels = this.canvas.offsetHeight;
		const size = Math.min(widthPixels, heightPixels);

		const [ temp1, temp2, temp3 ] = tempFloats;
		const { sw, ne, period, referencePoint, closestReference, epsilon2, gc, view } = this;
		const tempComplex = new BigComplex();
		const orbitState: OrbitSample<BigFloat> = {
			real: new BigFloat(),
			imag: new BigFloat(),
			dcReal: new BigFloat(),
			dcImag: new BigFloat()
		};
		let step: number;

		for(step = 0; step < 64; ++step) {
			orbitState.real.setValue(referencePoint.real);
			orbitState.imag.setValue(referencePoint.imag);
			orbitState.dcReal.setValue(1);
			orbitState.dcImag.setValue(0);

			try {
				iterateMandelbrot(referencePoint, orbitState, period, this);
			} catch(err) { debugger; }

			const { real, imag, dcReal, dcImag } = orbitState;

			const dMag2 = dcReal.mul(dcReal, temp1).add(dcImag.mul(dcImag, temp2), temp3).valueOf(); //  * 2;
			const deltaReal = real.mul(dcReal, temp1).add(imag.mul(dcImag, temp2), temp3).valueOf() / dMag2;
			const deltaImag = imag.mul(dcReal, temp1).sub(real.mul(dcImag, temp2), temp3).valueOf() / dMag2;

			if(deltaReal * deltaReal + deltaImag * deltaImag < epsilon2) {
				break;
			}

			referencePoint.real.sub(deltaReal, tempComplex.real);
			referencePoint.imag.sub(deltaImag, tempComplex.imag);
			referencePoint.setValue(tempComplex.truncate(this.limbCount));

			// if(i % 10 == 0) console.log('ref', referencePoint.real.valueOf(), referencePoint.imag.valueOf());

			gc.strokeStyle = step ? '#ff00ff' : '#ff0000';

			let { x, y } = view.toLocal(
				referencePoint.real,
				referencePoint.imag
			);

			x = (x * size + widthPixels) / 2;
			y = (heightPixels - y * size) / 2;
	
			gc.beginPath();
			gc.arc(x, y, 10, 0, Math.PI * 2);
			gc.stroke();
		}

		let { x, y } = view.toLocal(
			referencePoint.real,
			referencePoint.imag
		);

		x = (x * size + widthPixels) / 2;
		y = (heightPixels - y * size) / 2;

		gc.fillText('' + period, x, y);

		return(step < 64);
	}

	maxIterations: number;
	bailOut: number;
	maxPeriod?: number;

	limbCount: number;

	period: number;

	/** Perturbation reference orbit parameter. */
	referencePoint = new BigComplex();

	/** Latest <maxIterations> points on the reference orbit. */
	orbitChunk: OrbitSample<number>[] = [];
	/** Should equal <maxIterations>, but less if
	  * (badly chosen) reference orbit just escaped. */
	orbitChunkLen: number;

	/** Latest arbitrary precision state of the reference orbit,
	  * for initializing the next chunk. */
	orbitState: OrbitSample<BigFloat>;

	closestReference: BigComplex;
	epsilon2: number;

	canvas: HTMLCanvasElement;
	gc: CanvasRenderingContext2D;
	view: View;

}
