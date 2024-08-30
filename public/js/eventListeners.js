addEventListener('click', (event) =>{

    const playerPosition = {
        x : frontEndPlayers[socket.id].x,
        y : frontEndPlayers[socket.id].y
    }
    const angle = Math.atan2(
        (event.clientY * window.devicePixelRatio) - playerPosition.y,
        (event.clientX * window.devicePixelRatio) - playerPosition.x
    )
    const velocity = {
        x: Math.cos(angle) * 10,
        y: Math.sin(angle) * 10
    }
    frontEndProjectiles.push(
        new Projectile({
            x: playerPosition.x, 
            y: playerPosition.y, 
            radius: 5, 
            color: 'white', 
            velocity
        })
    )
    console.log(frontEndProjectiles)
})
