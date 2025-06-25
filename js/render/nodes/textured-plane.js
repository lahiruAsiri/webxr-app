class TexturedPlaneNode extends Node {
    constructor(imageUrl) {
      super();
      this.imageUrl = imageUrl;
      this.texture = null;
      this.vertexBuffer = null;
      this.indexBuffer = null;
      this.program = null;
      this.gl = null;
  
      // To mimic Gltf2Node's onLoad and onError
      this.isLoaded = false;
      this.onLoad = () => {};
      this.onError = (error) => {};
    }
  
    // Initialize with WebGL context
    init(gl) {
      this.gl = gl;
  
      // Load image and create texture
      const image = new Image();
      image.src = this.imageUrl;
      image.onload = () => {
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.isLoaded = true;
        this.onLoad();
      };
      image.onerror = (error) => {
        this.onError(error);
      };
  
      // Define plane geometry: a 1x1 unit square
      const positions = [
        -0.5, -0.5, 0,  // bottom-left
         0.5, -0.5, 0,  // bottom-right
         0.5,  0.5, 0,  // top-right
        -0.5,  0.5, 0   // top-left
      ];
      const uvs = [
        0, 0,  // bottom-left
        1, 0,  // bottom-right
        1, 1,  // top-right
        0, 1   // top-left
      ];
      const indices = [0, 1, 2, 0, 2, 3];
  
      // Create vertex buffer (interleaved positions and UVs for simplicity)
      this.vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      const vertexData = new Float32Array([
        -0.5, -0.5, 0, 0, 0,
         0.5, -0.5, 0, 1, 0,
         0.5,  0.5, 0, 1, 1,
        -0.5,  0.5, 0, 0, 1
      ]);
      gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
  
      // Create index buffer
      this.indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  
      // Vertex shader
      const vertexShaderSource = `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelMatrix;
        uniform mat4 viewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
          vUv = uv;
        }
      `;
  
      // Fragment shader
      const fragmentShaderSource = `
        precision mediump float;
        uniform sampler2D texture;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(texture, vUv);
        }
      `;
  
      // Compile shaders
      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vertexShader, vertexShaderSource);
      gl.compileShader(vertexShader);
      if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error('Vertex Shader Error:', gl.getShaderInfoLog(vertexShader));
      }
  
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fragmentShader, fragmentShaderSource);
      gl.compileShader(fragmentShader);
      if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error('Fragment Shader Error:', gl.getShaderInfoLog(fragmentShader));
      }
  
      this.program = gl.createProgram();
      gl.attachShader(this.program, vertexShader);
      gl.attachShader(this.program, fragmentShader);
      gl.linkProgram(this.program);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        console.error('Program Link Error:', gl.getProgramInfoLog(this.program));
      }
    }
  
    // Custom draw method
    draw({ gl, viewMatrix, projectionMatrix }) {
      if (!this.isLoaded || !this.program) return;
  
      gl.useProgram(this.program);
  
      // Set uniforms
      gl.uniformMatrix4fv(
        gl.getUniformLocation(this.program, 'modelMatrix'),
        false,
        this.matrix
      );
      gl.uniformMatrix4fv(
        gl.getUniformLocation(this.program, 'viewMatrix'),
        false,
        viewMatrix
      );
      gl.uniformMatrix4fv(
        gl.getUniformLocation(this.program, 'projectionMatrix'),
        false,
        projectionMatrix
      );
  
      // Bind texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.uniform1i(gl.getUniformLocation(this.program, 'texture'), 0);
  
      // Bind vertex buffer and set attributes
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      const positionLoc = gl.getAttribLocation(this.program, 'position');
      gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 5 * 4, 0);
      gl.enableVertexAttribArray(positionLoc);
  
      const uvLoc = gl.getAttribLocation(this.program, 'uv');
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 5 * 4, 3 * 4);
      gl.enableVertexAttribArray(uvLoc);
  
      // Bind index buffer and draw
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }
  }