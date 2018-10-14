#extension GL_EXT_draw_buffers : require

precision highp float;

uniform sampler2D uData;
uniform vec2 uSize;
uniform int uIter;

varying vec2 vPos;

const float scale = BLOCK_SIZE;

void main() {
	float sum = 0.0;

	if(uIter > 0) {
		// Disregard old data in block bottom left pixel by negating it.
		sum = -texture2D(uData, vPos - (scale * 0.5 - 0.5) / uSize).w;

		for(float y = 0.0; y < scale; ++y) {
			for(float x = 0.0; x < scale; ++x) {
				sum += texture2D(uData, vPos + (vec2(x, y) - (scale * 0.5 - 0.5)) / uSize).w;
			}
		}
	}

	gl_FragData[0].w = sum;
}
