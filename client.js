document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const welcomeScreen = document.getElementById("welcome-screen")
  const chatInterface = document.getElementById("chat-interface")
  const startButton = document.getElementById("start-button")
  const guidelinesAgreement = document.getElementById("guidelines-agreement")
  const displayNameInput = document.getElementById("display-name")
  const connectionStatus = document.getElementById("connection-status")
  const localVideo = document.getElementById("local-video")
  const remoteVideo = document.getElementById("remote-video")
  const waitingMessage = document.getElementById("waiting-message")
  const toggleVideoButton = document.getElementById("toggle-video")
  const toggleAudioButton = document.getElementById("toggle-audio")
  const endCallButton = document.getElementById("end-call")
  const newChatButton = document.getElementById("new-chat-button")
  const reportUserButton = document.getElementById("report-user")
  const blockUserButton = document.getElementById("block-user")
  const messageForm = document.getElementById("message-form")
  const messageInput = document.getElementById("message-input")
  const messagesContainer = document.getElementById("messages")
  const reportModal = document.getElementById("report-modal")
  const reportForm = document.getElementById("report-form")
  const cancelReportButton = document.getElementById("cancel-report")
  const closeNotificationButton = document.getElementById("close-notification")

  // Application state
  const state = {
    userId: generateUserId(),
    displayName: "Anonymous",
    socket: null,
    localStream: null,
    peerConnection: null,
    remoteUserId: null,
    isVideoEnabled: true,
    isAudioEnabled: true,
    blockedUsers: new Set(),
    isConnected: false,
    dataChannel: null,
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
  }

  // Helper functions
  function generateUserId() {
    return "user-" + Math.random().toString(36).substring(2, 7)
  }

  function isWebRTCSupported() {
    return window.RTCPeerConnection && window.MediaStream
  }

  function isGetUserMediaSupported() {
    return navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  }

  function showNotification(message, type) {
    const notification = document.getElementById("notification")
    notification.textContent = message
    notification.classList.remove("hidden")
    notification.classList.add(type)
    setTimeout(() => {
      notification.classList.add("hidden")
    }, 5000)
  }

  function containsInappropriateContent(content) {
    // Placeholder for inappropriate content check
    return false
  }

  function sanitizeInput(content) {
    // Placeholder for input sanitization
    return content
  }

  function createMessageElement(message, isSent) {
    const messageElement = document.createElement("div")
    messageElement.classList.add("message", isSent ? "sent" : "received")
    messageElement.innerHTML = `
            <strong>${message.sender}</strong>: ${message.content}
            <span class="timestamp">${new Date(message.timestamp).toLocaleTimeString()}</span>
        `
    return messageElement
  }

  // Check browser support
  if (!isWebRTCSupported() || !isGetUserMediaSupported()) {
    showNotification(
      "Your browser does not support video chat features. Please use a modern browser like Chrome, Firefox, or Safari.",
      "error",
    )
    startButton.disabled = true
    startButton.textContent = "Browser Not Supported"
    return
  }

  // Event Listeners
  guidelinesAgreement.addEventListener("change", () => {
    startButton.disabled = !guidelinesAgreement.checked
  })

  startButton.addEventListener("click", startChat)
  endCallButton.addEventListener("click", endCall)
  newChatButton.addEventListener("click", findNewChat)
  toggleVideoButton.addEventListener("click", toggleVideo)
  toggleAudioButton.addEventListener("click", toggleAudio)
  reportUserButton.addEventListener("click", showReportModal)
  blockUserButton.addEventListener("click", blockUser)
  cancelReportButton.addEventListener("click", hideReportModal)
  closeNotificationButton.addEventListener("click", () => {
    document.getElementById("notification").classList.add("hidden")
  })

  messageForm.addEventListener("submit", (e) => {
    e.preventDefault()
    sendChatMessage()
  })

  reportForm.addEventListener("submit", (e) => {
    e.preventDefault()
    submitReport()
  })

  // Functions
  async function startChat() {
    try {
      state.displayName = displayNameInput.value.trim() || "Anonymous"

      // Get user media
      state.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      // Display local video
      localVideo.srcObject = state.localStream

      // Connect to signaling server
      connectToSignalingServer()

      // Switch to chat interface
      welcomeScreen.classList.add("hidden")
      chatInterface.classList.remove("hidden")

      showNotification("Connected to server. Waiting for a chat partner...", "success")
    } catch (error) {
      console.error("Error starting chat:", error)
      showNotification(
        "Failed to access camera and microphone. Please ensure you have granted the necessary permissions.",
        "error",
      )
    }
  }

  function connectToSignalingServer() {
    // In a real application, you would connect to your Socket.IO server
    // For this example, we'll simulate the connection

    // Simulate socket connection
    state.socket = {
      emit: (event, data) => {
        console.log(`Emitting ${event}:`, data)
        // Simulate server response
        setTimeout(() => {
          switch (event) {
            case "join":
              simulateUserJoined()
              break
            case "offer":
              // In a real app, this would be sent to the peer
              break
            case "answer":
              // In a real app, this would be sent to the peer
              break
            case "ice-candidate":
              // In a real app, this would be sent to the peer
              break
          }
        }, 1000)
      },
      on: (event, callback) => {
        console.log(`Registered listener for ${event}`)
        // This would register real event listeners in a real app
      },
    }

    // Join the chat room
    state.socket.emit("join", {
      userId: state.userId,
      displayName: state.displayName,
    })

    connectionStatus.textContent = "Looking for a partner..."
  }

  function simulateUserJoined() {
    // This simulates another user joining
    // In a real app, this would be triggered by a socket event

    state.remoteUserId = "simulated-user-" + Math.random().toString(36).substring(2, 7)

    // Create peer connection
    createPeerConnection()

    // Create offer (as if we're the initiator)
    createOffer()

    // Update UI
    waitingMessage.textContent = "Connected! Starting video..."
    connectionStatus.textContent = "Connected"

    // Simulate remote video after a delay
    setTimeout(() => {
      simulateRemoteVideo()
    }, 2000)
  }

  function createPeerConnection() {
    // Create a new RTCPeerConnection
    state.peerConnection = new RTCPeerConnection({
      iceServers: state.iceServers,
    })

    // Add local stream tracks to the connection
    state.localStream.getTracks().forEach((track) => {
      state.peerConnection.addTrack(track, state.localStream)
    })

    // Set up data channel for text chat
    setupDataChannel()

    // Handle ICE candidates
    state.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // In a real app, send this to the peer via signaling server
        state.socket.emit("ice-candidate", {
          to: state.remoteUserId,
          candidate: event.candidate,
        })
      }
    }

    // Handle connection state changes
    state.peerConnection.onconnectionstatechange = () => {
      console.log("Connection state:", state.peerConnection.connectionState)

      if (
        state.peerConnection.connectionState === "disconnected" ||
        state.peerConnection.connectionState === "failed"
      ) {
        handleDisconnection()
      }
    }

    // Handle incoming tracks (remote video/audio)
    state.peerConnection.ontrack = (event) => {
      if (remoteVideo.srcObject !== event.streams[0]) {
        remoteVideo.srcObject = event.streams[0]
        waitingMessage.style.display = "none"
        state.isConnected = true
        showNotification("Connected to a chat partner!", "success")
      }
    }
  }

  function setupDataChannel() {
    // Create a data channel for text chat
    state.dataChannel = state.peerConnection.createDataChannel("chat")

    state.dataChannel.onopen = () => {
      console.log("Data channel is open")
    }

    state.dataChannel.onclose = () => {
      console.log("Data channel is closed")
    }

    state.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        displayChatMessage(message, false)
      } catch (error) {
        console.error("Error parsing message:", error)
      }
    }

    // Handle incoming data channels
    state.peerConnection.ondatachannel = (event) => {
      const receivedChannel = event.channel

      receivedChannel.onmessage = (messageEvent) => {
        try {
          const message = JSON.parse(messageEvent.data)
          displayChatMessage(message, false)
        } catch (error) {
          console.error("Error parsing message:", error)
        }
      }
    }
  }

  async function createOffer() {
    try {
      const offer = await state.peerConnection.createOffer()
      await state.peerConnection.setLocalDescription(offer)

      // In a real app, send this offer to the peer via signaling server
      state.socket.emit("offer", {
        to: state.remoteUserId,
        offer: offer,
      })
    } catch (error) {
      console.error("Error creating offer:", error)
      showNotification("Failed to establish connection.", "error")
    }
  }

  function simulateRemoteVideo() {
    // This simulates receiving a remote video stream
    // In a real app, this would come from the peer connection

    // Create a video element to simulate remote video
    const canvas = document.createElement("canvas")
    canvas.width = 640
    canvas.height = 480

    const ctx = canvas.getContext("2d")
    ctx.fillStyle = "#333"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = "24px Arial"
    ctx.fillStyle = "white"
    ctx.textAlign = "center"
    ctx.fillText("Simulated Remote User", canvas.width / 2, canvas.height / 2)

    // Convert canvas to media stream
    const stream = canvas.captureStream(30) // 30 FPS

    // Add audio track (silent)
    const audioContext = new AudioContext()
    const oscillator = audioContext.createOscillator()
    const dst = oscillator.connect(audioContext.createMediaStreamDestination())
    oscillator.start()
    const audioTrack = dst.stream.getAudioTracks()[0]
    stream.addTrack(audioTrack)

    // Set as remote stream
    remoteVideo.srcObject = stream
    waitingMessage.style.display = "none"
    state.isConnected = true

    // Update UI
    connectionStatus.textContent = "Connected to User123"
    showNotification("Connected to a chat partner!", "success")

    // Simulate receiving a welcome message
    setTimeout(() => {
      const welcomeMessage = {
        content: "Hello! How are you today?",
        sender: "User123",
        timestamp: Date.now(),
      }
      displayChatMessage(welcomeMessage, false)
    }, 3000)
  }

  function sendChatMessage() {
    const content = messageInput.value.trim()

    if (!content) return

    // Check for inappropriate content
    if (containsInappropriateContent(content)) {
      showNotification(
        "Your message may contain inappropriate content. Please review our community guidelines.",
        "warning",
      )
      return
    }

    // Create message object
    const message = {
      content: sanitizeInput(content),
      sender: state.userId,
      displayName: state.displayName,
      timestamp: Date.now(),
    }

    // Display message in UI
    displayChatMessage(message, true)

    // Clear input
    messageInput.value = ""

    // Send via data channel
    if (state.dataChannel && state.dataChannel.readyState === "open") {
      state.dataChannel.send(JSON.stringify(message))
    } else {
      // In our simulation, we'll just simulate receiving a response
      setTimeout(() => {
        const response = {
          content: "I received your message: " + message.content,
          sender: "User123",
          timestamp: Date.now(),
        }
        displayChatMessage(response, false)
      }, 2000)
    }
  }

  function displayChatMessage(message, isSent) {
    const messageElement = createMessageElement(message, isSent)
    messagesContainer.appendChild(messageElement)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }

  function toggleVideo() {
    if (state.localStream) {
      state.isVideoEnabled = !state.isVideoEnabled

      state.localStream.getVideoTracks().forEach((track) => {
        track.enabled = state.isVideoEnabled
      })

      // Update button style
      toggleVideoButton.classList.toggle("bg-red-600", !state.isVideoEnabled)
      toggleVideoButton.classList.toggle("bg-gray-700", state.isVideoEnabled)

      // Show notification
      showNotification(state.isVideoEnabled ? "Video enabled" : "Video disabled", "info")
    }
  }

  function toggleAudio() {
    if (state.localStream) {
      state.isAudioEnabled = !state.isAudioEnabled

      state.localStream.getAudioTracks().forEach((track) => {
        track.enabled = state.isAudioEnabled
      })

      // Update button style
      toggleAudioButton.classList.toggle("bg-red-600", !state.isAudioEnabled)
      toggleAudioButton.classList.toggle("bg-gray-700", state.isAudioEnabled)

      // Show notification
      showNotification(state.isAudioEnabled ? "Microphone enabled" : "Microphone muted", "info")
    }
  }

  function endCall() {
    // Close peer connection
    if (state.peerConnection) {
      state.peerConnection.close()
      state.peerConnection = null
    }

    // Close data channel
    if (state.dataChannel) {
      state.dataChannel.close()
      state.dataChannel = null
    }

    // Reset UI
    remoteVideo.srcObject = null
    waitingMessage.style.display = "flex"
    waitingMessage.textContent = 'Call ended. Click "New Chat" to find another partner.'
    connectionStatus.textContent = "Disconnected"
    messagesContainer.innerHTML = ""

    state.isConnected = false
    state.remoteUserId = null

    showNotification("Call ended", "info")
  }

  function findNewChat() {
    // End current call
    endCall()

    // Reset waiting message
    waitingMessage.textContent = "Waiting for someone to connect..."
    connectionStatus.textContent = "Looking for a partner..."

    // Join a new chat
    state.socket.emit("join", {
      userId: state.userId,
      displayName: state.displayName,
    })

    showNotification("Looking for a new chat partner...", "info")

    // Simulate finding a new partner
    setTimeout(() => {
      simulateUserJoined()
    }, 3000)
  }

  function handleDisconnection() {
    if (state.isConnected) {
      showNotification("Your chat partner disconnected", "warning")
      endCall()
    }
  }

  function showReportModal() {
    if (!state.isConnected) {
      showNotification("No user to report", "error")
      return
    }

    reportModal.classList.remove("hidden")
  }

  function hideReportModal() {
    reportModal.classList.add("hidden")
  }

  function submitReport() {
    const reason = document.getElementById("report-reason").value
    const details = document.getElementById("report-details").value

    // In a real app, send this report to your server
    console.log("Report submitted:", { reason, details, reportedUser: state.remoteUserId })

    // Hide modal
    hideReportModal()

    // Show confirmation
    showNotification("Report submitted. Thank you for helping keep our community safe.", "success")

    // End the call
    endCall()
  }

  function blockUser() {
    if (!state.isConnected || !state.remoteUserId) {
      showNotification("No user to block", "error")
      return
    }

    // Add user to blocked list
    state.blockedUsers.add(state.remoteUserId)

    showNotification("User blocked. You will not be matched with them again.", "success")

    // End the call
    endCall()
  }
})
