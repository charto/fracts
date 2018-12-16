precision highp float;

attribute vec2 aPos;

varying vec2 vPos;

const float scale = BLOCK_SIZE;

void main() {
	gl_Position = vec4(
		(aPos + 1.0) / scale - 1.0,
		0.0,
		1.0
	);
	vPos = (aPos + 1.0) * 0.5;
}
