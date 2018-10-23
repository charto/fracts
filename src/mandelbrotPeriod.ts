import { BigComplex32 as BigComplex } from 'bigfloat';

import { MandelbrotOptions, detSign } from './util';

/** Temporary storage to avoid allocating memory while iterating. */
export const tempComplex = new BigComplex();

/* TODO (this should run in a Web Worker):
export class PeriodFinder {

	constructor(
		sw: BigComplex,
		ne: BigComplex,
		options: MandelbrotOptions = {}
	) {}

	iterate() {}

} */

class FakeSample extends BigComplex {

	setValue(z: BigComplex) {
		const real = z.real.valueOf();
		const imag = z.imag.valueOf();
		const abs = Math.sqrt(real * real + imag * imag);

		this.real.setValue(real / abs);
		this.imag.setValue(imag / abs);

		return(this);
	}

	add(addend: BigComplex) { return(this); }

}

const realSamples = [ new BigComplex(), new BigComplex(), new BigComplex(), new BigComplex() ];
const fakeSamples = [ new FakeSample(), new FakeSample(), new FakeSample(), new FakeSample() ];

/** Calculate lowest Mandelbrot limit cycle period among points inside a
  * rectangle, using Robert Munafo's method based on the Jordan curve theorem.
  *
  * This will fail if no periodic points exist (no point in the view belongs
  * to the Mandelbrot set, making it pretty boring).
  *
  * @param sw Bottom left corner complex coordinates.
  * @param ne Top right corner complex coordinates. */

export function mandelbrotPeriod(
	sw: BigComplex,
	ne: BigComplex,
	options: MandelbrotOptions = {}
) {
	const bailOut = options.bailOut || 2;
	/** Orbit escape threshold to avoid looping if the entire set
		 * is outside this view. */
	const bailOut2 = bailOut * bailOut;
	/** Maximum iterations to excessive lag. */
	const maxPeriod = 128 || options.maxPeriod || 8192;
	/** Number of arbitrary precision limbs to use in calculations. */
	const limbCount = options.limbCount || 2;

	/** Complex coordinates of all view corner points. */
	const corners = [
		sw,
		new BigComplex(sw.real, ne.imag),
		ne,
		new BigComplex(ne.real, sw.imag)
	];

	/** Intermediate points for orbits with parameters at view corners. */
	const samples: (BigComplex | FakeSample)[] = [];
	let sample: BigComplex | FakeSample;
	let real: number;
	let imag: number;
	let period = 1;
	let sign: number;
	let imagSign: number;
	let imagSignPrev: number;

	const periods = [];

	for(let num = 0; num < 4; ++num) {
		samples[num] = realSamples[num].setValue(corners[num]);
	}

	/*
		Consider a quadrilateral joining orbit points with equal iteration
		counts, their parameters matching the view corners.

		If the origin is inside the quad, then some orbit with a parameter
		inside the view would have returned to the origin at the same
		iteration count [citation needed].

		Because all orbits start at the origin, it has returned to its
		initial state and repeats the same exact orbit with a period
		matching the iteration count when it first returned to the origin.

		That period is the shortest possible inside the view, corresponding
		to a minibrot cardioid or Misiurewicz point [citation needed].

		A point in polygon test based on cross products determines if a
		quad contains the origin. If its edges cross a coordinate axis half
		(excluding zero) an odd number of times, the origin must be inside.
	*/

console.log('FIND...');

	do {
		// Start with a positive sign, meaning an even number of crossings.
		sign = 1;
		imagSign = samples[3].imag.getSign();

		for(let num = 0; num < 4; ++num) {
			// Get a corner point and delta to the next corner point,
			// forming an edge of the bounding quad.
			sample = samples[num];
			imagSignPrev = imagSign;
			imagSign = sample.imag.getSign();

			if(imagSign * imagSignPrev < 0) {
				samples[(num + 1) & 3].sub(sample, tempComplex);

				// console.log(sample.real.valueOf(), sample.imag.valueOf(), tempComplex.real.valueOf(), tempComplex.imag.valueOf(), detSign(sample.real, sample.imag, tempComplex.real, tempComplex.imag), tempComplex.imag.getSign());

				// Flip sign if the edge crosses one half of the real axis
				// (excluding zero). This may check for the positive or
				// negative half (depending on latest code changes).
				// Either one works, as long as all edges use the same check.

				console.log(sample.real.valueOf(), sample.imag.valueOf(), detSign(sample.real, sample.imag, tempComplex.real, tempComplex.imag), tempComplex.imag.getSign());

				sign *= (
					detSign(sample.real, sample.imag, tempComplex.real, tempComplex.imag) *
					tempComplex.imag.getSign()
				) || 1;
			}
		}

		// If the final sign is negative, it must have been flipped an odd
		// number of times, meaning the orbit of some unknown point inside
		// this view just returned to the origin ending its first period.

		if(sign < 0) {
			console.log('FOUND ' + period + ' SIGN = ' + sign);
			// return(period - 1);
			periods.push(period);
		}

		// Advance orbits with parameters at all corner points by one step.

		for(let num = 0; num < 4; ++num) {
			sample = samples[num];

			real = sample.real.valueOf();
			imag = sample.imag.valueOf();

			if(real * real + imag * imag > bailOut2) {
				// Point has escaped and now only its angle matters.
				// Fake an infinite magnitude by removing the add method.
				// Normalize the length to 1 to avoid overflow when squaring.
				samples[num] = fakeSamples[num].setValue(sample);
			}

			// z = z^2 + c
			samples[num].sqr(tempComplex).add(corners[num], samples[num]).truncate(limbCount);
		}
	} while(period++ < maxPeriod);

	console.log('DIVERGED', periods.join(','));
	// debugger;

	// Period finding failed.
	// return(periods[2] || periods[1] || periods[0] || 0);
	return(periods);
}
