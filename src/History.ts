import { types, getSnapshot, ModelSnapshotType } from 'mobx-state-tree';
import { mst, shim, action } from 'classy-mst';
import { BigFloat32 as BigFloat, BigComplex32 as BigComplex } from 'bigfloat';
import { autorun } from 'mobx';

export const zeroComplex = new BigComplex();
const tempFloat = new BigFloat();

const ComplexData = types.model({

	value: types.frozen(zeroComplex)

}).preProcessSnapshot(
	({ real, imag }: { real: string | number, imag: string | number }) => ({
		value: new BigComplex(real, imag, 16)
	})
).postProcessSnapshot(({ value }) => ({
	real: value.real.toString(16),
	imag: value.imag.toString(16)
}));

class ComplexCode extends shim(ComplexData) {

	@action
	setValue(value: BigComplex) {
		this.value = value;
	}

}

export const Complex = mst(ComplexCode, ComplexData, 'Todo');

const ViewData = types.model({

	center: Complex,
	zoomExponent: types.number

});

class ViewCode extends shim(ViewData) {

	/** Get complex coordinates from local view coordinates.
	  *
	  * Local coordinate origin is at the view center and nearest edges
	  * are one unit away from it.
	  * This matches a WebGL viewport but with uniform scaling.
	  *
	  * @param x Local horizontal coordinate from -1 (left) to 1 (right edge)
	  * for portrait orientation, otherwise unlimited.
	  * @param y Local vertical coordinate from -1 (bottom) to 1 (top edge)
	  * for landscape orientation, otherwise unlimited.
	  * @return Complex coordinates matching given local coordinates. */

	toGlobal(x: number, y: number) {
		const scale = Math.pow(2, this.zoomExponent + 1);
		const center = this.center.value;

		return(new BigComplex(
			center.real.add(x * scale),
			center.imag.add(y * scale)
		));
	}

	toLocal(real: BigFloat, imag: BigFloat) {
		const scale = Math.pow(2, this.zoomExponent + 1);
		const center = this.center.value;

		return({
			x: real.sub(center.real, tempFloat).valueOf() / scale,
			y: imag.sub(center.imag, tempFloat).valueOf() / scale
		})
	}

	/** Zoom view towards (x, y) in local coordinates.
	  *
	  * Complex coordinates at local (x, y) coordinates remain constant.
	  *
	  * @param x Horizontal coordinate from -1 (left) to 1 (right edge).
	  * @param y Vertical coordinate from -1 (bottom) to 1 (top edge).
	  * @param amount Zoom exponent offset, 1 zooms to quadrant size. */

	@action
	zoomTo(x: number, y: number, amount: number) {
		const scale = 1 - Math.pow(2, amount);

		this.center.setValue(this.toGlobal(x * scale, y * scale));
		this.zoomExponent += amount;
	}

}

// http://127.0.0.1:8080/?imag=1.19ada586fc43511efa14e&real=-0.328cd497337c112b295f1&zoom=-25.5625
// http://127.0.0.1:8080/?imag=1.19ade21608936cde4c5bc8e8&real=-0.3298ac8104620b340e59e398&zoom=-32.0625
// http://127.0.0.1:8080/?imag=0.5c90a9faddf9d13e674&real=-1.074ac777812c045ed28&zoom=-16.25
// Period should be 55...

export const View = mst(ViewCode, ViewData, 'View');

export type View = typeof View.Type;

/** querystring.parse equivalent that outputs keys in lowercase.
  * @param query Request URL including query string.
  * @param pos Index of one past the ? character signaling start of parameters. */

export function parseQuery(query: string, pos = query.indexOf('?') + 1 || query.length) {
	const paramTbl: { [key: string]: string } = {};

	do {
		const posKey = pos;
		const posArg = query.indexOf('=', pos) + 1;

		pos = query.indexOf('&', pos) + 1;
		const posEnd = pos || query.length + 1;

		if(posArg && posArg < posEnd) {
			const key = decodeURIComponent(
				query.substr(posKey, posArg - posKey - 1)
			).toLowerCase();

			if(key.match(/^[a-z]+$/)) {
				const val = decodeURIComponent(
					query.substr(posArg, posEnd - posArg - 1)
				);

				paramTbl[key] = val;
			}
		}
	} while(pos);

	return(paramTbl);
}

export function formatQuery(paramTbl: { [key: string]: string | number }) {
	return(
		Object.keys(paramTbl).sort().map(
			(key) => encodeURIComponent(key) + '=' + encodeURIComponent('' + paramTbl[key])
		).join('&')
	);
}

export class State {

	constructor() {
		const { real, imag, zoom } = parseQuery(location.search);

		console.log(real, imag, zoom);
		console.log(new BigComplex(0, 0, 16).real.valueOf());

		this.view = View.create({
			center: {
				real: real || 0,
				imag: imag || 0
			},
			zoomExponent: +zoom || 0
		});

		autorun(() => {
			const { center: { real, imag }, zoomExponent: zoom } = getSnapshot(this.view);

			this.update(formatQuery({ real, imag, zoom }));
		});
	}

	update(query: string) {
		if(window.history && window.history.replaceState) {
			const url = this.origin + this.path + '?' + query;

			window.history.replaceState(null, document.title, url);
		}
	}

	origin = window.location.origin || (
		(location.protocol.replace(/:$/,'') || 'http') +
		'://' +
		location.host +
		(location.port ? ':' + location.port : '')
	)

	path = location.pathname;

	view: View;

}
