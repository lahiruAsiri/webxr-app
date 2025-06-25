import { Node } from '../core/node.js';

export class TexturedQuadNode extends Node {
  constructor(gl, imageUrl) {
    super();

    this.gl = gl;
    this.imageUrl = imageUrl;
    this.program = null;
    this.texture = null;
    this.buffer = null;

    this.init();
  }

  async init() {
    const gl = this.gl;

    // Create shader program
    const vertexSrc = `
      attribute vec2 aPosition;
      attribute vec2 aTexCoord;
      varying vec2 vTexCoord;
      uniform mat4 uModelViewProjection;
      void main() {
        gl_Position = uModelViewProjection * vec4(aPosition, 0.0, 1.0);
        vTexCoord = aTexCoord;
      }
    `;

    const fragmentSrc = `
      precision mediump float;
      varying vec2 vTexCoord;
      uniform sampler2D uTexture;
      void main() {
        gl_FragColor = texture2D(uTexture, vTexCoord);
      }
    `;

    this.program = createProgram(gl, vertexSrc, fragmentSrc);

    // Create geometry
    const vertices = new Float32Array([
      // x,    y,    u, v
      -0.5,  0.5,   0, 0,
       0.5,  0.5,   1, 0,
      -0.5, -0.5,   0, 1,
       0.5, -0.5,   1, 1,
    ]);

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Load texture
    this.texture = await loadTexture(gl, this.imageUrl);
  }

  draw(renderer) {
    const gl = this.gl;
    if (!this.program || !this.texture) return;

    const { projectionMatrix, viewMatrix } = renderer;
    const modelMatrix = this.matrix;
    const mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, viewMatrix, modelMatrix);
    mat4.multiply(mvpMatrix, projectionMatrix, mvpMatrix);

    gl.useProgram(this.program);

    const aPosition = gl.getAttribLocation(this.program, 'aPosition');
    const aTexCoord = gl.getAttribLocation(this.program, 'aTexCoord');
    const uMVP = gl.getUniformLocation(this.program, 'uModelViewProjection');
    const uTexture = gl.getUniformLocation(this.program, 'uTexture');

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(aTexCoord);
    gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 16, 8);

    gl.uniformMatrix4fv(uMVP, false, mvpMatrix);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(uTexture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

// Helper: create shader program
function createProgram(gl, vertexSrc, fragmentSrc) {
  const vShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vShader, vertexSrc);
  gl.compileShader(vShader);
  if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(vShader));
    return null;
  }

  const fShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fShader, fragmentSrc);
  gl.compileShader(fShader);
  if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(fShader));
    return null;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return null;
  }

  return program;
}

// Helper: load texture
function loadTexture(gl, imageUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.generateMipmap(gl.TEXTURE_2D);
      resolve(tex);
    };
    image.src = imageUrl;
  });
}
