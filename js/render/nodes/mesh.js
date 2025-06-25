// ./js/render/nodes/mesh.js
import { Node } from '../core/node.js';
import { mat4 } from '../math/gl-matrix.js';

export class MeshNode extends Node {
  constructor(options = {}) {
    super();
    this.mesh = options.mesh || null;
    this._matrix = mat4.create(); // Local transformation matrix
  }

  // Override render method to draw the mesh
  render(renderer) {
    if (!this.mesh || !this.visible) return;

    // Compute world matrix
    const worldMatrix = this.getWorldMatrix();

    // Bind and draw the mesh
    this.mesh.bind(renderer);
    renderer.setWorldMatrix(worldMatrix);
    this.mesh.draw(renderer);
  }

  // Optional: Update method for animations or dynamic changes
  update(deltaTime) {
    // Can be extended for animations or dynamic mesh updates
    super.update(deltaTime);
  }

  // Getter and setter for matrix to ensure updates
  get matrix() {
    return this._matrix;
  }

  set matrix(newMatrix) {
    mat4.copy(this._matrix, newMatrix);
    this.markDirty(); // Notify that the transform has changed
  }
}