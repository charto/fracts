precision highp float;

uniform vec2 uCenterHi;
uniform vec2 uCenterLo;
uniform vec2 uScale;
uniform float uSize;
uniform float uZoom;
uniform sampler2D uExact;

varying vec2 vPos;

const float INVPI = 0.318309886183790671537767526745;
const float dekkerSplitter = 8193.0;

const float gridWidth = 0.125;
const float gridAlpha = 1.0 / 16.0;
const int maxIter = 1024;

const float bailOut = 256.0;
const float bailOut2 = bailOut * bailOut;
const float bailOutLog = log(bailOut) * 2.0;

const float dwellEdge = pow(bailOut, 4.0 - gridWidth);
const float phaseEdge = gridWidth / 64.0 * bailOutLog / log(2.0);

const float limit1 = pow(2.0, 24.0);
const float limit2 = pow(2.0, 47.0);

const vec4 scale1 = vec4( 1.0, 1.0,  2.0, 2.0);
const vec4 scale2 = vec4(-1.0, 1.0, -2.0, 2.0);
const vec4 zero = vec4(0.0);

// Fast branchless color space conversion from HSL to RGB.

const vec3 hueOffset = vec3(0.0, 2.0, 1.0) / 3.0;

vec3 hsl2rgb(float h, float s, float l) {
	s -= s * abs(l * 2.0 - 1.0);

	return(clamp(
		abs(fract(h + hueOffset) - 0.5) * 6.0 - 1.5,
		-0.5,
		0.5
	) * s + l);
}

// Basic arithmetic operators that disable incorrect optimizations
// by using a "nonlinear" step.

vec4 times(vec4 a, vec4 b) {
	return(mix(zero, a * b, step(0.0, abs(b))));
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
		zero,
		zero
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
		zero,
		zero
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
		zero,
		zero
	));
}

// Multiply together two unevaluated sums of vectors and their rounding errors.
// Return a matrix (representing an unevaluated sum)
// with the product vector, and a vector of rounding errors.

mat4 mul(vec4 aHi, vec4 aLo, float bHi, float bLo, vec4 scale) {
	// return(mat4(aHi * bHi * scale, zero, zero, zero));

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

void main() {
	mat4 z = mat4(zero, zero, zero, zero);
	int iter = 0;

	if(uSize < limit1) {
		// At shallowest zoom depths,
		// use highp floats (should be IEEE 754 single precision).

		vec4 a = zero, b = zero;
		vec4 init = vec4(uCenterHi + vPos * uZoom * uScale, 1.0, 0.0);

		for(int i = maxIter; i > 0; --i) {
			z[0] = a + b + init;
			a = z[0] * z[0].x * scale1;
			b = z[0].yxwz * z[0].y * scale2;

			if(a.x - b.x > bailOut2) {
				iter = i;
				break;
			}
		}
	} else if(uSize < limit2) {
		// At shallow zooms past IEEE 754 single precision,
		// use pairs of highp floats and error free transformations.

		mat4 a = z, b = z;
		mat4 init = add(
			mat4(
				uCenterHi, 1.0, 0.0,
				uCenterLo, 0.0, 0.0,
				zero,
				zero
			), mat4(
				vPos * uZoom * uScale, 0.0, 0.0,
				zero,
				zero,
				zero
			)
		);

		for(int i = maxIter; i > 0; --i) {
			z = add(add(a, b), init);
			a = mul(z[0], z[1], z[0].x, z[1].x, scale1);
			b = mul(z[0].yxwz, z[1].yxwz, z[0].y, z[1].y, scale2);

			if(add(a, -b)[0].x > bailOut2) {
				iter = i;
				break;
			}
		}
	} else {
		// TODO: Use permutation for deeper zooms.

		for(int i = maxIter; i > 0; --i) {
			int y = i / 16;
			vec4 exact = texture2D(uExact, vec2(i - y * 16, y) / 16.0);
		}
	}

	vec2 abs2 = z[0].xz * z[0].xz + z[0].yw * z[0].yw;
	float absLog = log(abs2.x);
	float dist = absLog * sqrt(abs2.x / abs2.y);
	float arg = atan(z[0].y, z[0].x) * INVPI;
	float fraction = absLog / bailOutLog;

	// For smooth escape coloring use:
	// float dwell = float(maxIter - iter) + 2.0 - fraction;

	float dwell = float(maxIter - iter);

	float isEdge = 1.0 - (
		step(
			abs2.x,
			dwellEdge
		) * step(
			abs(abs(arg) - 0.5),
			0.5 - phaseEdge * fraction
		)
	);

	gl_FragColor = vec4(hsl2rgb(
		dwell / 64.0, // Hue
		0.75,
		mix( // Lightness is...
			// outside the set, distance estimate multiplied by...
			min(dist * 256.0 / uZoom + 0.25, 1.0) * (
				// Base lightness offset by...
				0.5 +
				// Binary decomposition grid lines and odd cell interiors.
				(step(z[0].y, 0.0) * (1.0 - isEdge) - isEdge) * gridAlpha
			),
			// Inside the set, use constant lightness.
			1.0,
			step(0.0, -float(iter))
		)
	), 1.0);
}
