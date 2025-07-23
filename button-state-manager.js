/**
 * Button State Manager
 * Handles the enable/disable state of the start button based on user agreement
 */

class ButtonStateManager {
  constructor() {
    this.checkbox = null
    this.button = null
    this.statusText = null
    this.initialized = false
  }

  init() {
    // Get DOM elements
    this.checkbox = document.getElementById("guidelines-agreement")
    this.button = document.getElementById("start-button")
    this.statusText = document.getElementById("button-status")

    if (!this.checkbox || !this.button) {
      console.error("Required elements not found for ButtonStateManager")
      return false
    }

    // Set up event listeners
    this.setupEventListeners()

    // Restore saved state
    this.restoreSavedState()

    // Update initial state
    this.updateButtonState()

    this.initialized = true
    console.log("ButtonStateManager initialized successfully")
    return true
  }

  setupEventListeners() {
    // Checkbox change event
    this.checkbox.addEventListener("change", (e) => {
      console.log("Guidelines checkbox changed:", e.target.checked)
      this.updateButtonState()
      this.saveState(e.target.checked)
    })

    // Page visibility change (handle tab switching)
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        this.updateButtonState()
      }
    })

    // Storage event (handle multiple tabs)
    window.addEventListener("storage", (e) => {
      if (e.key === "guidelines-agreed") {
        this.restoreSavedState()
        this.updateButtonState()
      }
    })
  }

  updateButtonState() {
    if (!this.initialized || !this.checkbox || !this.button) return

    const isChecked = this.checkbox.checked

    // Update button disabled state
    this.button.disabled = !isChecked

    // Update button visual state
    if (isChecked) {
      this.button.classList.remove("bg-gray-300", "cursor-not-allowed", "text-gray-500")
      this.button.classList.add("bg-blue-500", "text-white", "hover:bg-blue-600")

      if (this.statusText) {
        this.statusText.classList.add("hidden")
      }
    } else {
      this.button.classList.add("bg-gray-300", "cursor-not-allowed", "text-gray-500")
      this.button.classList.remove("bg-blue-500", "text-white", "hover:bg-blue-600")

      if (this.statusText) {
        this.statusText.classList.remove("hidden")
        this.statusText.textContent = "Please accept the community guidelines to continue"
      }
    }

    console.log("Button state updated - Disabled:", this.button.disabled)
  }

  saveState(agreed) {
    try {
      localStorage.setItem("guidelines-agreed", agreed.toString())
      localStorage.setItem("guidelines-timestamp", Date.now().toString())
    } catch (error) {
      console.warn("Could not save guidelines state to localStorage:", error)
    }
  }

  restoreSavedState() {
    try {
      const savedAgreement = localStorage.getItem("guidelines-agreed")
      const timestamp = localStorage.getItem("guidelines-timestamp")

      // Check if agreement is recent (within 24 hours)
      const isRecent = timestamp && Date.now() - Number.parseInt(timestamp) < 24 * 60 * 60 * 1000

      if (savedAgreement === "true" && isRecent) {
        this.checkbox.checked = true
        console.log("Restored guidelines agreement from localStorage")
      } else if (timestamp && !isRecent) {
        // Clear old agreement
        localStorage.removeItem("guidelines-agreed")
        localStorage.removeItem("guidelines-timestamp")
        console.log("Cleared old guidelines agreement")
      }
    } catch (error) {
      console.warn("Could not restore guidelines state from localStorage:", error)
    }
  }

  // Method to manually trigger state update (useful for debugging)
  forceUpdate() {
    this.updateButtonState()
  }

  // Method to reset state (useful for testing)
  reset() {
    if (this.checkbox) {
      this.checkbox.checked = false
    }
    this.updateButtonState()
    try {
      localStorage.removeItem("guidelines-agreed")
      localStorage.removeItem("guidelines-timestamp")
    } catch (error) {
      console.warn("Could not clear localStorage:", error)
    }
  }
}

// Create global instance
window.buttonStateManager = new ButtonStateManager()

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.buttonStateManager.init()
  })
} else {
  window.buttonStateManager.init()
}
