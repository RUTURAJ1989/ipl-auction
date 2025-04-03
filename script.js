function placeBid() {
    alert("Bid placed for Virat Kohli!");
}
let players = [];

function addPlayer() {
    const name = document.getElementById("playerName").value;
    const price = document.getElementById("playerPrice").value;
    
    if (name && price) {
        players.push({ name, price });
        updatePlayerList();
    } else {
        alert("Please fill all fields!");
    }
}

function updatePlayerList() {
    const playerList = document.getElementById("playerList");
    playerList.innerHTML = "<h3>Players List</h3>";
    
    players.forEach(player => {
        playerList.innerHTML += `
            <div class="player-card">
                <h2>${player.name}</h2>
                <p>Base Price: ₹${player.price} Crore</p>
            </div>
        `;
    });
}

