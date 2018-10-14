export interface ShaderSpec {
	vertex: string;
	fragment: string;
	attributes: { [ kind: number ]: string };
}

export class Shader {

	constructor(public gl: WebGLRenderingContext, spec: ShaderSpec) {
		const program = gl.createProgram()!;

		gl.attachShader(program, this.compile(spec.vertex, gl.VERTEX_SHADER));
		gl.attachShader(program, this.compile(spec.fragment, gl.FRAGMENT_SHADER));

		for(let kind of Object.keys(spec.attributes)) {
			const num = +kind;

			gl.bindAttribLocation(program, num, spec.attributes[num]);
			this.attributeEnabledList[num] = true;
		}

		gl.linkProgram(program);

		if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw(new Error('Shader link error: ' + gl.getProgramInfoLog(program)));
		}

		gl.useProgram(program);
		this.program = program;
	}

	activate(oldAttributeEnabledList: boolean[] = []) {
		const gl = this.gl;
		gl.useProgram(this.program);

		let attributeCount = Math.max(this.attributeEnabledList.length, oldAttributeEnabledList.length);

		for(let num = 0; num < attributeCount; ++num) {
			const enabled = this.attributeEnabledList[num];

			if(enabled != oldAttributeEnabledList[num]) {
				if(enabled) {
					gl.enableVertexAttribArray(num);
				} else {
					gl.disableVertexAttribArray(num);
				}
			}
		}

		return(this.attributeEnabledList);
	}

	/** @param source Plain-text WebGL shader source code.
	  * @param kind gl.VERTEX_SHADER or gl.FRAGMENT_SHADER. */

	private compile(source: string, kind: number) {
		const gl = this.gl;
		const shader = gl.createShader(kind)!;

		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			throw(new Error('Shader compile error: ' + gl.getShaderInfoLog(shader)));
		}

		return(shader);
	}

	getUniformLocations(nameList: string[]) {
		return(nameList.map(
			(name: string) => {
				const num = this.gl.getUniformLocation(this.program, name);
				if(!num && num !== 0) throw(new Error('Missing WebGL uniform ' + name));
				return(num as WebGLUniformLocation);
			}
		));
	}

	program: WebGLProgram;
	attributeEnabledList: boolean[] = [];

}
