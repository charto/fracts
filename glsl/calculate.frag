#extension GL_EXT_draw_buffers : require

precision highp float;

uniform vec2 uReferenceOffset;
uniform vec2 uCenterHi;
uniform vec2 uScale;
uniform float uSize;
uniform float uZoom;
uniform int uIter;
uniform sampler2D uExact;
uniform sampler2D uOrbit;
uniform sampler2D uData;

varying vec2 vPos;

const int maxIter = 64 * 2;
const int perturbStride = 256;

const float bailOut = 256.0;
const float bailOut2 = bailOut * bailOut;

const float limit1 = pow(2.0, 24.0);

const vec4 v1122 = vec4( 1.0, 1.0,  2.0, 2.0);
const vec4 va1b2 = vec4(-1.0, 1.0, -2.0, 2.0);
const vec4 v2211 = vec4( 2.0, 2.0,  1.0, 1.0);
const vec2 zero2 = vec2(0.0);
const vec4 zero4 = vec4(0.0);

// At shallowest zoom depths,
// use highp floats (should be IEEE 754 single precision).

int mandelSingle(vec4 init, inout vec4 z, inout float distMin, inout int period) {
	for(int iter = 0; iter < maxIter; ++iter) {
		vec4 a = z      * z.x * v1122;
		vec4 b = z.yxwz * z.y * va1b2;

		float dist = a.x - b.x;

		if(dist < distMin) {
			period = uIter + iter;
			distMin = dist;
		} else if(dist > bailOut2) {
			return(uIter + iter);
		}

		z = a + b + init;
	}

	return(0);
}

// Use perturbation for deeper zooms.

int mandelPerturb(vec4 init, inout vec4 z, inout float distMin, inout int period) {
	vec4 exact = texture2D(uExact, (zero2 + 0.5) / float(perturbStride));

	for(int iter = 1; iter <= maxIter; ++iter) {
		vec4 total = z + exact * v2211;

		z = (init +
			z.x  * total   * v1122    + z.y  * total.yxwz * va1b2 + vec4(zero2,
			z.zw * exact.x * v1122.zw + z.wz * exact.y    * va1b2.zw
		));

		int y = iter / perturbStride;
		exact = texture2D(uExact, (vec2(iter - y * perturbStride, y) + 0.5) / float(perturbStride));

		float dist = dot(z.xy + exact.xy, z.xy + exact.xy);

		if(dist < distMin) {
			period = uIter + iter;
			distMin = dist;
		} else if(dist > bailOut2) {
			z += exact;
			return(uIter + iter);
		}
	}

	return(0);
}

void main() {
	vec4 init = vec4((vPos + uReferenceOffset) * uZoom * uScale, zero2);
	vec2 uv = (vPos + 1.0) * 0.5;
	vec4 z = texture2D(uOrbit, uv);
	vec4 data = texture2D(uData, uv);
	int period = int(data.y);
	float distMin = data.z;
	float count = data.w;

if(uSize < limit1) init = vec4(uCenterHi + vPos * uZoom * uScale, 1.0, 0.0);

	if(uIter == 0) {
		z = init;
		period = 0;
		distMin = bailOut2;
		count = 0.0;
	} else if(data.x != 0.0) {
		gl_FragData[1] = z;
		gl_FragData[0] = data;
		return;
	}

	int iter;

	if(uSize < limit1) {
		iter = mandelSingle(init, z, distMin, period);
	} else {
		iter = mandelPerturb(init, z, distMin, period);
	}

	gl_FragData[1] = z;
	gl_FragData[0] = vec4( float(iter), float(period), distMin, count + 1.0 - step(float(iter), 0.0) );
}
