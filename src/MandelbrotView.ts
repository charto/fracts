import { BigFloat32 as BigFloat, BigComplex32 as BigComplex, BigFloat32 } from 'bigfloat';

export interface OrbitSample<Type> {
	real: Type;
	imag: Type;
	dReal: Type;
	dImag: Type;
}

export interface MandelbrotOptions {
	iterationsPerStep?: number;
	bailOut?: number;
}

/** Represents a view of the Mandelbrot fractal with a center point and zoom.
  * From them, a suitable permutation reference orbit location is calculated.
  * The full reference orbit can be retrieved in chunks for iteratively
  * producing an image of the fractal. */

export class MandelbrotView implements MandelbrotOptions {

	constructor(
		centerReal: BigFloat | number = 0,
		centerImag: BigFloat | number = 0,
		public zoomExponent = 0,
		options: MandelbrotOptions = {}
	) {
		this.center = new BigComplex(centerReal, centerImag);
		this.iterationsPerStep = options.iterationsPerStep || 64;
		this.bailOut = options.bailOut || 256;

		this.calculatePeriod();
		this.calculateReferencePoint();
		this.restartOrbit();

		// Initialize empty reference orbit chunk.

		for(let iter = 0; iter < this.iterationsPerStep; ++iter) {
			this.orbitChunk[iter] = {
				real: 0,
				imag: 0,
				dReal: 0,
				dImag: 0
			};
		}
	}

	private calculatePeriod() {
	}

	private calculateReferencePoint() {
		// TODO
		this.referencePoint = this.center;
	}

	restartOrbit() {
		this.orbitState = {
			real: this.referencePoint.real,
			imag: this.referencePoint.imag,
			// Derivative for distance estimation, initially 1.
			dReal: new BigFloat(1),
			dImag: new BigFloat(0)
		};
	}

	updateOrbit() {
		const orbitChunk = this.orbitChunk;
		let { real, imag, dReal, dImag } = this.orbitState;
		let refReal = this.referencePoint.real;
		let refImag = this.referencePoint.imag;
		const real2 = real.mul(real).truncate(2);
		const imag2 = imag.mul(imag).truncate(2);
		const temp1 = new BigFloat32();
		const temp2 = new BigFloat32();
		const temp3 = new BigFloat32();
		const dNext = new BigFloat32();
		const one = new BigFloat32(1);
		const two = new BigFloat32(2);

		real = real.clone();
		imag = imag.clone();

		const bailOut2 = this.bailOut * this.bailOut;
		const maxIter = this.iterationsPerStep;
		let iter = 0;

		while(iter < maxIter && real2.add(imag2, temp1).valueOf() < bailOut2) {
			const sample = orbitChunk[iter++];

			sample.real = real.valueOf();
			sample.imag = imag.valueOf();
			sample.dReal = dReal.valueOf();
			sample.dImag = dImag.valueOf();

			real.mul(dReal, temp1).truncate(2).sub(imag.mul(dImag, temp2).truncate(2), temp3).mul(two, dNext);
			real.mul(dImag, temp1).truncate(2).add(imag.mul(dReal, temp2).truncate(2), temp3).mul(two, dImag);
			dNext.add(one, dReal);

			real.mul(imag, temp1).truncate(2).mul(two, temp2).add(refImag, imag);
			real2.sub(imag2, temp1).add(refReal, real);

			real.mul(real, real2).truncate(2);
			imag.mul(imag, imag2).truncate(2);
		}

		this.orbitChunkLen = iter;
		this.orbitState.real = real;
		this.orbitState.imag = imag;
		this.orbitState.dReal = dReal;
		this.orbitState.dImag = dImag;
	}

	setPixelSize(width: number, height: number) {
		const size = Math.min(width, height);

		this.scaleReal = width / size * 2;
		this.scaleImag = height / size * 2;
		this.bitsNeeded = this.zoomExponent + Math.log(size) / Math.log(2);
	}

	zoomedTo(real: number, imag: number, amount: number) {
		const view = new MandelbrotView(
			this.center.real,
			this.center.imag,
			this.zoomExponent + amount
		);

		return(view);
	}

	iterationsPerStep: number;
	bailOut: number;

	/** View center location. */
	center: BigComplex;

	/** Lowest limit cycle period within the view. */
	period: number;
	/** Perturbation reference orbit location. */
	referencePoint: BigComplex;

	/** Latest <iterationsPerStep> points on the reference orbit. */
	orbitChunk: OrbitSample<number>[] = [];
	/** Should equal <iterationsPerStep>, but less if
	  * (badly chosen) reference orbit just escaped. */
	orbitChunkLen: number;

	/** Latest arbitrary precision state of the reference orbit,
	  * for initializing the next chunk. */
	orbitState: OrbitSample<BigFloat>;

	scaleReal: number;
	scaleImag: number;
	/** Bits of precision required to distinguish pixel coordinates.
	  * Orbit iterations can use the same precision. */
	bitsNeeded: number;

}
