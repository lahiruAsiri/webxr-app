import * as THREE from 'https://cdn.skypack.dev/three@0.150.0';
import { ARButton } from 'https://cdn.skypack.dev/three@0.150.0/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer, controller, reticle, imagePlane;

const log = msg => document.getElementById("log").innerText = msg;

init();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

  scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1));

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  const geometry = new THREE.PlaneGeometry(1, 0.7); // 1m x 0.7m poster
  const texture = new THREE.TextureLoader().load('wallart.png');
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  imagePlane = new THREE.Mesh(geometry, material);
  imagePlane.visible = false;
  scene.add(imagePlane);

  const reticleGeo = new THREE.RingGeometry(0.05, 0.06, 32).rotateX(-Math.PI / 2);
  const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  reticle = new THREE.Mesh(reticleGeo, reticleMat);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  let hitTestSource = null;
  let viewerSpace = null;

  renderer.xr.addEventListener('sessionstart', async () => {
    const session = renderer.xr.getSession();
    viewerSpace = await session.requestReferenceSpace('viewer');
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    log("Move phone to detect a wall surface...");
  });

  renderer.setAnimationLoop((timestamp, frame) => {
    if (frame && hitTestSource) {
      const refSpace = renderer.xr.getReferenceSpace();
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(refSpace);
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
    renderer.render(scene, camera);
  });

  // Touch interaction
  window.addEventListener('touchmove', handleTouchMove);
  window.addEventListener('touchstart', handleTouchStart);
}

function onSelect() {
  if (reticle.visible) {
    imagePlane.position.setFromMatrixPosition(reticle.matrix);
    imagePlane.quaternion.setFromRotationMatrix(reticle.matrix);
    imagePlane.visible = true;
    log("Poster placed. Use pinch & drag to move/scale/rotate.");
  }
}

let startDist = null;
function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function handleTouchStart(event) {
  if (event.touches.length === 2) {
    startDist = getTouchDistance(event.touches);
  }
}

function handleTouchMove(event) {
  if (imagePlane.visible) {
    if (event.touches.length === 2) {
      const newDist = getTouchDistance(event.touches);
      if (startDist) {
        const scale = newDist / startDist;
        imagePlane.scale.set(scale, scale, scale);
      }
    } else if (event.touches.length === 1) {
      // Drag to move
      const touch = event.touches[0];
      imagePlane.position.x += touch.movementX * 0.0005;
      imagePlane.position.z += touch.movementY * 0.0005;
    }
  }
}
