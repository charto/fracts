/*
	We wish to render a rectangular view of the Mandelbrot set. To speed up
	rendering using perturbation, a reference point with the highest (usually
	infinite) iteration count is needed. Any point inside the Mandelbrot set
	will work, but finding one using Newton-Raphson requires knowing its period.

	We can start iterating orbit points in sync at all corners of the
	rectangular view, and consider a quadrilateral connecting them.

	If the origin is inside the quad, then the orbit of some point with a
	parameter inside the view would have returned to the origin at the same
	iteration count [citation needed].

	Because all orbits start at the origin, it has returned to its initial
	state and repeats the same exact orbit with a period matching the
	iteration count when it first returned to the origin.

	By iterating further to find more iterations containing the origin, the
	periods of all minibrot cardioids (and possibly Misiurewicz points) in the
	view will be found [citation needed].

	A point in polygon test based on cross products determines if a
	quad contains the origin. If its edges cross a coordinate axis half
	(excluding zero) an odd number of times, the origin must be inside.
*/

import { BigComplex32 as BigComplex } from 'bigfloat';

import { MandelbrotOptions, detSign } from './util';

/** Temporary storage to avoid allocating memory while iterating. */
export const tempComplex = new BigComplex();
export const zeroComplex = new BigComplex();

const epsilon = Math.pow(2, -16);

export class PeriodFinder implements MandelbrotOptions {

	/** @param sw Bottom left corner complex coordinates.
	  * @param ne Top right corner complex coordinates. */

	constructor(
		sw: BigComplex,
		ne: BigComplex,
		options: MandelbrotOptions = {}
	) {
		const bailOut = options.bailOut || 2;
		this.bailOut = bailOut;
		this.bailOut2 = bailOut * bailOut;
		this.maxPeriod = options.maxPeriod || 256;
		this.limbCount = options.limbCount || 2;

		/** Complex coordinates of all view corner points. */
		this.corners = [
			sw,
			new BigComplex(sw.real, ne.imag),
			ne,
			new BigComplex(ne.real, sw.imag)
		];

		for(let num = 0; num < 4; ++num) {
			this.samples[num] = this.corners[num].clone();
		}

		this.period = 0;
	}

	/** Calculate next lowest Mandelbrot limit cycle period among points inside a
	  * rectangle, using Robert Munafo's method based on the Jordan curve theorem.
	  *
	  * This will fail if no periodic points exist (no point in the view belongs
	  * to the Mandelbrot set, making it pretty boring). */

	next() {
		const bailOut2 = this.bailOut2;
		const maxPeriod = this.maxPeriod;
		const limbCount = this.limbCount;
		const samples = this.samples;
		const corners = this.corners.slice(0);
		let period = this.period;
		let sample: BigComplex;
		let real: number;
		let imag: number;
		let abs2: number;
		let abs: number;
		let sign = 0;
		let imagSign: number;
		let imagSignPrev: number;

		while(sign >= 0 && period++ < maxPeriod) {
			// Advance orbits with parameters at all corner points by one step.

			for(let num = 0; num < 4; ++num) {
				sample = samples[num];

				real = sample.real.valueOf();
				imag = sample.imag.valueOf();
				abs2 = real * real + imag * imag;

				if(abs2 > bailOut2) {
					console.log('BOOM', period, num, abs2);

					// Simulate points escaping all the way to infinity by
					// normalizing them to the unit circle and setting c=0.

					abs = Math.sqrt(abs2);
					sample.real.setValue(real / abs);
					sample.imag.setValue(imag / abs);
					corners[num] = zeroComplex;
				}

				// z = z^2 + c
				sample.sqr(tempComplex).add(corners[num], sample).truncate(limbCount);
// console.log('...', period, num, abs2, sample.real.valueOf(), sample.imag.valueOf(), limbCount);
			}

			// Test if a quadrilateral defined by the sample points contains
			// the origin (0, 0) by counting crossings using signs of cross
			// products. Start with a positive sign, meaning an even number
			// of crossings.

			sign = 1;
			imagSign = samples[3].imag.getSign();

			for(let num = 0; num < 4; ++num) {
				sample = samples[num];
				imagSignPrev = imagSign;
				imagSign = sample.imag.getSign();

				real = sample.real.valueOf();
				imag = sample.imag.valueOf();

				// Assume point is at origin if very close.

				if(real * real + imag * imag < epsilon) {
					sign = -1;
					break;
				}

				if(imagSign * imagSignPrev < 0) {
					// Get a corner point and delta to the next corner point,
					// forming an edge of the bounding quad.

					sample.sub(samples[(num + 3) & 3], tempComplex);

					const numer = (
						samples[(num + 3) & 3].real.valueOf() * imag -
						samples[(num + 3) & 3].imag.valueOf() * real
					);

					real = tempComplex.real.valueOf();
					imag = tempComplex.imag.valueOf();

					// Assume line crosses origin if very close.

					if(numer * numer / (real * real + imag * imag) < epsilon) {
						sign = -1;
						break;
					}

					// Flip sign if the edge crosses one half of the real axis
					// (excluding zero). This may check for the positive or
					// negative half (depending on latest code changes).
					// Either one works, as long as all edges use the same check.

					sign *= (
						detSign(sample.real, sample.imag, tempComplex.real, tempComplex.imag) *
						tempComplex.imag.getSign()
					) || 1;
				}
			}
		}

		this.period = period;
		console.log('Period = ', period);

		// If the final sign is negative, it must have been flipped an odd
		// number of times, meaning the orbit of some unknown point inside
		// this view just returned to the origin ending one period.
		// Otherwise max period was reached and period finding failed.

		return(sign < 0 ? this.period : 0);
	}

	bailOut: number;
	/** Orbit escape threshold. Magnitude of escaped points can be ignored. */
	bailOut2: number;
	/** Maximum iterations to excessive lag. */
	maxPeriod: number;
	/** Number of arbitrary precision limbs to use in calculations. */
	limbCount: number;

	private period: number;
	/** Intermediate points for orbits with parameters at view corners. */
	private samples: BigComplex[] = [];
	/** Complex coordinates of all view corner points. */
	private corners: BigComplex[] = [];

}
