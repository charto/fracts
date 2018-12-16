import { MandelbrotOptions } from './util';
import { MinibrotFinder } from './MinibrotFinder';
import { View } from './History';

/** Represents a view of the Mandelbrot fractal with a center point and zoom.
  * From them, a suitable permutation reference orbit location is calculated.
  * The full reference orbit can be retrieved in chunks for iteratively
  * producing an image of the fractal. */

export class KeyFrame {

	constructor(
		view: View,
		options: MandelbrotOptions = {},
	) {
		this.view = view.clone();

		this.width = options.widthPixels || 1024;
		this.height = options.heightPixels || 1024;

		const size = Math.min(this.width, this.height);

		/** Horizontal scale compared to a square-shaped view.
		  * Equals aspect ratio (width / height) for landscape orientation, 1 for portrait. */
		const scaleReal = this.width / size * 2;
		/** Vertical scale compared to a square-shaped view.
		  * Equals aspect ratio (height / width) for portrait orientation, 1 for landscape. */
		const scaleImag = this.height / size * 2;

		this.mini = new MinibrotFinder(
			view.center.value,
			view.toGlobal(-scaleReal, -scaleImag),
			view.toGlobal(scaleReal, scaleImag),
			view.zoomExponent,
			options
		);

		this.mini.view = view;
		this.mini.find();
	}

	view: View;

	width: number;
	height: number;

	mini: MinibrotFinder;
	renderPassCount = 0;
	minIterReached = false;
	niceIterReached = false;
	maxIterReached = false;
	escapedCount = -1;

}
