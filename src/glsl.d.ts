/** Vertex shader files *.vert are plain text. */

declare module '*.vert' {
	const data: string;
	export = data;
}

/** Fragment shader files *.frag are plain text. */

declare module '*.frag' {
	const data: string;
	export = data;
}
