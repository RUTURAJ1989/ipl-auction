// Add this at the top of your main JavaScript file
console.log('Script loaded successfully');
// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCdimEpxhfYQkmaJuWUjhegu227c-rhfY0",
  authDomain: "ipl-auction-f62cf.firebaseapp.com",
  databaseURL: "https://ipl-auction-f62cf-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ipl-auction-f62cf",
  storageBucket: "ipl-auction-f62cf.appspot.com",
  messagingSenderId: "1006195476972",
  appId: "1:1006195476972:web:6343541fb0007925ded8c9"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const rtdb = firebase.database();

// Current player being auctioned
let currentPlayer = null;
let teams = {};

// Add debug statements in your player selection handler
function selectPlayer(player) {
  console.log('Selected player:', player);
  // rest of your code
}
// Function to start auction for a player
function startAuctionForPlayer(player) {
  currentPlayer = {
    id: player.id,
    name: player.name,
    role: player.role,
    country: player.country,
    imageUrl: player.imageUrl,
    basePrice: player.price,
    highestBid: player.price,
    highestBidder: "No bids yet",
    status: "auction"
  };
  
  // Update Realtime DB
  rtdb.ref('auction/currentPlayer').set(currentPlayer);
  rtdb.ref('auction/currentBid').set({
    highestBid: currentPlayer.highestBid,
    highestBidder: currentPlayer.highestBidder
  });
}

// Load teams data
function loadTeams() {
  firestore.collection('teams').onSnapshot(snapshot => {
    snapshot.forEach(doc => {
      const team = doc.data();
      teams[team.code] = {
        name: team.name,
        code: team.code,
        budget: team.budget,
        remainingBudget: team.remainingBudget || team.budget,
        logoUrl: team.logoUrl
      };
    });
  });
}

// Update UI with player data
function updateAuctionUI() {
  if (!currentPlayer) return;
  
  document.getElementById("currentPlayerName").textContent = currentPlayer.name;
  document.getElementById("currentPlayerImage").src = currentPlayer.imageUrl || "https://via.placeholder.com/150";
  document.getElementById("playerRole").textContent = currentPlayer.role;
  document.getElementById("playerCountry").textContent = currentPlayer.country;
  document.getElementById("basePrice").textContent = (currentPlayer.basePrice / 10000000).toFixed(2);
  document.getElementById("currentBid").textContent = (currentPlayer.highestBid / 10000000).toFixed(2);
  document.getElementById("highestBidder").textContent = currentPlayer.highestBidder;
  
  // Update team budgets display
  updateTeamBudgetsUI();
}

// Update team budgets UI
function updateTeamBudgetsUI() {
  const teamsContainer = document.getElementById("teamsContainer");
  if (!teamsContainer) return;
  
  teamsContainer.innerHTML = '';
  
  for (const teamCode in teams) {
    const team = teams[teamCode];
    const teamElement = document.createElement('div');
    teamElement.className = 'col-md-4 mb-3';
    teamElement.innerHTML = `
      <div class="team-card p-3 rounded-3 ${currentPlayer.highestBidder === teamCode ? 'leading-team' : ''}">
        <div class="d-flex align-items-center">
          <img src="${team.logoUrl}" class="team-logo me-3">
          <div>
            <h5 class="mb-1">${team.name}</h5>
            <p class="mb-0">₹${(team.remainingBudget / 10000000).toFixed(2)} Cr</p>
          </div>
        </div>
      </div>
    `;
    teamsContainer.appendChild(teamElement);
  }
}

// Place a bid (triggered by button click)
// Proper bid button handler
document.getElementById('bidButton').addEventListener('click', async () => {
  if (!currentPlayer) {
    showStatus("No player being auctioned", "warning");
    return;
  }

  const team = prompt("Enter your team code (e.g., RCB, MI):");
  if (!team || !teams[team]) {
    showStatus("Invalid team code!", "danger");
    return;
  }

  const currentBid = parseFloat(document.getElementById('currentBid').textContent);
  const bidAmount = parseFloat(prompt(`Enter bid amount (current: ₹${currentBid.toFixed(2)} Cr):`));
  
  if (isNaN(bidAmount) || bidAmount <= currentBid) {
    showStatus(`Bid must be higher than ₹${currentBid.toFixed(2)} Cr`, "warning");
    return;
  }

  if (bidAmount > teams[team].remainingBudget) {
    showStatus(`${team} doesn't have enough budget!`, "danger");
    return;
  }

  try {
    // Update bid in Realtime DB
    await rtdb.ref('auction/currentBid').set({
      team: team,
      amount: bidAmount * 10000000,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    
    showStatus(`Bid of ₹${bidAmount.toFixed(2)} Cr placed by ${team}`, "success");
    resetTimer();
  } catch (error) {
    console.error("Bid failed:", error);
    showStatus("Failed to place bid", "danger");
  }
});
  
  const currentBidInCr = currentPlayer.highestBid / 10000000;
  const bidAmountInCr = Number(prompt(`Enter your bid (current: ₹${currentBidInCr.toFixed(2)} Cr):`));
  
  if (isNaN(bidAmountInCr) {
    alert("Please enter a valid number");
    return;
  }
  
  const bidAmount = bidAmountInCr * 10000000;
  
  // Check if bid is valid
  if (bidAmount > currentPlayer.highestBid && bidAmount <= teams[teamName].remainingBudget) {
    // Update Firebase (real-time sync)
    rtdb.ref('auction/currentBid').set({
      highestBid: bidAmount,
      highestBidder: teamName
    });
    
    // Add to bid history
    const bidHistoryRef = rtdb.ref('auction/bidHistory').push();
    bidHistoryRef.set({
      team: teamName,
      amount: bidAmount,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      playerId: currentPlayer.id
    });
    
    // Reset timer
    resetTimer();
  } else {
    alert("Invalid bid! Either too low or exceeds budget.");
  }
}

// Quick bid function
function quickBid(increment) {
  if (!currentPlayer) return;
  
  const bidAmount = currentPlayer.highestBid + (increment * 10000000);
  const teamName = "SYS"; // System bid
  
  rtdb.ref('auction/currentBid').set({
    highestBid: bidAmount,
    highestBidder: teamName
  });
  
  // Add to bid history
  const bidHistoryRef = rtdb.ref('auction/bidHistory').push();
  bidHistoryRef.set({
    team: teamName,
    amount: bidAmount,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    playerId: currentPlayer.id
  });
  
  resetTimer();
}

// Timer functionality
let timerInterval;
let timeLeft = 30;

function startTimer() {
  clearInterval(timerInterval);
  timeLeft = 30;
  updateTimerDisplay();
  
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      sellPlayer();
    }
  }, 1000);
}

function resetTimer() {
  timeLeft = 30;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const timerElement = document.getElementById("countdownTimer");
  if (timerElement) {
    timerElement.textContent = timeLeft;
    
    if (timeLeft <= 10) {
      timerElement.classList.add("text-danger", "animate__animated", "animate__pulse");
    } else {
      timerElement.classList.remove("text-danger", "animate__animated", "animate__pulse");
    }
  }
}

// Sell player function
firestore.collection('players').doc(currentPlayer.id).update({
  
  // Mark player as sold in Firestore
  firestore.collection('players').doc(currentPlayer.id).update({
    status: 'sold',
    soldPrice: currentPlayer.highestBid,
    soldTo: currentPlayer.highestBidder
  });
  
  // Update team's remaining budget
  if (currentPlayer.highestBidder !== "No bids yet") {
    const team = teams[currentPlayer.highestBidder];
    const newBudget = team.remainingBudget - currentPlayer.highestBid;
    
    firestore.collection('teams').where('code', '==', currentPlayer.highestBidder)
      .get()
      .then(snapshot => {
        snapshot.forEach(doc => {
          doc.ref.update({ remainingBudget: newBudget });
        });
      });
  }
  
  // Update UI
  document.getElementById("soldBadge").classList.remove("d-none");
  document.getElementById("bidButton").classList.add("btn-success");
  document.getElementById("bidButton").classList.remove("btn-warning");
  document.getElementById("bidButton").textContent = "SOLD";
  
  // Play sold animation
  const playerCard = document.querySelector(".player-card");
  playerCard.classList.add("animate__animated", "animate__tada");
  
  setTimeout(() => {
    playerCard.classList.remove("animate__animated", "animate__tada");
  }, 1000);
}

// Load next players
function loadNextPlayers() {
  firestore.collection('players')
    .where('status', '==', 'unsold')
    .orderBy('price', 'desc')
    .limit(5)
    .get()
    .then(snapshot => {
      const upNextContainer = document.getElementById("upNextPlayers");
      if (!upNextContainer) return;
      
      upNextContainer.innerHTML = '';
      
      snapshot.forEach(doc => {
        const player = doc.data();
        const playerElement = document.createElement('div');
        playerElement.className = 'col-md-3 col-6 mb-3';
        playerElement.innerHTML = `
          <div class="player-card-small p-3 rounded-3">
            <img src="${player.imageUrl || 'https://via.placeholder.com/150'}" 
                 class="img-fluid rounded-circle mb-2" style="width: 80px; height: 80px; object-fit: cover;">
            <h6 class="mb-1">${player.name}</h6>
            <small class="d-block mb-1">${player.role}</small>
            <small class="text-warning fw-bold">₹${(player.price / 10000000).toFixed(2)} Cr</small>
          </div>
        `;
        upNextContainer.appendChild(playerElement);
      });
    });
}

// Listen for real-time bid changes
rtdb.ref('auction/currentBid').on('value', (snapshot) => {
  const bidData = snapshot.val();
  if (bidData && currentPlayer) {
    currentPlayer.highestBid = bidData.highestBid;
    currentPlayer.highestBidder = bidData.highestBidder;
    updateAuctionUI();
  }
});

// Listen for current player changes
rtdb.ref('auction/currentPlayer').on('value', (snapshot) => {
  const playerData = snapshot.val();
  if (playerData) {
    currentPlayer = playerData;
    updateAuctionUI();
    startTimer();
  }
});

// Load bid history
function loadBidHistory() {
  rtdb.ref('auction/bidHistory').limitToLast(10).on('value', snapshot => {
    const bidHistoryContainer = document.getElementById("bidHistory");
    if (!bidHistoryContainer) return;
    
    bidHistoryContainer.innerHTML = '';
    
    const bids = [];
    snapshot.forEach(childSnapshot => {
      bids.push(childSnapshot.val());
    });
    
    // Sort by timestamp (newest first)
    bids.sort((a, b) => b.timestamp - a.timestamp);
    
    bids.forEach(bid => {
      const bidElement = document.createElement('div');
      bidElement.className = 'bid-history-item';
      bidElement.innerHTML = `
        <div class="d-flex justify-content-between">
          <span>${bid.team}</span>
          <span class="text-warning">₹${(bid.amount / 10000000).toFixed(2)} Cr</span>
        </div>
        <small class="text-muted">${new Date(bid.timestamp).toLocaleTimeString()}</small>
      `;
      bidHistoryContainer.appendChild(bidElement);
    });
  });
}

// Initialize the app
function initAuctionApp() {
  loadTeams();
  loadNextPlayers();
  loadBidHistory();
  
  // Check if we're on the bidding page
  if (document.getElementById("bidButton")) {
    document.getElementById("bidButton").addEventListener("click", placeBid);
  }
  
  // Check if we're on the admin page
  if (document.getElementById("startAuctionBtn")) {
    document.getElementById("startAuctionBtn").addEventListener("click", () => {
      const playerId = prompt("Enter player ID to auction:");
      if (playerId) {
        firestore.collection('players').doc(playerId).get()
          .then(doc => {
            if (doc.exists) {
              startAuctionForPlayer({ id: doc.id, ...doc.data() });
            } else {
              alert("Player not found!");
            }
          });
      }
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initAuctionApp);