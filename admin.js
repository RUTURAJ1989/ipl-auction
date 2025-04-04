// Initialize Firebase (same as script.js)

// DOM Elements
const playerSelect = document.getElementById('playerSelect');
const startAuctionBtn = document.getElementById('startAuctionBtn');
const endAuctionBtn = document.getElementById('endAuctionBtn');
const resetBidsBtn = document.getElementById('resetBidsBtn');
const forceSellBtn = document.getElementById('forceSellBtn');
const timerSet = document.getElementById('timerSet');
const setTimerBtn = document.getElementById('setTimerBtn');
const addTimeBtn = document.getElementById('addTimeBtn');
const reduceTimeBtn = document.getElementById('reduceTimeBtn');
const auctionState = document.getElementById('auctionState');
const refreshData = document.getElementById('refreshData');

let unsoldPlayers = [];

// Initialize admin panel
function initAdmin() {
    loadUnsoldPlayers();
    setupEventListeners();
    monitorAuctionState();
}

function loadUnsoldPlayers() {
    db.collection('players').where('status', '==', 'unsold')
      .orderBy('price', 'desc')
      .get()
      .then((snapshot) => {
          playerSelect.innerHTML = '<option value="">-- Select Player --</option>';
          unsoldPlayers = [];
          snapshot.forEach((doc) => {
              const player = doc.data();
              player.id = doc.id;
              unsoldPlayers.push(player);
              playerSelect.innerHTML += `<option value="${player.id}">${player.name} (₹${player.price} Cr)</option>`;
          });
      });
}

function setupEventListeners() {
    startAuctionBtn.addEventListener('click', startAuction);
    endAuctionBtn.addEventListener('click', endAuction);
    resetBidsBtn.addEventListener('click', resetBids);
    forceSellBtn.addEventListener('click', forceSell);
    setTimerBtn.addEventListener('click', setTimer);
    addTimeBtn.addEventListener('click', () => adjustTimer(5));
    reduceTimeBtn.addEventListener('click', () => adjustTimer(-5));
    refreshData.addEventListener('click', loadUnsoldPlayers);
}

function monitorAuctionState() {
    rtdb.ref('auction/state').on('value', (snapshot) => {
        const state = snapshot.val();
        if (state === 'live') {
            auctionState.innerHTML = '<span class="badge bg-success">LIVE</span> Auction in progress';
            startAuctionBtn.disabled = true;
            endAuctionBtn.disabled = false;
        } else {
            auctionState.innerHTML = '<span class="badge bg-secondary">PAUSED</span> Auction not active';
            startAuctionBtn.disabled = false;
            endAuctionBtn.disabled = true;
        }
    });
}

function startAuction() {
    const playerId = playerSelect.value;
    if (!playerId) {
        alert("Please select a player first");
        return;
    }
    
    const player = unsoldPlayers.find(p => p.id === playerId);
    if (!player) return;
    
    // Set auction state
    rtdb.ref('auction').update({
        state: 'live',
        currentPlayer: {
            name: player.name,
            imageUrl: player.imageUrl,
            role: player.role,
            country: player.country,
            price: player.price
        },
        currentBid: {
            team: "",
            amount: player.price,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        },
        timer: 30
    });
    
    alert(`Auction started for ${player.name}`);
}

function endAuction() {
    rtdb.ref('auction/state').set('paused');
    alert("Auction paused");
}

function resetBids() {
    if (!confirm("Reset all bids for current player?")) return;
    
    rtdb.ref('auction/currentBid').once('value').then((snapshot) => {
        const currentBid = snapshot.val();
        if (currentBid) {
            rtdb.ref('auction/currentBid').set({
                team: "",
                amount: currentPlayer.price,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            alert("Bids reset to base price");
        }
    });
}

function forceSell() {
    if (!confirm("Force sell current player at current bid?")) return;
    
    rtdb.ref('auction/timer').set(0);
    alert("Player will be sold immediately");
}

function setTimer() {
    const seconds = parseInt(timerSet.value);
    if (isNaN(seconds) || seconds < 5 || seconds > 60) {
        alert("Please enter a value between 5 and 60");
        return;
    }
    
    rtdb.ref('auction/timer').set(seconds);
    alert(`Timer set to ${seconds} seconds`);
}

function adjustTimer(seconds) {
    rtdb.ref('auction/timer').once('value').then((snapshot) => {
        const currentTime = snapshot.val();
        const newTime = Math.max(5, Math.min(60, currentTime + seconds));
        rtdb.ref('auction/timer').set(newTime);
        timerSet.value = newTime;
    });
}

// Initialize when page loads
window.addEventListener('load', initAdmin);