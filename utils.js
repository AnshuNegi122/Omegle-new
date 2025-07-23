/**
 * Utility functions for the Safe Video Chat application
 */

// Generate a random user ID
function generateUserId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Format timestamp for chat messages
function formatTimestamp(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

// Create a chat message element
function createMessageElement(message, isSent) {
  const messageDiv = document.createElement("div")
  messageDiv.classList.add("message", isSent ? "sent" : "received")

  const messageContent = document.createElement("p")
  messageContent.textContent = message.content
  messageDiv.appendChild(messageContent)

  const timestamp = document.createElement("span")
  timestamp.classList.add("text-xs", "opacity-75", "block", "text-right", "mt-1")
  timestamp.textContent = formatTimestamp(message.timestamp)
  messageDiv.appendChild(timestamp)

  return messageDiv
}

// Show notification
function showNotification(message, type = "info") {
  const notification = document.getElementById("notification")
  const notificationMessage = document.getElementById("notification-message")
  const notificationIcon = document.getElementById("notification-icon")

  // Set message
  notificationMessage.textContent = message

  // Set icon based on type
  let iconSvg = ""
  switch (type) {
    case "success":
      iconSvg =
        '<svg class="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>'
      break
    case "error":
      iconSvg =
        '<svg class="h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>'
      break
    case "warning":
      iconSvg =
        '<svg class="h-6 w-6 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>'
      break
    default:
      iconSvg =
        '<svg class="h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
  }
  notificationIcon.innerHTML = iconSvg

  // Show notification
  notification.classList.add("show")
  notification.classList.remove("hidden")

  // Hide after 5 seconds
  setTimeout(() => {
    notification.classList.remove("show")
    notification.classList.add("hidden")
  }, 5000)
}

// Check if WebRTC is supported
function isWebRTCSupported() {
  return "RTCPeerConnection" in window
}

// Check if getUserMedia is supported
function isGetUserMediaSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

// Sanitize user input to prevent XSS
function sanitizeInput(input) {
  const div = document.createElement("div")
  div.textContent = input
  return div.innerHTML
}

// Detect inappropriate content (basic implementation)
function containsInappropriateContent(text) {
  // This is a very basic implementation
  // In a real application, you would use more sophisticated methods
  const inappropriateWords = ["inappropriate1", "inappropriate2", "slur1", "slur2"]

  const lowerText = text.toLowerCase()
  return inappropriateWords.some((word) => lowerText.includes(word))
}
