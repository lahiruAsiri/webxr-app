import * as THREE from "three"

class ARWallArtViewer {
  constructor() {
    // Core Three.js components
    this.scene = null
    this.camera = null
    this.renderer = null
    this.xrSession = null
    this.xrReferenceSpace = null

    // AR-specific
    this.hitTestSource = null
    this.hitTestSourceRequested = false
    this.reticle = null

    // Wall art objects
    this.wallArtGroup = null
    this.wallArtPlane = null
    this.frame = null
    this.shadow = null

    // State
    this.isARActive = false
    this.wallArtPlaced = false
    this.currentTexture = null

    // Controls
    this.controls = {
      size: 0.5,
      height: 0,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
    }

    // Touch handling
    this.touchStart = { x: 0, y: 0 }
    this.isRotating = false

    this.init()
  }

  async init() {
    try {
      await this.setupThreeJS()
      this.setupLighting()
      this.createReticle()
      await this.loadDefaultTexture()
      this.setupEventListeners()
      this.setupUI()
      await this.initializeAR()
    } catch (error) {
      console.error("Initialization failed:", error)
      this.updateStatus("AR not supported on this device", "Please use a compatible browser")
    }
  }

  async setupThreeJS() {
    // Scene
    this.scene = new THREE.Scene()

    // Camera
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20)

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById("canvas"),
      antialias: true,
      alpha: true,
    })

    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.xr.enabled = true
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Handle window resize
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    })
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambientLight)

    // Directional light for shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(2, 4, 2)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.1
    directionalLight.shadow.camera.far = 10
    directionalLight.shadow.camera.left = -2
    directionalLight.shadow.camera.right = 2
    directionalLight.shadow.camera.top = 2
    directionalLight.shadow.camera.bottom = -2
    this.scene.add(directionalLight)

    // Point light for better illumination
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 10)
    pointLight.position.set(0, 2, 1)
    this.scene.add(pointLight)
  }

  createReticle() {
    // Create reticle geometry
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2)
    const material = new THREE.MeshBasicMaterial({
      color: 0x007bff,
      transparent: true,
      opacity: 0.7,
    })

    this.reticle = new THREE.Mesh(geometry, material)
    this.reticle.matrixAutoUpdate = false
    this.reticle.visible = false
    this.scene.add(this.reticle)
  }

  async loadDefaultTexture() {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader()
      loader.load(
        "/placeholder.svg?height=400&width=300",
        (texture) => {
          this.currentTexture = texture
          texture.wrapS = THREE.ClampToEdgeWrapping
          texture.wrapT = THREE.ClampToEdgeWrapping
          texture.minFilter = THREE.LinearFilter
          resolve(texture)
        },
        undefined,
        reject,
      )
    })
  }

  createWallArt() {
    if (this.wallArtGroup) {
      this.scene.remove(this.wallArtGroup)
    }

    this.wallArtGroup = new THREE.Group()

    // Create frame
    const frameGeometry = new THREE.BoxGeometry(1.1, 1.4, 0.05)
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 })
    this.frame = new THREE.Mesh(frameGeometry, frameMaterial)
    this.frame.castShadow = true
    this.frame.receiveShadow = true
    this.wallArtGroup.add(this.frame)

    // Create wall art plane
    const artGeometry = new THREE.PlaneGeometry(1, 1.3)
    const artMaterial = new THREE.MeshLambertMaterial({
      map: this.currentTexture,
      transparent: true,
    })
    this.wallArtPlane = new THREE.Mesh(artGeometry, artMaterial)
    this.wallArtPlane.position.z = 0.026
    this.wallArtPlane.castShadow = true
    this.wallArtGroup.add(this.wallArtPlane)

    // Create shadow plane
    const shadowGeometry = new THREE.PlaneGeometry(1.2, 1.5)
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
    })
    this.shadow = new THREE.Mesh(shadowGeometry, shadowMaterial)
    this.shadow.rotation.x = -Math.PI / 2
    this.shadow.position.y = -0.7
    this.shadow.position.z = 0.01
    this.wallArtGroup.add(this.shadow)

    // Apply current controls
    this.updateWallArtTransform()

    this.scene.add(this.wallArtGroup)
    this.wallArtPlaced = true
  }

  updateWallArtTransform() {
    if (!this.wallArtGroup) return

    // Apply scale
    const scale = this.controls.size
    this.wallArtGroup.scale.set(scale, scale, scale)

    // Apply position
    this.wallArtGroup.position.y = this.controls.height

    // Apply rotation
    this.wallArtGroup.rotation.x = THREE.MathUtils.degToRad(this.controls.rotationX)
    this.wallArtGroup.rotation.y = THREE.MathUtils.degToRad(this.controls.rotationY)
    this.wallArtGroup.rotation.z = THREE.MathUtils.degToRad(this.controls.rotationZ)
  }

  async initializeAR() {
    if (!navigator.xr) {
      throw new Error("WebXR not supported")
    }

    const supported = await navigator.xr.isSessionSupported("immersive-ar")
    if (!supported) {
      throw new Error("AR not supported")
    }

    this.updateStatus("AR Ready!", "Tap to start AR experience")

    // Add click to start AR
    document.addEventListener("click", this.startAR.bind(this))
  }

  async startAR() {
    if (this.isARActive) return

    try {
      this.updateStatus("Starting AR...", "Please wait")

      this.xrSession = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["hit-test"],
      })

      this.xrSession.addEventListener("end", this.onARSessionEnd.bind(this))

      await this.renderer.xr.setSession(this.xrSession)

      this.xrReferenceSpace = await this.xrSession.requestReferenceSpace("local")

      this.isARActive = true
      this.updateStatus("AR Active", "Point at a surface and tap to place art")

      // Show instructions
      document.getElementById("arInstructions").classList.remove("hidden")

      this.renderer.setAnimationLoop(this.render.bind(this))
    } catch (error) {
      console.error("Failed to start AR:", error)
      this.updateStatus("AR Failed", "Please try again")
    }
  }

  onARSessionEnd() {
    this.isARActive = false
    this.hitTestSourceRequested = false
    this.hitTestSource = null
    this.reticle.visible = false
    this.updateStatus("AR Ended", "Tap to restart")
    document.getElementById("controlsPanel").classList.add("hidden")
  }

  async render(timestamp, frame) {
    if (!frame || !this.isARActive) return

    const referenceSpace = this.renderer.xr.getReferenceSpace()
    const session = this.renderer.xr.getSession()

    // Handle hit testing
    if (!this.hitTestSourceRequested) {
      try {
        const hitTestSource = await session.requestHitTestSource({ space: referenceSpace })
        this.hitTestSource = hitTestSource
        this.hitTestSourceRequested = true
      } catch (error) {
        console.warn("Hit test not available:", error)
      }
    }

    if (this.hitTestSource) {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource)

      if (hitTestResults.length > 0 && !this.wallArtPlaced) {
        const hit = hitTestResults[0]
        this.reticle.visible = true
        this.reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix)
      } else if (!this.wallArtPlaced) {
        this.reticle.visible = false
      }
    }

    this.renderer.render(this.scene, this.camera)
  }

  setupEventListeners() {
    // Touch/click for placing wall art
    this.renderer.domElement.addEventListener("touchend", this.onTouch.bind(this))
    this.renderer.domElement.addEventListener("click", this.onTouch.bind(this))

    // Control sliders
    const sliders = ["size", "height", "rotationX", "rotationY", "rotationZ"]
    sliders.forEach((control) => {
      const slider = document.getElementById(`${control}Slider`)
      const valueDisplay = document.getElementById(`${control}Value`)

      slider.addEventListener("input", (e) => {
        const value = Number.parseFloat(e.target.value)
        this.controls[control] = value

        // Update display
        if (control.includes("rotation")) {
          valueDisplay.textContent = `${value}°`
        } else {
          valueDisplay.textContent = value.toFixed(1)
        }

        this.updateWallArtTransform()
      })
    })

    // Buttons
    document.getElementById("uploadBtn").addEventListener("click", () => {
      document.getElementById("fileInput").click()
    })

    document.getElementById("resetBtn").addEventListener("click", this.resetControls.bind(this))

    document.getElementById("deleteBtn").addEventListener("click", this.removeWallArt.bind(this))

    // File upload
    document.getElementById("fileInput").addEventListener("change", this.handleFileUpload.bind(this))

    // Touch gestures for rotation
    this.setupTouchGestures()
  }

  setupTouchGestures() {
    let startTouch = null
    let startRotation = { x: 0, y: 0 }

    this.renderer.domElement.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1 && this.wallArtPlaced) {
        startTouch = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        }
        startRotation = {
          x: this.controls.rotationX,
          y: this.controls.rotationY,
        }
        this.isRotating = true
      }
    })

    this.renderer.domElement.addEventListener("touchmove", (e) => {
      if (this.isRotating && e.touches.length === 1) {
        e.preventDefault()

        const deltaX = e.touches[0].clientX - startTouch.x
        const deltaY = e.touches[0].clientY - startTouch.y

        this.controls.rotationY = startRotation.y + deltaX * 0.5
        this.controls.rotationX = startRotation.x - deltaY * 0.5

        // Clamp values
        this.controls.rotationX = Math.max(-180, Math.min(180, this.controls.rotationX))
        this.controls.rotationY = Math.max(-180, Math.min(180, this.controls.rotationY))

        // Update sliders
        document.getElementById("rotationXSlider").value = this.controls.rotationX
        document.getElementById("rotationYSlider").value = this.controls.rotationY
        document.getElementById("rotationXValue").textContent = `${this.controls.rotationX.toFixed(0)}°`
        document.getElementById("rotationYValue").textContent = `${this.controls.rotationY.toFixed(0)}°`

        this.updateWallArtTransform()
      }
    })

    this.renderer.domElement.addEventListener("touchend", () => {
      this.isRotating = false
    })

    // Pinch to zoom
    let initialDistance = 0
    let initialScale = 1

    this.renderer.domElement.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2 && this.wallArtPlaced) {
        initialDistance = this.getDistance(e.touches[0], e.touches[1])
        initialScale = this.controls.size
      }
    })

    this.renderer.domElement.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2 && this.wallArtPlaced) {
        e.preventDefault()

        const currentDistance = this.getDistance(e.touches[0], e.touches[1])
        const scale = (currentDistance / initialDistance) * initialScale

        this.controls.size = Math.max(0.1, Math.min(2.0, scale))

        // Update slider
        document.getElementById("sizeSlider").value = this.controls.size
        document.getElementById("sizeValue").textContent = this.controls.size.toFixed(1)

        this.updateWallArtTransform()
      }
    })
  }

  getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  onTouch(event) {
    if (!this.isARActive || this.wallArtPlaced || this.isRotating) return

    if (this.reticle.visible) {
      // Place wall art at reticle position
      this.createWallArt()
      this.wallArtGroup.position.copy(this.reticle.position)
      this.wallArtGroup.quaternion.copy(this.reticle.quaternion)

      this.reticle.visible = false
      this.updateStatus("Wall Art Placed!", "Use controls to adjust")

      // Show controls
      document.getElementById("controlsPanel").classList.remove("hidden")
      document.getElementById("controlsPanel").classList.add("fade-in")
    }
  }

  handleFileUpload(event) {
    const file = event.target.files[0]
    if (!file || !file.type.startsWith("image/")) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const loader = new THREE.TextureLoader()
      loader.load(e.target.result, (texture) => {
        texture.wrapS = THREE.ClampToEdgeWrapping
        texture.wrapT = THREE.ClampToEdgeWrapping
        texture.minFilter = THREE.LinearFilter

        this.currentTexture = texture

        if (this.wallArtPlane) {
          this.wallArtPlane.material.map = texture
          this.wallArtPlane.material.needsUpdate = true
        }

        this.updateStatus("Image Updated!", "New artwork loaded")
      })
    }
    reader.readAsDataURL(file)
  }

  resetControls() {
    this.controls = {
      size: 0.5,
      height: 0,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
    }

    // Update sliders
    document.getElementById("sizeSlider").value = 0.5
    document.getElementById("heightSlider").value = 0
    document.getElementById("rotationXSlider").value = 0
    document.getElementById("rotationYSlider").value = 0
    document.getElementById("rotationZSlider").value = 0

    // Update displays
    document.getElementById("sizeValue").textContent = "0.5"
    document.getElementById("heightValue").textContent = "0.0"
    document.getElementById("rotationXValue").textContent = "0°"
    document.getElementById("rotationYValue").textContent = "0°"
    document.getElementById("rotationZValue").textContent = "0°"

    this.updateWallArtTransform()
  }

  removeWallArt() {
    if (this.wallArtGroup) {
      this.scene.remove(this.wallArtGroup)
      this.wallArtGroup = null
      this.wallArtPlaced = false
      this.reticle.visible = true

      document.getElementById("controlsPanel").classList.add("hidden")
      this.updateStatus("Wall Art Removed", "Point at surface to place new art")
    }
  }

  setupUI() {
    // Initialize slider displays
    document.getElementById("sizeValue").textContent = "0.5"
    document.getElementById("heightValue").textContent = "0.0"
    document.getElementById("rotationXValue").textContent = "0°"
    document.getElementById("rotationYValue").textContent = "0°"
    document.getElementById("rotationZValue").textContent = "0°"
  }

  updateStatus(text, subtext = "") {
    document.querySelector(".status-text").innerHTML = text
    document.querySelector(".status-subtext").textContent = subtext
  }
}

// Global functions for UI
function hideInstructions() {
  document.getElementById("arInstructions").classList.add("hidden")
}

// Initialize the app
let app
document.addEventListener("DOMContentLoaded", () => {
  app = new ARWallArtViewer()
})

// Handle page visibility changes
document.addEventListener("visibilitychange", () => {
  if (document.hidden && app && app.xrSession) {
    app.xrSession.end()
  }
})
