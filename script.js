// Debug statement
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
const firestore = firebase.firestore();
const rtdb = firebase.database();

// Current player being auctioned
let currentPlayer = null;
let teams = {};

// Function to start auction for a player
function startAuctionForPlayer(player) {
  currentPlayer = {
    id: player.id,
    name: player.name,
    role: player.role,
    country: player.country,
    imageUrl: player.imageUrl || "https://via.placeholder.com/150",
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
  
  // Start the timer
  startTimer();
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
    updateTeamBudgetsUI();
  });
}

// Update UI with player data
function updateAuctionUI() {
  if (!currentPlayer) return;
  
  document.getElementById("currentPlayerName").textContent = currentPlayer.name;
  document.getElementById("currentPlayerImage").src = currentPlayer.imageUrl;
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
      <div class="team-card p-3 rounded-3 ${currentPlayer?.highestBidder === teamCode ? 'leading-team' : ''}">
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

// Place a bid
async function placeBid() {
  if (!currentPlayer) {
    showStatus("No player being auctioned", "warning");
    return;
  }

  const team = prompt("Enter your team code (e.g., RCB, MI):");
  if (!team || !teams[team]) {
    showStatus("Invalid team code!", "danger");
    return;
  }

  const currentBidInCr = currentPlayer.highestBid / 10000000;
  const bidAmountInCr = parseFloat(prompt(`Enter bid amount (current: ₹${currentBidInCr.toFixed(2)} Cr):`));
  
  if (isNaN(bidAmountInCr) {
    showStatus("Please enter a valid number", "warning");
    return;
  }
  
  const bidAmount = bidAmountInCr * 10000000;
  
  // Check if bid is valid
  if (bidAmount <= currentPlayer.highestBid) {
    showStatus(`Bid must be higher than ₹${currentBidInCr.toFixed(2)} Cr`, "warning");
    return;
  }

  if (bidAmount > teams[team].remainingBudget) {
    showStatus(`${team} doesn't have enough budget!`, "danger");
    return;
  }

  try {
    // Update Firebase (real-time sync)
    await rtdb.ref('auction/currentBid').set({
      highestBid: bidAmount,
      highestBidder: team
    });
    
    // Add to bid history
    const bidHistoryRef = rtdb.ref('auction/bidHistory').push();
    await bidHistoryRef.set({
      team: team,
      amount: bidAmount,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      playerId: currentPlayer.id
    });
    
    showStatus(`Bid of ₹${bidAmountInCr.toFixed(2)} Cr placed by ${team}`, "success");
    resetTimer();
  } catch (error) {
    console.error("Bid failed:", error);
    showStatus("Failed to place bid", "danger");
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
async function sellPlayer() {
  if (!currentPlayer || currentPlayer.highestBidder === "No bids yet") {
    // Player went unsold
    await firestore.collection('players').doc(currentPlayer.id).update({
      status: 'unsold'
    });
    showStatus(`${currentPlayer.name} went unsold`, "warning");
    return;
  }

  try {
    // Mark player as sold in Firestore
    await firestore.collection('players').doc(currentPlayer.id).update({
      status: 'sold',
      soldPrice: currentPlayer.highestBid,
      soldTo: currentPlayer.highestBidder
    });
    
    // Update team's remaining budget
    const team = teams[currentPlayer.highestBidder];
    const newBudget = team.remainingBudget - currentPlayer.highestBid;
    
    await firestore.collection('teams').where('code', '==', currentPlayer.highestBidder)
      .get()
      .then(snapshot => {
        snapshot.forEach(doc => {
          doc.ref.update({ remainingBudget: newBudget });
        });
      });
    
    // Update UI
    document.getElementById("soldBadge").classList.remove("d-none");
    const bidButton = document.getElementById("bidButton");
    if (bidButton) {
      bidButton.classList.add("btn-success");
      bidButton.classList.remove("btn-warning");
      bidButton.textContent = "SOLD";
    }
    
    // Play sold animation
    const playerCard = document.querySelector(".player-card");
    if (playerCard) {
      playerCard.classList.add("animate__animated", "animate__tada");
      setTimeout(() => {
        playerCard.classList.remove("animate__animated", "animate__tada");
      }, 1000);
    }
    
    showStatus(`${currentPlayer.name} sold to ${currentPlayer.highestBidder} for ₹${(currentPlayer.highestBid / 10000000).toFixed(2)} Cr`, "success");
  } catch (error) {
    console.error("Error selling player:", error);
    showStatus("Failed to complete sale", "danger");
  }
}

// Show status message
function showStatus(message, type) {
  const statusElement = document.getElementById("statusMessage");
  if (!statusElement) return;
  
  statusElement.textContent = message;
  statusElement.className = `alert alert-${type}`;
  statusElement.style.display = "block";
  
  setTimeout(() => {
    statusElement.style.display = "none";
  }, 3000);
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

  // Set up bid button if on bidding page
  const bidButton = document.getElementById("bidButton");
  if (bidButton) {
    bidButton.addEventListener("click", placeBid);
  }

  // Set up admin controls if on admin page
  const startAuctionBtn = document.getElementById("startAuctionBtn");
  if (startAuctionBtn) {
    startAuctionBtn.addEventListener("click", () => {
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