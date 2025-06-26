import * as THREE from 'https://cdn.skypack.dev/three@0.150.0';
import { ARButton } from 'https://cdn.skypack.dev/three@0.150.0/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer;
let controller;
let reticle;
let imagePlane;
const log = (msg) => document.getElementById("log").innerText = msg;

init();
animate();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  const controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  const geometry = new THREE.PlaneGeometry(1, 0.7); // size of your PNG in meters
  const texture = new THREE.TextureLoader().load('media/images/wallart.png');
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  imagePlane = new THREE.Mesh(geometry, material);
  imagePlane.visible = false;
  scene.add(imagePlane);

  const reticleGeometry = new THREE.RingGeometry(0.05, 0.06, 32).rotateX(-Math.PI / 2);
  const reticleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
  reticle.visible = false;
  scene.add(reticle);

  const session = renderer.xr.getSession();
  session.addEventListener('selectstart', () => log("Tap detected"));

  // Hit test
  session.requestReferenceSpace('viewer').then((refSpace) => {
    session.requestHitTestSource({ space: refSpace }).then((source) => {
      renderer.setAnimationLoop((timestamp, frame) => {
        if (frame) {
          const refSpace = renderer.xr.getReferenceSpace();
          const hitTestResults = frame.getHitTestResults(source);
          if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(refSpace);
            reticle.visible = true;
            reticle.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
            reticle.updateMatrixWorld(true);
          } else {
            reticle.visible = false;
          }
        }

        renderer.render(scene, camera);
      });
    });
  });

  window.addEventListener('touchmove', handleTouchMove, false);
  window.addEventListener('touchstart', handleTouchStart, false);
}

function onSelect() {
  if (reticle.visible) {
    imagePlane.position.copy(reticle.position);
    imagePlane.quaternion.copy(reticle.quaternion);
    imagePlane.visible = true;
    log("Image placed!");
  }
}

let previousDistance = null;

function handleTouchStart(event) {
  if (event.touches.length === 2) {
    previousDistance = getDistance(event.touches);
  }
}

function handleTouchMove(event) {
  if (event.touches.length === 2 && imagePlane.visible) {
    const newDistance = getDistance(event.touches);
    if (previousDistance) {
      const scaleFactor = newDistance / previousDistance;
      imagePlane.scale.multiplyScalar(scaleFactor);
    }
    previousDistance = newDistance;
  } else if (event.touches.length === 1 && imagePlane.visible) {
    // Drag to move in x-z plane
    const dx = event.touches[0].movementX || 0;
    const dz = event.touches[0].movementY || 0;
    imagePlane.position.x += dx * 0.0005;
    imagePlane.position.z += dz * 0.0005;
  }
}

function getDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function animate() {
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
}
