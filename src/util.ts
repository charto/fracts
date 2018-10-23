import {
	BigFloat32 as BigFloat,
	BigComplex32 as BigComplex
} from 'bigfloat';

export const tempFloats = [ new BigFloat(), new BigFloat(), new BigFloat() ];

export interface MandelbrotOptions {
	/** Iterations in a single WebGL shader invocation. Higher numbers increase
	  * user interface lag from GPU load. Perturbation reference orbit is also
	  * calculated in chunks, only the iterations needed for the next frame. */
	iterationsPerFrame?: number;

	/** Magnitude for orbit points considered to have escaped the set.
	  * Traditionally 2, but 256 produces more accurate derivatives needed for
	  * distance estimation and smooth coloring. */
	bailOut?: number;

	/** Iteration limit for period autodetection (needed for perturbation),
	  * to avoid hangs in case of errors or extremely high periods. */
	maxPeriod?: number;

	/** Number of 32-bit arbitrary precision limbs needed to distinguish pixel
	  * coordinates inside this view, which is sufficient also for iterated
	  * orbit calculations. */
	limbCount?: number;

	/** View width in pixels. */
	widthPixels?: number;
	/** View height in pixels. */
	heightPixels?: number;
}

export interface OrbitSample<Type> {
	real: Type;
	imag: Type;
	/** Derivative for distance estimation, initially 1. */
	dReal: Type;
	/** Derivative for distance estimation, initially 0. */
	dImag: Type;
}

/** Calculate sign of the 2D cross product AKA perp dot product AKA 2x2 matrix
  * determinant. Always correct, using arbitrary precision if needed.
  *
  * @return Zero or an arbitrary number with sign matching the determinant. */

export function detSign(a1: BigFloat, b1: BigFloat, b2: BigFloat, a2: BigFloat) {
	const a = a1.valueOf() * a2.valueOf();
	const b = b1.valueOf() * b2.valueOf();

	// Similar to: return(Math.sign(a - b));
	return(
		+(a > b) - +(a < b) ||
		// If a and b seem equal, check again using arbitrary precision math.
		a1.mul(a2, tempFloats[0]).deltaFrom(b1.mul(b2, tempFloats[1]))
	);
}
