const express = require('express')
const app = express()

//socket setup
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io');
const io = new Server(server, {pingInterval: 2000, pingTimeout: 5000});

const port = 3000

app.use(express.static('public'))

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html')
})

const backEndPlayers = {}
const backEndProjectiles = {}

const SPEED = 10
let projectileId = 0
 
io.on('connection', (socket) => {
    console.log('a user connected');
    backEndPlayers[socket.id] = {
        x: 1540  * Math.random(),
        y: 750 * Math.random(),
        color: `hsl(${360*Math.random()}, 100%, 50%)`,
        sequenceNumber: 0
    }

    io.emit('updatePlayers', backEndPlayers)

    socket.on('shoot', ({x, y, angle}) =>{
      projectileId++;

      const velocity = {
        x: Math.cos(angle) * 10,
        y: Math.sin(angle) * 10
      }

      backEndProjectiles[projectileId] = {
        x,
        y, 
        velocity,
        playerId: socket.id
      }
      console.log(backEndProjectiles)
    })

    socket.on('disconnect', (reason) =>{
        console.log(reason)
        delete backEndPlayers[socket.id]
        io.emit('updatePlayers', backEndPlayers)
    })
    socket.on('keydown', ({keycode, sequenceNumber })=> {
        backEndPlayers[socket.id].sequenceNumber = sequenceNumber
        switch(keycode){
            case 'KeyW':
              backEndPlayers[socket.id].y -=SPEED
              break
            case 'KeyA':
              backEndPlayers[socket.id].x -=SPEED
              break
            case 'KeyS':
              backEndPlayers[socket.id].y +=SPEED
              break
            case 'KeyD':
              backEndPlayers[socket.id].x +=SPEED
              break
          }
    console.log(backEndPlayers)
  })


  //backend ticker
  setInterval(() => {
    io.emit('updatePlayers', backEndPlayers)
  },15)
    
    })

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

console.log('server loaded')