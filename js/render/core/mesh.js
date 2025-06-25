// ./js/render/core/mesh.js
import { vec3, mat4 } from '../math/gl-matrix.js';

export class Mesh {
  constructor(options = {}) {
    this.geometry = options.geometry || {};
    this.material = options.material || {};
    this.glBuffers = {};
    this.texture = null;
    this._initialize();
  }

  _initialize() {
    // Initialize WebGL buffers and textures based on geometry and material
    this._setupBuffers();
    this._setupTexture();
  }

  _setupBuffers() {
    const gl = this._glContext; // Assume gl context is set by renderer
    if (!gl) return;

    // Create and bind vertex buffer for positions
    if (this.geometry.positions) {
      this.glBuffers.position = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.position);
      gl.bufferData(gl.ARRAY_BUFFER, this.geometry.positions, gl.STATIC_DRAW);
    }

    // Create and bind texture coordinates buffer
    if (this.geometry.texCoords) {
      this.glBuffers.texCoords = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.texCoords);
      gl.bufferData(gl.ARRAY_BUFFER, this.geometry.texCoords, gl.STATIC_DRAW);
    }

    // Create and bind index buffer
    if (this.geometry.indices) {
      this.glBuffers.index = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.glBuffers.index);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.geometry.indices, gl.STATIC_DRAW);
      this.indexCount = this.geometry.indices.length;
    }
  }

  _setupTexture() {
    const gl = this._glContext;
    if (!gl || !this.material.baseColorTexture) return;

    // Create and load texture
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    // Set texture image
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    image.src = this.material.baseColorTexture.uri;
  }

  bind(renderer) {
    const gl = renderer.gl;
    this._glContext = gl; // Store context for later use
    const program = renderer.getProgram(this.material); // Assume renderer manages shaders

    // Bind buffers
    if (this.glBuffers.position) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.position);
      const posLoc = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
    }

    if (this.glBuffers.texCoords) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.texCoords);
      const texLoc = gl.getAttribLocation(program, 'a_texCoord');
      gl.enableVertexAttribArray(texLoc);
      gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
    }

    if (this.glBuffers.index) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.glBuffers.index);
    }

    // Bind texture
    if (this.texture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      const texLoc = gl.getUniformLocation(program, 'u_baseColorTexture');
      gl.uniform1i(texLoc, 0);
    }

    // Set material properties
    const metallicLoc = gl.getUniformLocation(program, 'u_metallicFactor');
    if (metallicLoc) gl.uniform1f(metallicLoc, this.material.metallicFactor || 0);
    const roughnessLoc = gl.getUniformLocation(program, 'u_roughnessFactor');
    if (roughnessLoc) gl.uniform1f(roughnessLoc, this.material.roughnessFactor || 1);
  }

  draw(renderer) {
    const gl = renderer.gl;
    if (this.glBuffers.index) {
      gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    } else if (this.geometry.positions) {
      gl.drawArrays(gl.TRIANGLES, 0, this.geometry.positions.length / 3);
    }
  }

  destroy() {
    const gl = this._glContext;
    if (!gl) return;

    // Clean up WebGL resources
    if (this.glBuffers.position) gl.deleteBuffer(this.glBuffers.position);
    if (this.glBuffers.texCoords) gl.deleteBuffer(this.glBuffers.texCoords);
    if (this.glBuffers.index) gl.deleteBuffer(this.glBuffers.index);
    if (this.texture) gl.deleteTexture(this.texture);
  }
}