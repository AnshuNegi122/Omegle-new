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
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
      // Free TURN servers (these may have limitations)
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
    ],
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

  // Socket.IO is available globally from the CDN
  const io = window.io // Declare the io variable

  // Event Listeners - Simple and working version
  guidelinesAgreement.addEventListener("change", (e) => {
    console.log("Guidelines checkbox changed:", e.target.checked)
    startButton.disabled = !e.target.checked

    // Visual feedback
    if (e.target.checked) {
      startButton.classList.remove("bg-gray-300", "cursor-not-allowed", "text-gray-500")
      startButton.classList.add("bg-blue-500", "text-white", "hover:bg-blue-600")
    } else {
      startButton.classList.add("bg-gray-300", "cursor-not-allowed", "text-gray-500")
      startButton.classList.remove("bg-blue-500", "text-white", "hover:bg-blue-600")
    }
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
    console.log("Start chat button clicked")

    try {
      state.displayName = displayNameInput.value.trim() || "Anonymous"
      console.log("Display name set to:", state.displayName)

      // Get user media
      console.log("Requesting user media...")
      state.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      console.log("User media obtained successfully")

      // Display local video
      localVideo.srcObject = state.localStream

      // Connect to signaling server
      console.log("Connecting to signaling server...")
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
    // Connect to the actual Socket.IO server (io is available globally)
    state.socket = io()

    // Handle connection events
    state.socket.on("connect", () => {
      console.log("Connected to server")
      connectionStatus.textContent = "Connected to server"

      // Join the chat room
      state.socket.emit("join", {
        userId: state.userId,
        displayName: state.displayName,
      })
    })

    state.socket.on("disconnect", () => {
      console.log("Disconnected from server")
      connectionStatus.textContent = "Disconnected"
      showNotification("Disconnected from server", "error")
    })

    // Handle match found
    state.socket.on("match-found", (data) => {
      console.log("Match found:", data.peerId, "Initiator:", data.initiator)
      state.remoteUserId = data.peerId
      connectionStatus.textContent = `Connecting to ${data.peerId}...`

      // Hide waiting message temporarily
      waitingMessage.textContent = "Establishing video connection..."

      // Create peer connection
      createPeerConnection()

      // Only the initiator creates the offer
      if (data.initiator) {
        console.log("Creating offer as initiator")
        setTimeout(() => createOffer(), 1000) // Small delay to ensure both peers are ready
      } else {
        console.log("Waiting for offer as non-initiator")
      }
    })

    // Handle WebRTC signaling
    state.socket.on("offer", async (data) => {
      console.log("Received offer from:", data.from)
      state.remoteUserId = data.from

      if (!state.peerConnection) {
        console.log("Creating peer connection for incoming offer")
        createPeerConnection()
      }

      try {
        console.log("Setting remote description (offer)")
        await state.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))

        console.log("Creating answer")
        const answer = await state.peerConnection.createAnswer()

        console.log("Setting local description (answer)")
        await state.peerConnection.setLocalDescription(answer)

        console.log("Sending answer")
        state.socket.emit("answer", {
          to: data.from,
          answer: answer,
        })
      } catch (error) {
        console.error("Error handling offer:", error)
        showNotification("Failed to establish connection", "error")
      }
    })

    state.socket.on("answer", async (data) => {
      console.log("Received answer from:", data.from)

      try {
        console.log("Setting remote description (answer)")
        await state.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
        console.log("Answer processed successfully")
      } catch (error) {
        console.error("Error handling answer:", error)
      }
    })

    state.socket.on("ice-candidate", async (data) => {
      console.log("Received ICE candidate from:", data.from)

      if (state.peerConnection && state.peerConnection.remoteDescription) {
        try {
          await state.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
          console.log("ICE candidate added successfully")
        } catch (error) {
          console.error("Error adding ICE candidate:", error)
        }
      } else {
        console.log("Peer connection not ready for ICE candidate")
      }
    })

    // Handle peer disconnection
    state.socket.on("peer-disconnected", () => {
      console.log("Peer disconnected")
      handleDisconnection()
    })

    state.socket.on("call-ended", () => {
      console.log("Call ended by peer")
      handleDisconnection()
    })

    // Handle chat messages
    state.socket.on("chat-message", (data) => {
      displayChatMessage(
        {
          content: data.message.content,
          sender: data.from,
          timestamp: data.message.timestamp,
        },
        false,
      )
    })

    // Add these event handlers inside the connectToSignalingServer() function, after the existing ones:

    state.socket.on("waiting-for-match", (data) => {
      connectionStatus.textContent = `Looking for a partner... (${data.waitingCount} users online)`
    })

    state.socket.on("waiting-status", (data) => {
      waitingMessage.textContent = data.message
      showNotification(data.message, "info")
    })

    // Handle message blocking
    state.socket.on("message-blocked", (data) => {
      showNotification(`Message blocked: ${data.reason}`, "warning")
    })

    // Handle report confirmation
    state.socket.on("report-received", () => {
      showNotification("Report submitted successfully", "success")
    })

    // Handle block confirmation
    state.socket.on("user-blocked", () => {
      showNotification("User has been blocked", "success")
    })

    connectionStatus.textContent = "Looking for a partner..."
  }

  function createPeerConnection() {
    console.log("Creating peer connection...")

    // Create a new RTCPeerConnection
    state.peerConnection = new RTCPeerConnection({
      iceServers: state.iceServers,
    })

    // CRITICAL: Handle incoming tracks BEFORE adding local tracks
    state.peerConnection.ontrack = (event) => {
      console.log("🎥 RECEIVED REMOTE TRACK:", event.track.kind)
      console.log("🎥 Track readyState:", event.track.readyState)
      console.log("🎥 Streams count:", event.streams.length)

      if (event.streams && event.streams[0]) {
        console.log("🎥 Setting remote video srcObject")
        remoteVideo.srcObject = event.streams[0]

        // Force the video to load and play
        remoteVideo.load()

        setTimeout(() => {
          remoteVideo
            .play()
            .then(() => {
              console.log("🎥 Remote video playing successfully!")
              waitingMessage.style.display = "none"
              state.isConnected = true
              connectionStatus.textContent = "Connected - Video Active"
              showNotification("Video connection established!", "success")
            })
            .catch((e) => {
              console.error("🎥 Remote video play failed:", e)
              // Try clicking to play (some browsers require user interaction)
              remoteVideo.muted = true
              remoteVideo.play().catch((e2) => console.error("🎥 Muted play also failed:", e2))
            })
        }, 500)
      } else {
        console.error("🎥 No streams in track event!")
      }
    }

    // Add local stream tracks to the connection
    if (state.localStream) {
      console.log("📤 Adding local tracks to peer connection")
      state.localStream.getTracks().forEach((track) => {
        console.log("📤 Adding local track:", track.kind, "enabled:", track.enabled)
        state.peerConnection.addTrack(track, state.localStream)
      })
    } else {
      console.error("❌ No local stream available!")
    }

    // Set up data channel for text chat
    setupDataChannel()

    // Handle ICE candidates
    state.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("🧊 Sending ICE candidate")
        state.socket.emit("ice-candidate", {
          to: state.remoteUserId,
          candidate: event.candidate,
        })
      } else {
        console.log("🧊 ICE gathering complete")
      }
    }

    // Handle connection state changes
    state.peerConnection.onconnectionstatechange = () => {
      console.log("🔗 Connection state:", state.peerConnection.connectionState)

      if (state.peerConnection.connectionState === "connected") {
        console.log("🔗 Peer connection established!")

        // Debug: Check what tracks we have
        const receivers = state.peerConnection.getReceivers()
        console.log("📥 Receivers:", receivers.length)
        receivers.forEach((receiver, index) => {
          if (receiver.track) {
            console.log(`📥 Receiver ${index}:`, receiver.track.kind, "readyState:", receiver.track.readyState)
          }
        })

        // If we still don't have video, try to manually set it
        if (!remoteVideo.srcObject) {
          console.log("🔧 Attempting manual stream recovery...")
          const videoReceiver = receivers.find((r) => r.track && r.track.kind === "video")
          const audioReceiver = receivers.find((r) => r.track && r.track.kind === "audio")

          if (videoReceiver && videoReceiver.track) {
            const tracks = [videoReceiver.track]
            if (audioReceiver && audioReceiver.track) {
              tracks.push(audioReceiver.track)
            }

            const manualStream = new MediaStream(tracks)
            console.log("🔧 Created manual stream with", tracks.length, "tracks")
            remoteVideo.srcObject = manualStream

            remoteVideo
              .play()
              .then(() => {
                console.log("🔧 Manual stream playing!")
                waitingMessage.style.display = "none"
                state.isConnected = true
              })
              .catch((e) => console.error("🔧 Manual stream play failed:", e))
          }
        }
      } else if (state.peerConnection.connectionState === "failed") {
        console.error("🔗 Connection failed - likely NAT/firewall issue")
        showNotification("Connection failed. Trying to reconnect...", "warning")

        // Try to restart ICE
        state.peerConnection.restartIce()

        // If that doesn't work, show helpful message
        setTimeout(() => {
          if (state.peerConnection.connectionState === "failed") {
            showNotification("Connection failed. Both users may be behind strict firewalls.", "error")
          }
        }, 5000)
      } else if (state.peerConnection.connectionState === "disconnected") {
        console.log("🔗 Connection disconnected, waiting for reconnection...")
        showNotification("Connection interrupted, attempting to reconnect...", "warning")
      }
    }

    // Handle ICE connection state
    state.peerConnection.oniceconnectionstatechange = () => {
      console.log("🧊 ICE connection state:", state.peerConnection.iceConnectionState)
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
    if (!state.peerConnection) {
      console.error("No peer connection available for creating offer")
      return
    }

    try {
      console.log("📞 Creating offer...")

      // Make sure we have local stream before creating offer
      if (!state.localStream) {
        console.error("❌ No local stream when creating offer!")
        return
      }

      const offer = await state.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })

      console.log("📞 Setting local description (offer)")
      await state.peerConnection.setLocalDescription(offer)

      console.log("📞 Sending offer to:", state.remoteUserId)
      state.socket.emit("offer", {
        to: state.remoteUserId,
        offer: offer,
      })
    } catch (error) {
      console.error("📞 Error creating offer:", error)
      showNotification("Failed to establish connection.", "error")
    }
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

    // Send via Socket.IO to the server
    if (state.socket && state.remoteUserId) {
      state.socket.emit("chat-message", {
        to: state.remoteUserId,
        message: message,
      })
    }
  }

  function displayChatMessage(message, isSent) {
    const messageElement = document.createElement("div")
    messageElement.classList.add("message", isSent ? "sent" : "received")

    const messageContent = document.createElement("p")
    messageContent.textContent = message.content
    messageContent.style.margin = "0"
    messageElement.appendChild(messageContent)

    const timestamp = document.createElement("span")
    timestamp.classList.add("timestamp")
    timestamp.textContent = new Date(message.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    messageElement.appendChild(timestamp)

    messagesContainer.appendChild(messageElement)
    messagesContainer.scrollTop = messagesContainer.scrollHeight

    // Auto-show chat on mobile when receiving messages
    if (window.innerWidth < 1024 && !isSent && !chatSidebar.classList.contains("show")) {
      // Show a brief notification that there's a new message
      showNotification("New message received", "info")
    }
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
    waitingMessage.style.display = "flex"
    connectionStatus.textContent = "Looking for a partner..."

    // Request new chat from server
    if (state.socket) {
      state.socket.emit("find-new-chat")
    }

    showNotification("Looking for a new chat partner...", "info")
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

    // Send report to server
    if (state.socket && state.remoteUserId) {
      state.socket.emit("report-user", {
        userId: state.remoteUserId,
        reason: reason,
        details: details,
      })
    }

    // Hide modal
    hideReportModal()

    // End the call
    endCall()
  }

  function blockUser() {
    if (!state.isConnected || !state.remoteUserId) {
      showNotification("No user to block", "error")
      return
    }

    // Send block request to server
    if (state.socket) {
      state.socket.emit("block-user", {
        userId: state.remoteUserId,
      })
    }

    // Add user to local blocked list
    state.blockedUsers.add(state.remoteUserId)

    showNotification("User blocked. You will not be matched with them again.", "success")

    // End the call
    endCall()
  }

  // Mobile-specific elements
  const toggleChatButton = document.getElementById("toggle-chat")
  const closeChatButton = document.getElementById("close-chat")
  const chatSidebar = document.getElementById("chat-sidebar")
  const reportUserMobileButton = document.getElementById("report-user-mobile")
  const blockUserMobileButton = document.getElementById("block-user-mobile")

  // Mobile chat toggle functionality
  if (toggleChatButton) {
    toggleChatButton.addEventListener("click", () => {
      chatSidebar.classList.remove("translate-x-full")
      chatSidebar.classList.add("show")
    })
  }

  if (closeChatButton) {
    closeChatButton.addEventListener("click", () => {
      chatSidebar.classList.add("translate-x-full")
      chatSidebar.classList.remove("show")
    })
  }

  // Mobile report and block buttons
  if (reportUserMobileButton) {
    reportUserMobileButton.addEventListener("click", showReportModal)
  }

  if (blockUserMobileButton) {
    blockUserMobileButton.addEventListener("click", blockUser)
  }

  // Handle orientation changes
  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      // Trigger a resize event to help video elements adjust
      window.dispatchEvent(new Event("resize"))

      // Ensure videos maintain proper aspect ratio
      if (state.localStream && localVideo.srcObject) {
        localVideo.style.objectFit = "cover"
      }
      if (remoteVideo.srcObject) {
        remoteVideo.style.objectFit = "cover"
      }
    }, 100)
  })

  // Handle window resize
  window.addEventListener("resize", () => {
    // Close mobile chat sidebar on desktop resize
    if (window.innerWidth >= 1024) {
      chatSidebar.classList.remove("show")
      chatSidebar.classList.add("translate-x-0")
      chatSidebar.classList.remove("translate-x-full")
    } else {
      chatSidebar.classList.remove("translate-x-0")
      if (!chatSidebar.classList.contains("show")) {
        chatSidebar.classList.add("translate-x-full")
      }
    }
  })

  // Touch gesture handling for mobile
  let touchStartX = 0
  let touchStartY = 0

  document.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
    },
    { passive: true },
  )

  document.addEventListener(
    "touchend",
    (e) => {
      if (!touchStartX || !touchStartY) return

      const touchEndX = e.changedTouches[0].clientX
      const touchEndY = e.changedTouches[0].clientY

      const deltaX = touchStartX - touchEndX
      const deltaY = touchStartY - touchEndY

      // Swipe right to close chat on mobile
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -50 && window.innerWidth < 1024) {
        if (chatSidebar.classList.contains("show")) {
          chatSidebar.classList.add("translate-x-full")
          chatSidebar.classList.remove("show")
        }
      }

      touchStartX = 0
      touchStartY = 0
    },
    { passive: true },
  )
})
