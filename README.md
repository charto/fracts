# fracts

Fractals (specifically, Mandelbrot) in TypeScript and WebGL.

[See it live](https://charto.github.io/fracts/) (directly served from this repository).

The files you see above are **all** there is to this project, and load directly in browsers
(based on [SystemJS](https://github.com/systemjs/systemjs#readme) and [charto-loader](https://github.com/charto/charto-loader#readme)).
There are no hidden install or offline build steps or development servers.

It initially loads slowly, because this is a development version, but then reloads are fast.
The initial load time should be compared with the time it takes to run `npm install` on a typical starter project.

To download and use this locally, you need a simple web server because local scripts are not allowed to load packages from a CDN.
You probably (unknowingly even) already have such a server. Try running the included `serve.bat`
(works on Windows, Linux and OS X, based on PowerShell, BusyBox or Python).

The demo should then be visible at [localhost:8080](http://localhost:8080/index.html).

# License

[The MIT License](https://raw.githubusercontent.com/charto/fracts/master/LICENSE)

Copyright (c) 2018- BusFaster Ltd
