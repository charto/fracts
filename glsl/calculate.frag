#extension GL_EXT_draw_buffers : require

precision highp float;

uniform vec2 uCenterHi;
uniform vec2 uCenterLo;
uniform vec2 uScale;
uniform float uSize;
uniform float uZoom;
uniform int uIter;
uniform sampler2D uExact;
uniform sampler2D uOrbit;
uniform sampler2D uData;

varying vec2 vPos;

const float dekkerSplitter = 8193.0;

const int maxIter = 64;
const int perturbStride = 256;

const float bailOut = 256.0;
const float bailOut2 = bailOut * bailOut;

const float limit1 = pow(2.0, 24.0);
const float limit2 = pow(2.0, 47.0);

const vec4 v1122 = vec4( 1.0, 1.0,  2.0, 2.0);
const vec4 va1b2 = vec4(-1.0, 1.0, -2.0, 2.0);
const vec4 v2211 = vec4( 2.0, 2.0,  1.0, 1.0);
const vec2 zero2 = vec2(0.0);
const vec4 zero4 = vec4(0.0);

// Basic arithmetic operators that disable incorrect optimizations
// by using a "nonlinear" step.

vec4 times(vec4 a, vec4 b) {
	return(mix(zero4, a * b, step(0.0, abs(b))));
}

vec4 plus(vec4 a, vec4 b) {
	return(mix(a, a + b, step(0.0, abs(b))));
}

vec4 minus(vec4 a, vec4 b) {
	return(mix(a, a - b, step(0.0, abs(b))));
}

float minus(float a, float b) {
	return(mix(a, a - b, step(0.0, abs(b))));
}

// Sum respective elements of two vectors.
// Return a matrix (representing an unevaluated sum)
// with the sum vector, and a vector of rounding errors.

mat4 twoSum(vec4 a, vec4 b) {
	vec4 estimate = plus(a, b);
	vec4 b2 = estimate - a;
	vec4 a2 = estimate - b2;

	return(mat4(
		estimate,
		minus(a, a2) + minus(b, b2),
		zero4,
		zero4
	));
}

// Sum respective elements of two vectors a >= b.
// Return a matrix (representing an unevaluated sum)
// with the sum vector, and a vector of rounding errors.

mat4 fast2Sum(vec4 a, vec4 b) {
	vec4 estimate = a + b;

	return(mat4(
		estimate,
		minus(a, estimate) + b,
		zero4,
		zero4
	));
}

// Multiply respective elements of two vectors.
// Return a matrix (representing an unevaluated sum)
// with the product vector, and a vector of rounding errors.

mat4 twoProd(vec4 a, float b) {
	vec4 estimate = a * b;

	vec4 a2 = a * dekkerSplitter;
	vec4 aHi = minus(a2, a2 - a);
	vec4 aLo = a - aHi;

	float b2 = b * dekkerSplitter;
	float bHi = minus(b2, b2 - b);
	float bLo = b - bHi;

	return(mat4(
		estimate,
		aLo * bLo - (estimate - aHi * bHi - aLo * bHi - aHi * bLo),
		zero4,
		zero4
	));
}

// Multiply together two unevaluated sums of vectors and their rounding errors.
// Return a matrix (representing an unevaluated sum)
// with the product vector, and a vector of rounding errors.

mat4 mul(vec4 aHi, vec4 aLo, float bHi, float bLo, vec4 scale) {
	// return(mat4(aHi * bHi * scale, zero4, zero4, zero4));

	mat4 prod = twoProd(aHi, bHi);

	return(fast2Sum(
		prod[0] * scale,
		(prod[1] + aHi * bLo + aLo * bHi) * scale)
	);
}

// Sum together two unevaluated sums of two vectors, represented as matrices
// with the vectors and their rounding errors.
// Return the result in a similar matrix.

mat4 add(mat4 a, mat4 b) {
	// return(a + b);

	mat4 hh = twoSum(a[0], b[0]);
	mat4 ll = twoSum(a[1], b[1]);
	mat4 hl = fast2Sum(hh[0], hh[1] + ll[0]);

	return(fast2Sum(hl[0], hl[1] + ll[1]));
}

// At shallowest zoom depths,
// use highp floats (should be IEEE 754 single precision).

int mandelSingle(out vec4 z, inout float distMin, out int period) {
	vec4 a = zero4, b = zero4;
	vec4 init = vec4(uCenterHi + vPos * uZoom * uScale, 1.0, 0.0);
	float dist;

	for(int iter = 1; iter < maxIter; ++iter) {
		z = a + b + init;
		a = z      * z.x * v1122;
		b = z.yxwz * z.y * va1b2;

		dist = a.x - b.x;

		if(dist < distMin) {
			period = iter;
			distMin = dist;
		} else if(dist > bailOut2) return(iter);
	}

	return(0);
}

// At shallow zooms past IEEE 754 single precision,
// use pairs of highp floats and error free transformations.

int mandelDouble(out mat4 z) {
	mat4 a = mat4(zero4, zero4, zero4, zero4);
	mat4 b = a;

	a[0] = vec4(uCenterHi, 1.0, 0.0);
	a[1].xy = uCenterLo;
	b[0].xy = vPos * uZoom * uScale;

	mat4 init = add(a, b);

	a[0] = a[1] = b[0] = zero4;

	for(int i = 1; i < maxIter; ++i) {
		z = add(add(a, b), init);
		a = mul(z[0],      z[1],      z[0].x, z[1].x, v1122);
		b = mul(z[0].yxwz, z[1].yxwz, z[0].y, z[1].y, va1b2);

		if(add(a, -b)[0].x > bailOut2) return(i);
	}

	return(0);
}

// Use perturbation for deeper zooms.

int mandelPerturb(out vec4 z, inout float distMin, out int period) {
	vec4 init = vec4(vPos * uZoom * uScale, zero2);
	vec4 exact;
	float dist;
	z = init;

	exact = texture2D(uExact, (zero2 + 0.5) / float(perturbStride));

	for(int iter = 1; iter < maxIter; ++iter) {
		vec4 total = z + exact * v2211;

		z = (init +
			z.x  * total   * v1122    + z.y  * total.yxwz * va1b2 + vec4(zero2,
			z.zw * exact.x * v1122.zw + z.wz * exact.y    * va1b2.zw
		));

		int y = iter / perturbStride;
		exact = texture2D(uExact, (vec2(iter - y * perturbStride, y) + 0.5) / float(perturbStride));

		dist = dot(z.xy + exact.xy, z.xy + exact.xy);

		if(dist < distMin) {
			period = iter;
			distMin = dist;
		} else if(dist > bailOut2) {
			z += exact;
			return(iter);
		}
	}

	return(0);
}

void main() {
	vec2 uv = (vPos + 1.0) * 0.5;
	mat4 z = mat4(texture2D(uOrbit, uv), zero4, zero4, zero4);
	vec4 data = texture2D(uData, uv);
	int iter = int(data.x);
	int period = int(data.y);
	float distMin = data.z;

	if(uIter == 0) {
		z[0] = zero4;
		iter = 0;
		period = 0;
		distMin = bailOut2;
	} else if(iter != 0) {
		gl_FragData[0] = z[0];
		gl_FragData[1] = data;
		return;
	}

	if(uSize < limit1) {
		iter += mandelSingle(z[0], distMin, period);
	} else if(uSize < -limit2) {
		iter += mandelDouble(z);
	} else {
		iter += mandelPerturb(z[0], distMin, period);
	}

	gl_FragData[0] = z[0];
	gl_FragData[1] = vec4( float(iter), float(period), distMin, 1.0 );
}
