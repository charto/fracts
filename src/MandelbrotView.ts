import {
	BigFloat32 as BigFloat,
	BigComplex32 as BigComplex
} from 'bigfloat';

import { MandelbrotOptions, OrbitSample, tempFloats } from './util';
import { PeriodFinder } from './PeriodFinder';
import { MinibrotFinder } from './MinibrotFinder';
import { View } from './History';

// TODO: Rename to KeyFrame

/** Represents a view of the Mandelbrot fractal with a center point and zoom.
  * From them, a suitable permutation reference orbit location is calculated.
  * The full reference orbit can be retrieved in chunks for iteratively
  * producing an image of the fractal. */

export class MandelbrotView implements MandelbrotOptions {

	constructor(
		center: BigComplex | [number, number] = new BigComplex(),
		public zoomExponent = 0,
		options: MandelbrotOptions = {},
		view?: View
	) {
		if(!(center instanceof BigComplex)) {
			center = new BigComplex(center[0], center[1]);
		}

		this.center = center;
		this.maxIterations = options.maxIterations || 64;
		this.bailOut = options.bailOut || 256;
		this.maxPeriod = options.maxPeriod;

		this.setPixelSize(
			options.widthPixels || 1024,
			options.heightPixels || 1024
		);

		this.mini = new MinibrotFinder(
			center,
			this.offsetCenter(-1, -1),
			this.offsetCenter(1, 1),
			zoomExponent,
			this
		);

		this.mini.view = view!;
		this.mini.find();
		this.mini.restartOrbit();
	}

	offsetCenter(x: number, y: number) {
		const zoom = this.zoomExponent;
		const scale = Math.pow(2, zoom);

		return(new BigComplex(
			this.center.real.add(x * this.scaleReal * scale),
			this.center.imag.add(y * this.scaleImag * scale)
		));
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

		return(this);
	}

	maxIterations: number;
	bailOut: number;
	maxPeriod?: number;

	widthPixels: number;
	heightPixels: number;
	pixelSize: number;

	/** View center location. */
	center: BigComplex;

	mini: MinibrotFinder;

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
