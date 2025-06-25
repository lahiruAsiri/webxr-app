export default class Mesh {
    constructor({ geometry, material }) {
      this.geometry = geometry;
      this.material = material;
      this._glBuffers = {};
      this._texture = null;
  
      console.log('Mesh constructor:', { geometry, material });
  
      // Initialize WebGL buffers
      this.initBuffers();
      this.initTexture();
    }
  
    initBuffers() {
      // This assumes gl is available (set in Renderer.js)
      if (!gl) {
        console.error('WebGL context not available for Mesh buffers');
        return;
      }
  
      try {
        // Position buffer
        this._glBuffers.positions = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._glBuffers.positions);
        gl.bufferData(gl.ARRAY_BUFFER, this.geometry.positions, gl.STATIC_DRAW);
  
        // Index buffer
        this._glBuffers.indices = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._glBuffers.indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.geometry.indices, gl.STATIC_DRAW);
  
        // Texture coords buffer
        if (this.geometry.texCoords) {
          this._glBuffers.texCoords = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, this._glBuffers.texCoords);
          gl.bufferData(gl.ARRAY_BUFFER, this.geometry.texCoords, gl.STATIC_DRAW);
        }
  
        console.log('WebGL buffers initialized');
      } catch (error) {
        console.error('Error initializing WebGL buffers:', error);
      }
    }
  
    initTexture() {
      if (!gl) {
        console.error('WebGL context not available for texture');
        this.createFallbackTexture();
        return;
      }
  
      if (!this.material.baseColorTexture || !this.material.baseColorTexture.uri) {
        console.log('No texture URI provided, using base material');
        this.createFallbackTexture();
        return;
      }
  
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        try {
          this._texture = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, this._texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.generateMipmap(gl.TEXTURE_2D);
          console.log('Texture loaded successfully:', this.material.baseColorTexture.uri);
        } catch (error) {
          console.error('Error loading texture:', error);
          this.createFallbackTexture();
        }
      };
      image.onerror = () => {
        console.error('Texture failed to load:', this.material.baseColorTexture.uri);
        this.createFallbackTexture();
      };
      image.src = this.material.baseColorTexture.uri;
      console.log('Loading texture:', this.material.baseColorTexture.uri);
    }
  
    createFallbackTexture() {
      if (!gl) {
        console.error('Cannot create fallback texture without WebGL context');
        return;
      }
  
      this._texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this._texture);
      const pixel = new Uint8Array([255, 0, 0, 255]); // Red pixel
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      console.log('Fallback red texture created');
    }
  
    bind() {
      if (!gl || !this._glBuffers.positions) {
        console.error('Cannot bind mesh: invalid WebGL context or buffers');
        return;
      }
  
      try {
        gl.bindBuffer(gl.ARRAY_BUFFER, this._glBuffers.positions);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);
  
        if (this._glBuffers.texCoords) {
          gl.bindBuffer(gl.ARRAY_BUFFER, this._glBuffers.texCoords);
          gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
          gl.enableVertexAttribArray(1);
        }
  
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._glBuffers.indices);
  
        if (this._texture) {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, this._texture);
        }
  
        console.log('Mesh bound for rendering');
      } catch (error) {
        console.error('Error binding mesh:', error);
      }
    }
  
    draw() {
      if (!gl || !this._glBuffers.indices) {
        console.error('Cannot draw mesh: invalid WebGL context or buffers');
        return;
      }
  
      try {
        const indexCount = this.geometry.indices.length;
        gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
        console.log('Mesh drawn:', { indexCount });
      } catch (error) {
        console.error('Error drawing mesh:', error);
      }
    }
  }