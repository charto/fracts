precision highp float;

uniform vec2 uReferenceOffset;
uniform float uSize;

attribute vec2 aPos;

varying vec2 vPos;

const float limit1 = pow(2.0, 24.0);
const float limit2 = pow(2.0, 47.0);

void main() {
	gl_Position = vec4(aPos, 0.0, 1.0);
	if(uSize < limit1) {
		vPos = aPos;
	} else {
		vPos = aPos + uReferenceOffset;
	}
}
