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
  const toasterContainer = document.getElementById("toaster-container")

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

  // Enhanced Toaster Notification System
  function showToaster(message, type = "info", duration = 5000) {
    const toaster = document.createElement("div")
    toaster.className = `toaster ${type}`

    const icons = {
      success: `<svg class="toaster-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>`,
      error: `<svg class="toaster-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>`,
      warning: `<svg class="toaster-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
      </svg>`,
      info: `<svg class="toaster-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>`,
    }

    toaster.innerHTML = `
      <div class="toaster-content">
        ${icons[type]}
        <div class="toaster-message">${message}</div>
        <button class="toaster-close">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `

    const closeBtn = toaster.querySelector(".toaster-close")
    closeBtn.addEventListener("click", () => removeToaster(toaster))

    toasterContainer.appendChild(toaster)

    // Auto remove after duration
    setTimeout(() => {
      if (toaster.parentNode) {
        removeToaster(toaster)
      }
    }, duration)

    return toaster
  }

  function removeToaster(toaster) {
    toaster.style.animation = "slideDown 0.3s ease-out"
    setTimeout(() => {
      if (toaster.parentNode) {
        toaster.parentNode.removeChild(toaster)
      }
    }, 300)
  }

  function containsInappropriateContent(content) {
    return false
  }

  function sanitizeInput(content) {
    return content
  }

  function createMessageElement(message, isSent) {
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

    return messageElement
  }

  // Check browser support
  if (!isWebRTCSupported() || !isGetUserMediaSupported()) {
    showToaster(
      "Your browser does not support video chat features. Please use a modern browser like Chrome, Firefox, or Safari.",
      "error",
      10000,
    )
    startButton.disabled = true
    startButton.innerHTML = `
      <span class="flex items-center justify-center">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        Browser Not Supported
      </span>
    `
    return
  }

  const io = window.io

  // Enhanced Event Listeners
  guidelinesAgreement.addEventListener("change", (e) => {
    startButton.disabled = !e.target.checked

    if (e.target.checked) {
      startButton.classList.remove("bg-gray-600", "cursor-not-allowed", "text-gray-400")
      startButton.classList.add(
        "bg-gradient-to-r",
        "from-blue-500",
        "to-purple-600",
        "text-white",
        "hover:from-blue-600",
        "hover:to-purple-700",
        "shadow-lg",
        "hover:shadow-xl",
      )
    } else {
      startButton.classList.add("bg-gray-600", "cursor-not-allowed", "text-gray-400")
      startButton.classList.remove(
        "bg-gradient-to-r",
        "from-blue-500",
        "to-purple-600",
        "text-white",
        "hover:from-blue-600",
        "hover:to-purple-700",
        "shadow-lg",
        "hover:shadow-xl",
      )
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

      state.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      })

      localVideo.srcObject = state.localStream
      connectToSignalingServer()

      welcomeScreen.classList.add("hidden")
      chatInterface.classList.remove("hidden")

      showToaster("Connected to server. Looking for a chat partner...", "success")
    } catch (error) {
      console.error("Error starting chat:", error)
      showToaster("Failed to access camera and microphone. Please check your permissions and try again.", "error")
    }
  }

  function connectToSignalingServer() {
    state.socket = io()

    state.socket.on("connect", () => {
      connectionStatus.textContent = "Connected"
      connectionStatus.parentElement.querySelector(".w-2").classList.remove("bg-red-400")
      connectionStatus.parentElement.querySelector(".w-2").classList.add("bg-green-400")

      state.socket.emit("join", {
        userId: state.userId,
        displayName: state.displayName,
      })
    })

    state.socket.on("disconnect", () => {
      connectionStatus.textContent = "Disconnected"
      connectionStatus.parentElement.querySelector(".w-2").classList.remove("bg-green-400")
      connectionStatus.parentElement.querySelector(".w-2").classList.add("bg-red-400")
      showToaster("Disconnected from server", "error")
    })

    state.socket.on("match-found", (data) => {
      state.remoteUserId = data.peerId
      connectionStatus.textContent = `Connecting to ${data.peerId}...`

      waitingMessage.innerHTML = `
        <div class="text-center">
          <div class="w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6"></div>
          <h3 class="text-xl font-semibold mb-2">Connecting to your chat partner...</h3>
          <p class="text-gray-400">Establishing secure connection</p>
        </div>
      `

      createPeerConnection()

      if (data.initiator) {
        setTimeout(() => createOffer(), 1000)
      }
    })

    state.socket.on("offer", async (data) => {
      state.remoteUserId = data.from

      if (!state.peerConnection) {
        createPeerConnection()
      }

      try {
        await state.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
        const answer = await state.peerConnection.createAnswer()
        await state.peerConnection.setLocalDescription(answer)

        state.socket.emit("answer", {
          to: data.from,
          answer: answer,
        })
      } catch (error) {
        console.error("Error handling offer:", error)
        showToaster("Failed to establish connection", "error")
      }
    })

    state.socket.on("answer", async (data) => {
      try {
        await state.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
      } catch (error) {
        console.error("Error handling answer:", error)
      }
    })

    state.socket.on("ice-candidate", async (data) => {
      if (state.peerConnection && state.peerConnection.remoteDescription) {
        try {
          await state.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
        } catch (error) {
          console.error("Error adding ICE candidate:", error)
        }
      }
    })

    state.socket.on("peer-disconnected", () => {
      handleDisconnection()
    })

    state.socket.on("call-ended", () => {
      handleDisconnection()
    })

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

    state.socket.on("waiting-for-match", (data) => {
      connectionStatus.textContent = `Looking for partner... (${data.waitingCount} online)`
    })

    state.socket.on("waiting-status", (data) => {
      waitingMessage.innerHTML = `
        <div class="text-center">
          <div class="w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6"></div>
          <h3 class="text-xl font-semibold mb-2">${data.message}</h3>
          <p class="text-gray-400">Please wait while we find someone for you</p>
        </div>
      `
    })

    state.socket.on("message-blocked", (data) => {
      showToaster(`Message blocked: ${data.reason}`, "warning")
    })

    state.socket.on("report-received", () => {
      showToaster("Report submitted successfully. Thank you for keeping our community safe.", "success")
    })

    state.socket.on("user-blocked", () => {
      showToaster("User has been blocked successfully", "success")
    })

    connectionStatus.textContent = "Looking for partner..."
  }

  function createPeerConnection() {
    state.peerConnection = new RTCPeerConnection({
      iceServers: state.iceServers,
    })

    state.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        remoteVideo.srcObject = event.streams[0]
        remoteVideo.load()

        setTimeout(() => {
          remoteVideo
            .play()
            .then(() => {
              waitingMessage.style.display = "none"
              state.isConnected = true
              connectionStatus.textContent = "Connected - Video Active"
              showToaster("Video connection established! 🎉", "success")

              // Show quality indicator
              document.getElementById("quality-indicator").classList.remove("hidden")
            })
            .catch((e) => {
              console.error("Remote video play failed:", e)
              remoteVideo.muted = true
              remoteVideo.play().catch((e2) => console.error("Muted play also failed:", e2))
            })
        }, 500)
      }
    }

    if (state.localStream) {
      state.localStream.getTracks().forEach((track) => {
        state.peerConnection.addTrack(track, state.localStream)
      })
    }

    setupDataChannel()

    state.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        state.socket.emit("ice-candidate", {
          to: state.remoteUserId,
          candidate: event.candidate,
        })
      }
    }

    state.peerConnection.onconnectionstatechange = () => {
      if (state.peerConnection.connectionState === "connected") {
        const receivers = state.peerConnection.getReceivers()

        if (!remoteVideo.srcObject) {
          const videoReceiver = receivers.find((r) => r.track && r.track.kind === "video")
          const audioReceiver = receivers.find((r) => r.track && r.track.kind === "audio")

          if (videoReceiver && videoReceiver.track) {
            const tracks = [videoReceiver.track]
            if (audioReceiver && audioReceiver.track) {
              tracks.push(audioReceiver.track)
            }

            const manualStream = new MediaStream(tracks)
            remoteVideo.srcObject = manualStream

            remoteVideo
              .play()
              .then(() => {
                waitingMessage.style.display = "none"
                state.isConnected = true
                showToaster("Connection recovered successfully!", "success")
              })
              .catch((e) => console.error("Manual stream play failed:", e))
          }
        }
      } else if (state.peerConnection.connectionState === "failed") {
        showToaster("Connection failed. Trying to reconnect...", "warning")
        state.peerConnection.restartIce()

        setTimeout(() => {
          if (state.peerConnection.connectionState === "failed") {
            showToaster("Unable to establish connection. Both users may be behind strict firewalls.", "error")
          }
        }, 5000)
      } else if (state.peerConnection.connectionState === "disconnected") {
        showToaster("Connection interrupted, attempting to reconnect...", "warning")
      }
    }
  }

  function setupDataChannel() {
    state.dataChannel = state.peerConnection.createDataChannel("chat")

    state.dataChannel.onopen = () => {
      console.log("Data channel is open")
    }

    state.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        displayChatMessage(message, false)
      } catch (error) {
        console.error("Error parsing message:", error)
      }
    }

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
    if (!state.peerConnection || !state.localStream) return

    try {
      const offer = await state.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })

      await state.peerConnection.setLocalDescription(offer)

      state.socket.emit("offer", {
        to: state.remoteUserId,
        offer: offer,
      })
    } catch (error) {
      console.error("Error creating offer:", error)
      showToaster("Failed to establish connection.", "error")
    }
  }

  function sendChatMessage() {
    const content = messageInput.value.trim()
    if (!content) return

    if (containsInappropriateContent(content)) {
      showToaster("Your message may contain inappropriate content. Please review our community guidelines.", "warning")
      return
    }

    const message = {
      content: sanitizeInput(content),
      sender: state.userId,
      displayName: state.displayName,
      timestamp: Date.now(),
    }

    displayChatMessage(message, true)
    messageInput.value = ""

    if (state.socket && state.remoteUserId) {
      state.socket.emit("chat-message", {
        to: state.remoteUserId,
        message: message,
      })
    }
  }

  function displayChatMessage(message, isSent) {
    const messageElement = createMessageElement(message, isSent)
    messagesContainer.appendChild(messageElement)
    messagesContainer.scrollTop = messagesContainer.scrollHeight

    // Auto-show chat on mobile when receiving messages
    if (window.innerWidth < 1280 && !isSent && !chatSidebar.classList.contains("show")) {
      showToaster("New message received 💬", "info", 3000)
    }
  }

  function toggleVideo() {
    if (state.localStream) {
      state.isVideoEnabled = !state.isVideoEnabled

      state.localStream.getVideoTracks().forEach((track) => {
        track.enabled = state.isVideoEnabled
      })

      toggleVideoButton.classList.toggle("bg-red-600/80", !state.isVideoEnabled)
      toggleVideoButton.classList.toggle("bg-gray-700/80", state.isVideoEnabled)

      showToaster(state.isVideoEnabled ? "Video enabled" : "Video disabled", "info", 2000)
    }
  }

  function toggleAudio() {
    if (state.localStream) {
      state.isAudioEnabled = !state.isAudioEnabled

      state.localStream.getAudioTracks().forEach((track) => {
        track.enabled = state.isAudioEnabled
      })

      toggleAudioButton.classList.toggle("bg-red-600/80", !state.isAudioEnabled)
      toggleAudioButton.classList.toggle("bg-gray-700/80", state.isAudioEnabled)

      showToaster(state.isAudioEnabled ? "Microphone enabled" : "Microphone muted", "info", 2000)
    }
  }

  function endCall() {
    if (state.peerConnection) {
      state.peerConnection.close()
      state.peerConnection = null
    }

    if (state.dataChannel) {
      state.dataChannel.close()
      state.dataChannel = null
    }

    remoteVideo.srcObject = null
    waitingMessage.style.display = "flex"
    waitingMessage.innerHTML = `
      <div class="text-center">
        <div class="w-16 h-16 bg-gray-600 rounded-full mx-auto mb-4 flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold mb-2 text-gray-300">Call ended</h3>
        <p class="text-gray-400">Click "New Chat" to find another partner</p>
      </div>
    `
    connectionStatus.textContent = "Disconnected"
    messagesContainer.innerHTML = ""
    document.getElementById("quality-indicator").classList.add("hidden")

    state.isConnected = false
    state.remoteUserId = null

    showToaster("Call ended", "info")
  }

  function findNewChat() {
    endCall()

    waitingMessage.innerHTML = `
      <div class="text-center">
        <div class="w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6"></div>
        <h3 class="text-xl font-semibold mb-2">Looking for someone awesome...</h3>
        <p class="text-gray-400">We're connecting you with another user</p>
      </div>
    `
    waitingMessage.style.display = "flex"
    connectionStatus.textContent = "Looking for partner..."

    if (state.socket) {
      state.socket.emit("find-new-chat")
    }

    showToaster("Looking for a new chat partner...", "info")
  }

  function handleDisconnection() {
    if (state.isConnected) {
      showToaster("Your chat partner disconnected", "warning")
      endCall()
    }
  }

  function showReportModal() {
    if (!state.isConnected) {
      showToaster("No user to report", "error")
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

    if (state.socket && state.remoteUserId) {
      state.socket.emit("report-user", {
        userId: state.remoteUserId,
        reason: reason,
        details: details,
      })
    }

    hideReportModal()
    endCall()
  }

  function blockUser() {
    if (!state.isConnected || !state.remoteUserId) {
      showToaster("No user to block", "error")
      return
    }

    if (state.socket) {
      state.socket.emit("block-user", {
        userId: state.remoteUserId,
      })
    }

    state.blockedUsers.add(state.remoteUserId)
    showToaster("User blocked. You will not be matched with them again.", "success")
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
      window.dispatchEvent(new Event("resize"))

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
    if (window.innerWidth >= 1280) {
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
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -50 && window.innerWidth < 1280) {
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

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (reportModal.classList.contains("hidden") === false) {
        hideReportModal()
      } else if (chatSidebar.classList.contains("show")) {
        chatSidebar.classList.add("translate-x-full")
        chatSidebar.classList.remove("show")
      }
    }

    if (e.key === "Enter" && e.ctrlKey) {
      sendChatMessage()
    }
  })
})
