/**
 * Server for Safe Video Chat application
 *
 * This is a Node.js server using Express and Socket.IO to handle
 * WebRTC signaling for the video chat application.
 */

const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const path = require("path")

// Create Express app
const app = express()
const server = http.createServer(app)
const io = new Server(server)

// Serve static files
app.use(express.static(path.join(__dirname, "/")))

// Serve index.html for root path
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"))
})

// Store active users and waiting users
const activeUsers = new Map() // userId -> socket
const waitingUsers = new Set() // Set of userIds waiting for a match
const userRooms = new Map() // userId -> roomId
const blockedPairs = new Set() // Set of "userId1:userId2" strings

// Handle socket connections
io.on("connection", (socket) => {
  console.log("New connection:", socket.id)

  let userId = null
  let displayName = null

  // Handle user joining
  socket.on("join", (data) => {
    userId = data.userId
    displayName = data.displayName || "Anonymous"

    console.log(`User ${userId} (${displayName}) joined`)

    // Store user
    activeUsers.set(userId, socket)

    // Add to waiting list
    waitingUsers.add(userId)

    // Try to find a match
    findMatch(userId)
  })

  // Handle WebRTC signaling
  socket.on("offer", (data) => {
    console.log(`Forwarding offer from ${userId} to ${data.to}`)
    const targetSocket = activeUsers.get(data.to)
    if (targetSocket) {
      targetSocket.emit("offer", {
        from: userId,
        offer: data.offer,
      })
    } else {
      console.log(`Target user ${data.to} not found for offer`)
    }
  })

  socket.on("answer", (data) => {
    console.log(`Forwarding answer from ${userId} to ${data.to}`)
    const targetSocket = activeUsers.get(data.to)
    if (targetSocket) {
      targetSocket.emit("answer", {
        from: userId,
        answer: data.answer,
      })
    } else {
      console.log(`Target user ${data.to} not found for answer`)
    }
  })

  socket.on("ice-candidate", (data) => {
    console.log(`Forwarding ICE candidate from ${userId} to ${data.to}`)
    const targetSocket = activeUsers.get(data.to)
    if (targetSocket) {
      targetSocket.emit("ice-candidate", {
        from: userId,
        candidate: data.candidate,
      })
    } else {
      console.log(`Target user ${data.to} not found for ICE candidate`)
    }
  })

  // Handle chat messages
  socket.on("chat-message", (data) => {
    // Check if users are in the same room
    const roomId = userRooms.get(userId)
    const targetUserId = data.to

    if (roomId && userRooms.get(targetUserId) === roomId) {
      const targetSocket = activeUsers.get(targetUserId)
      if (targetSocket) {
        // Check for inappropriate content (basic implementation)
        if (containsInappropriateContent(data.message.content)) {
          // Notify sender that message was blocked
          socket.emit("message-blocked", {
            reason: "inappropriate-content",
          })

          // Log for moderation
          logForModeration({
            type: "blocked-message",
            userId,
            content: data.message.content,
            timestamp: new Date(),
          })

          return
        }

        // Forward message
        targetSocket.emit("chat-message", {
          from: userId,
          message: data.message,
        })
      }
    }
  })

  // Handle user reports
  socket.on("report-user", (data) => {
    const reportedUserId = data.userId
    const reason = data.reason
    const details = data.details

    console.log(`User ${userId} reported ${reportedUserId} for ${reason}`)

    // In a real app, store this report in a database for review
    logForModeration({
      type: "user-report",
      reporterId: userId,
      reportedId: reportedUserId,
      reason,
      details,
      timestamp: new Date(),
    })

    // Acknowledge report
    socket.emit("report-received")
  })

  // Handle user blocking
  socket.on("block-user", (data) => {
    const blockedUserId = data.userId

    // Add to blocked pairs (both directions)
    blockedPairs.add(`${userId}:${blockedUserId}`)
    blockedPairs.add(`${blockedUserId}:${userId}`)

    console.log(`User ${userId} blocked ${blockedUserId}`)

    // Acknowledge block
    socket.emit("user-blocked")
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    if (userId) {
      console.log(`User ${userId} disconnected`)

      // Remove from active users
      activeUsers.delete(userId)

      // Remove from waiting users
      waitingUsers.delete(userId)

      // Notify peer if in a room
      const roomId = userRooms.get(userId)
      if (roomId) {
        // Find the other user in the room
        for (const [otherId, otherRoomId] of userRooms.entries()) {
          if (otherId !== userId && otherRoomId === roomId) {
            const otherSocket = activeUsers.get(otherId)
            if (otherSocket) {
              otherSocket.emit("peer-disconnected")
            }
            break
          }
        }

        // Remove from room
        userRooms.delete(userId)
      }
    }
  })

  // Handle explicit call end
  socket.on("end-call", () => {
    const roomId = userRooms.get(userId)
    if (roomId) {
      // Find the other user in the room
      for (const [otherId, otherRoomId] of userRooms.entries()) {
        if (otherId !== userId && otherRoomId === roomId) {
          const otherSocket = activeUsers.get(otherId)
          if (otherSocket) {
            otherSocket.emit("call-ended")
          }

          // Remove other user from room
          userRooms.delete(otherId)

          // Add other user back to waiting if they want a new match
          waitingUsers.add(otherId)
          break
        }
      }

      // Remove user from room
      userRooms.delete(userId)
    }
  })

  // Handle request for new chat
  socket.on("find-new-chat", () => {
    // End current call if any
    const roomId = userRooms.get(userId)
    if (roomId) {
      // Find the other user in the room
      for (const [otherId, otherRoomId] of userRooms.entries()) {
        if (otherId !== userId && otherRoomId === roomId) {
          const otherSocket = activeUsers.get(otherId)
          if (otherSocket) {
            otherSocket.emit("call-ended")
          }

          // Remove other user from room
          userRooms.delete(otherId)
          break
        }
      }

      // Remove user from room
      userRooms.delete(userId)
    }

    // Add to waiting list
    waitingUsers.add(userId)

    // Try to find a match
    findMatch(userId)
  })

  socket.on("waiting-for-match", (data) => {
    const userSocket = activeUsers.get(userId)
    if (userSocket) {
      userSocket.emit("waiting-status", {
        message: `Waiting for a partner... (${waitingUsers.size} users online)`,
      })
    }
  })
})

// Function to find a match for a user
function findMatch(userId) {
  console.log(`Finding match for ${userId}. Waiting users:`, Array.from(waitingUsers))

  // If user is no longer active or waiting, return
  if (!activeUsers.has(userId) || !waitingUsers.has(userId)) {
    console.log(`User ${userId} is not active or not waiting`)
    return
  }

  // Find another waiting user
  for (const otherId of waitingUsers) {
    // Skip self
    if (otherId === userId) continue

    // Check if users have blocked each other
    if (blockedPairs.has(`${userId}:${otherId}`)) {
      console.log(`Users ${userId} and ${otherId} have blocked each other`)
      continue
    }

    // Found a match
    const userSocket = activeUsers.get(userId)
    const otherSocket = activeUsers.get(otherId)

    if (userSocket && otherSocket) {
      // Create a room
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

      // Remove both users from waiting list
      waitingUsers.delete(userId)
      waitingUsers.delete(otherId)

      // Add both users to the room
      userRooms.set(userId, roomId)
      userRooms.set(otherId, roomId)

      // Notify both users - the first user will initiate the call
      userSocket.emit("match-found", {
        peerId: otherId,
        initiator: true,
      })
      otherSocket.emit("match-found", {
        peerId: userId,
        initiator: false,
      })

      console.log(`Matched ${userId} with ${otherId} in room ${roomId}`)

      // Exit the function since we found a match
      return
    }
  }

  // If no match was found, the user remains in the waiting list
  console.log(`No match found for ${userId}, still waiting. Total waiting: ${waitingUsers.size}`)

  // Notify user they're still waiting
  const userSocket = activeUsers.get(userId)
  if (userSocket) {
    userSocket.emit("waiting-for-match", {
      waitingCount: waitingUsers.size,
    })
  }
}

// Basic function to check for inappropriate content
function containsInappropriateContent(text) {
  // This is a very basic implementation
  // In a real application, you would use more sophisticated methods
  const inappropriateWords = ["inappropriate1", "inappropriate2", "slur1", "slur2"]

  const lowerText = text.toLowerCase()
  return inappropriateWords.some((word) => lowerText.includes(word))
}

// Function to log moderation events
function logForModeration(data) {
  // In a real app, this would store data in a database
  console.log("MODERATION LOG:", data)
}

// Start server
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
