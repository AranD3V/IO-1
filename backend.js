const express = require('express')
const app = express()

// socket.io setup
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 })

const port = process.env.PORT || 3000;

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

const backEndPlayers = {}
const backEndProjectiles = {}

const SPEED = 5
const RADIUS = 10
const PROJECTILE_RADIUS = 5
let projectileId = 0

//connection
io.on('connection', (socket) => {
  console.log('a user connected')

  io.emit('updatePlayers', backEndPlayers)

  socket.on('shoot', ({ x, y, angle }) => {
    if (!backEndPlayers[socket.id]) return

    projectileId++

    const velocity = {
      x: Math.cos(angle) * 5,
      y: Math.sin(angle) * 5
    }

    backEndProjectiles[projectileId] = {
      x,
      y,
      velocity,
      playerId: socket.id
    }

    console.log(backEndProjectiles)
  })

  socket.on('initGame', ({ username, width, height }) => {
    backEndPlayers[socket.id] = {
      x: 1024 * Math.random(),
      y: 576 * Math.random(),
      color: `hsl(${360 * Math.random()}, 100%, 50%)`,
      sequenceNumber: 0,
      score: 0,
      username
    }

    // where we init our canvas
    backEndPlayers[socket.id].canvas = {
      width,
      height
    }

    backEndPlayers[socket.id].radius = RADIUS

    startTicker()
  })

  socket.on('disconnect', (reason) => {
    console.log(reason)
    delete backEndPlayers[socket.id]

    io.emit('updatePlayers', backEndPlayers)
  })

  socket.on('keydown', ({ keycode, sequenceNumber }) => {
    const backEndPlayer = backEndPlayers[socket.id]

    if (!backEndPlayers[socket.id]) return

    backEndPlayers[socket.id].sequenceNumber = sequenceNumber
    switch (keycode) {
      case 'KeyW':
        backEndPlayers[socket.id].y -= SPEED
        break

      case 'KeyA':
        backEndPlayers[socket.id].x -= SPEED
        break

      case 'KeyS':
        backEndPlayers[socket.id].y += SPEED
        break

      case 'KeyD':
        backEndPlayers[socket.id].x += SPEED
        break
    }

    const playerSides = {
      left: backEndPlayer.x - backEndPlayer.radius,
      right: backEndPlayer.x + backEndPlayer.radius,
      top: backEndPlayer.y - backEndPlayer.radius,
      bottom: backEndPlayer.y + backEndPlayer.radius
    }

    if (playerSides.left < 0) backEndPlayers[socket.id].x = backEndPlayer.radius

    if (playerSides.right > 1024)
      backEndPlayers[socket.id].x = 1024 - backEndPlayer.radius

    if (playerSides.top < 0) backEndPlayers[socket.id].y = backEndPlayer.radius

    if (playerSides.bottom > 576)
      backEndPlayers[socket.id].y = 576 - backEndPlayer.radius
  })
})

// backend ticker
const TICK_INTERVAL = 15; // Base interval

let tickInterval = null

function startTicker() {
  if (tickInterval) return
  tickInterval = setInterval(tick, TICK_INTERVAL)
}

function stopTicker() {
  clearInterval(tickInterval)
  tickInterval = null
}

function tick() {
  for (const id in backEndProjectiles) {
    const projectile = backEndProjectiles[id];
    const playerCanvas = backEndPlayers[projectile.playerId]?.canvas;

    // owner died or disconnected — without their canvas the boundary
    // check below can never despawn this projectile
    if (!playerCanvas) {
      delete backEndProjectiles[id];
      continue;
    }

    projectile.x += projectile.velocity.x;
    projectile.y += projectile.velocity.y;

    // Boundary check
    if (
      projectile.x - PROJECTILE_RADIUS >= playerCanvas.width ||
      projectile.x + PROJECTILE_RADIUS <= 0 ||
      projectile.y - PROJECTILE_RADIUS >= playerCanvas.height ||
      projectile.y + PROJECTILE_RADIUS <= 0
    ) {
      delete backEndProjectiles[id];
      continue;
    }

    // Collision detection
    for (const playerId in backEndPlayers) {
      const backEndPlayer = backEndPlayers[playerId];
      const dx = projectile.x - backEndPlayer.x;
      const dy = projectile.y - backEndPlayer.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (
        distance < PROJECTILE_RADIUS + backEndPlayer.radius &&
        projectile.playerId !== playerId
      ) {
        if (backEndPlayers[projectile.playerId])
          backEndPlayers[projectile.playerId].score++;

        delete backEndProjectiles[id];
        delete backEndPlayers[playerId];
        break;
      }
    }
  }

  io.emit('updateProjectiles', backEndProjectiles);
  io.emit('updatePlayers', backEndPlayers);

  // nothing left to simulate — this tick already broadcast the empty
  // state, so clients are clear and the loop can go quiet
  if (
    Object.keys(backEndPlayers).length === 0 &&
    Object.keys(backEndProjectiles).length === 0
  ) {
    stopTicker()
  }
}

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

console.log('server did load')
