class ARWallArtViewer {
    constructor() {
      this.wallartPlane = null
      this.frame = null
      this.marker = null
      this.currentScale = 1
      this.currentRotation = { x: 0, y: 0, z: 0 }
  
      this.init()
    }
  
    init() {
      // Wait for A-Frame to load
      document.addEventListener("DOMContentLoaded", () => {
        this.setupElements()
        this.setupEventListeners()
        this.hideLoading()
      })
    }
  
    setupElements() {
      this.wallartPlane = document.querySelector("#wallart-plane")
      this.frame = document.querySelector("#frame")
      this.marker = document.querySelector("#marker")
  
      // Setup sliders
      this.sizeSlider = document.querySelector("#sizeSlider")
      this.rotateXSlider = document.querySelector("#rotateXSlider")
      this.rotateYSlider = document.querySelector("#rotateYSlider")
      this.rotateZSlider = document.querySelector("#rotateZSlider")
  
      // Setup buttons
      this.resetBtn = document.querySelector("#resetBtn")
      this.uploadBtn = document.querySelector("#uploadBtn")
      this.fileInput = document.querySelector("#fileInput")
    }
  
    setupEventListeners() {
      // Size control
      this.sizeSlider.addEventListener("input", (e) => {
        this.updateSize(Number.parseFloat(e.target.value))
      })
  
      // Rotation controls
      this.rotateXSlider.addEventListener("input", (e) => {
        this.currentRotation.x = Number.parseInt(e.target.value)
        this.updateRotation()
      })
  
      this.rotateYSlider.addEventListener("input", (e) => {
        this.currentRotation.y = Number.parseInt(e.target.value)
        this.updateRotation()
      })
  
      this.rotateZSlider.addEventListener("input", (e) => {
        this.currentRotation.z = Number.parseInt(e.target.value)
        this.updateRotation()
      })
  
      // Reset button
      this.resetBtn.addEventListener("click", () => {
        this.resetTransforms()
      })
  
      // Upload button
      this.uploadBtn.addEventListener("click", () => {
        this.fileInput.click()
      })
  
      // File input
      this.fileInput.addEventListener("change", (e) => {
        this.handleFileUpload(e)
      })
  
      // Touch gestures for mobile
      this.setupTouchGestures()
  
      // Marker events
      this.marker.addEventListener("markerFound", () => {
        console.log("Marker found")
        this.showControls()
      })
  
      this.marker.addEventListener("markerLost", () => {
        console.log("Marker lost")
      })
    }
  
    updateSize(scale) {
      this.currentScale = scale
      if (this.wallartPlane && this.frame) {
        // Update wallart plane
        this.wallartPlane.setAttribute("scale", `${scale} ${scale} ${scale}`)
        // Update frame to match
        this.frame.setAttribute("scale", `${scale} ${scale} ${scale}`)
      }
    }
  
    updateRotation() {
      if (this.wallartPlane && this.frame) {
        const rotation = `${this.currentRotation.x} ${this.currentRotation.y} ${this.currentRotation.z}`
        this.wallartPlane.setAttribute("rotation", rotation)
        this.frame.setAttribute("rotation", rotation)
      }
    }
  
    resetTransforms() {
      // Reset sliders
      this.sizeSlider.value = 1
      this.rotateXSlider.value = 0
      this.rotateYSlider.value = 0
      this.rotateZSlider.value = 0
  
      // Reset values
      this.currentScale = 1
      this.currentRotation = { x: 0, y: 0, z: 0 }
  
      // Apply reset
      this.updateSize(1)
      this.updateRotation()
    }
  
    handleFileUpload(event) {
      const file = event.target.files[0]
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          // Create new image asset
          const img = document.createElement("img")
          img.id = "user-wallart"
          img.src = e.target.result
          img.crossOrigin = "anonymous"
  
          // Add to assets
          const assets = document.querySelector("a-assets")
          const existingImg = document.querySelector("#user-wallart")
          if (existingImg) {
            existingImg.remove()
          }
          assets.appendChild(img)
  
          // Update plane source
          setTimeout(() => {
            this.wallartPlane.setAttribute("src", "#user-wallart")
          }, 100)
        }
        reader.readAsDataURL(file)
      }
    }
  
    setupTouchGestures() {
      let startX, startY
      let isRotating = false
  
      this.wallartPlane.addEventListener("touchstart", (e) => {
        if (e.touches.length === 1) {
          startX = e.touches[0].clientX
          startY = e.touches[0].clientY
          isRotating = true
        }
      })
  
      this.wallartPlane.addEventListener("touchmove", (e) => {
        if (isRotating && e.touches.length === 1) {
          e.preventDefault()
          const deltaX = e.touches[0].clientX - startX
          const deltaY = e.touches[0].clientY - startY
  
          // Convert touch movement to rotation
          this.currentRotation.y += deltaX * 0.5
          this.currentRotation.x -= deltaY * 0.5
  
          // Clamp values
          this.currentRotation.x = Math.max(-180, Math.min(180, this.currentRotation.x))
          this.currentRotation.y = Math.max(-180, Math.min(180, this.currentRotation.y))
  
          // Update sliders
          this.rotateXSlider.value = this.currentRotation.x
          this.rotateYSlider.value = this.currentRotation.y
  
          this.updateRotation()
  
          startX = e.touches[0].clientX
          startY = e.touches[0].clientY
        }
      })
  
      this.wallartPlane.addEventListener("touchend", () => {
        isRotating = false
      })
  
      // Pinch to zoom
      let initialDistance = 0
  
      this.wallartPlane.addEventListener("touchstart", (e) => {
        if (e.touches.length === 2) {
          initialDistance = this.getDistance(e.touches[0], e.touches[1])
        }
      })
  
      this.wallartPlane.addEventListener("touchmove", (e) => {
        if (e.touches.length === 2) {
          e.preventDefault()
          const currentDistance = this.getDistance(e.touches[0], e.touches[1])
          const scale = currentDistance / initialDistance
  
          this.currentScale = Math.max(0.5, Math.min(3, this.currentScale * scale))
          this.sizeSlider.value = this.currentScale
          this.updateSize(this.currentScale)
  
          initialDistance = currentDistance
        }
      })
    }
  
    getDistance(touch1, touch2) {
      const dx = touch1.clientX - touch2.clientX
      const dy = touch1.clientY - touch2.clientY
      return Math.sqrt(dx * dx + dy * dy)
    }
  
    showControls() {
      document.querySelector(".controls").style.display = "flex"
    }
  
    hideLoading() {
      setTimeout(() => {
        document.querySelector("#loading").classList.add("hidden")
      }, 2000)
    }
  }
  
  // Initialize the AR Wall Art Viewer
  new ARWallArtViewer()
  
  // Service Worker for PWA capabilities
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered: ", registration)
        })
        .catch((registrationError) => {
          console.log("SW registration failed: ", registrationError)
        })
    })
  }
  