precision highp float;

uniform float uZoom;
uniform sampler2D uOrbit;
uniform sampler2D uData;
uniform float uTransparent;

varying vec2 vPos;

const float INVPI = 0.318309886183790671537767526745;

const float gridWidth = 0.125;
const float gridAlpha = 1.0 / 16.0;

const float bailOut = 256.0;
const float bailOut2 = bailOut * bailOut;
const float logBailOut2 = log(bailOut) * 2.0;

const float dwellEdge = log(bailOut) * (4.0 - gridWidth);
const float phaseEdge = gridWidth / 64.0 * logBailOut2 / log(2.0);

// Scaling factor to avoid overflow of intermediate values in complex number magnitude calculations.
const float magnitudeScale = pow(2.0, -62.0) / bailOut;
const float logMagnitudeScale = log(4.0) * 62.0 + logBailOut2;

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

void main() {
	vec2 uv = (vPos + 1.0) * 0.5;
	vec4 z = texture2D(uOrbit, uv);
	vec4 data = texture2D(uData, uv);
	int iter = int(data.x);
	int period = int(data.y);

	vec4 zs = z * magnitudeScale;
	vec2 logMagnitude = max(log(zs.xz * zs.xz + zs.yw * zs.yw) + logMagnitudeScale, 0.0);

	float dist = logMagnitude.x * exp((logMagnitude.x - logMagnitude.y) * 0.5);
	float arg = atan(z.y, z.x) * INVPI;
	float fraction = logMagnitude.x / logBailOut2;

	float dwell = float(iter);
	float smoothDwell = dwell + 2.0 - fraction;

	float isEdge = 1.0 - (
		step(
			logMagnitude.x,
			dwellEdge
		) * step(
			abs(abs(arg) - 0.5),
			0.5 - phaseEdge * fraction
		)
	);

	float inside = step(dwell, 0.0);

	gl_FragColor = vec4(hsl2rgb(
		mix(
			log(smoothDwell) / 4.0, // Hue
			float(period) / 31.0,
			1.0 // inside
		),
		0.5,
		mix( // Lightness is...
			// outside the set, cube root of distance estimate multiplied by...
			min(pow(dist / uZoom, 1.0 / 3.0) * 4.0 + 0.25, 1.0) * (
				// Base lightness offset by...
				0.5 +
				// Binary decomposition grid lines and odd cell interiors.
				(step(z.y, 0.0) * (1.0 - isEdge) - isEdge) * gridAlpha
			),
			// Inside the set, use constant lightness.
			0.75,
			inside
		)
	), 1.0) * mix(1.0, 0.0, inside * uTransparent);
}
