// Ensure firebaseConfig is referenced as a global variable
if (typeof firebaseConfig === 'undefined') {
    console.error('firebaseConfig is not defined. Ensure it is declared in your HTML file.');
} else {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const rtdb = firebase.database();
}

// Current player being auctioned
let currentPlayer = null;
let teams = {};

// Updated startAuctionForPlayer to include error handling
function startAuctionForPlayer(player) {
  try {
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
    rtdb.ref('auction/currentPlayer').set(currentPlayer)
      .then(() => {
        return rtdb.ref('auction/currentBid').set({
          highestBid: currentPlayer.highestBid,
          highestBidder: currentPlayer.highestBidder
        });
      })
      .then(() => {
        updateAuctionUI();
      })
      .catch(error => {
        console.error("Error updating Realtime Database:", error);
        alert("Failed to start auction. Please try again.");
      });
  } catch (error) {
    console.error("Error in startAuctionForPlayer:", error);
    alert("An unexpected error occurred. Please try again.");
  }
}

// Function to load teams data
function loadTeams() {
  db.collection('teams').onSnapshot(snapshot => {
    teams = {};
    snapshot.forEach(doc => {
      teams[doc.id] = doc.data();
    });
    updateTeamBudgetsUI();
  }, error => {
    console.error("Error loading teams:", error);
  });
}

// Function to update auction UI
function updateAuctionUI() {
  if (!currentPlayer) return;

  document.getElementById("currentPlayerName").textContent = currentPlayer.name;
  document.getElementById("currentPlayerImage").src = currentPlayer.imageUrl || "https://via.placeholder.com/150";
  document.getElementById("playerRole").textContent = currentPlayer.role;
  document.getElementById("playerCountry").textContent = currentPlayer.country;
  document.getElementById("basePrice").textContent = (currentPlayer.basePrice / 10000000).toFixed(2);
  document.getElementById("currentBid").textContent = (currentPlayer.highestBid / 10000000).toFixed(2);
  document.getElementById("highestBidder").textContent = currentPlayer.highestBidder;

  updateTeamBudgetsUI();
}

// Function to update team budgets UI
function updateTeamBudgetsUI() {
  const teamsContainer = document.getElementById("teamsContainer");
  if (!teamsContainer) return;

  teamsContainer.innerHTML = '';

  for (const teamCode in teams) {
    const team = teams[teamCode];
    const teamElement = document.createElement('div');
    teamElement.className = 'team-card';
    teamElement.innerHTML = `
      <div class="d-flex align-items-center">
        <img src="${team.logoUrl}" class="team-logo me-3">
        <div>
          <h6 class="mb-1">${team.name}</h6>
          <small class="text-muted">₹${(team.remainingBudget / 10000000).toFixed(2)} Cr remaining</small>
        </div>
      </div>
    `;
    teamsContainer.appendChild(teamElement);
  }
}

// Function to place a bid
function placeBid() {
  if (!currentPlayer) return;

  // Prompt user for team code
  let teamCode = prompt("Enter your team code (e.g., RCB, MI, CSK):");
  if (!teamCode) {
    alert("Team code is required to place a bid.");
    return;
  }

  // Normalize team code (trim spaces and convert to uppercase)
  teamCode = teamCode.trim().toUpperCase();

  // Validate team code
  if (!teams[teamCode]) {
    alert("Invalid team code. Please try again.");
    return;
  }

  // Get current bid and prompt for new bid
  const currentBidInCr = currentPlayer.highestBid / 10000000;
  const bidAmountInCr = Number(prompt(`Enter your bid (current: ₹${currentBidInCr.toFixed(2)} Cr):`));

  // Validate bid amount
  if (isNaN(bidAmountInCr)) {
    alert("Invalid bid amount. Please enter a number.");
    return;
  }

  const bidAmount = bidAmountInCr * 10000000;

  // Check if bid is valid
  if (bidAmount > currentPlayer.highestBid && bidAmount <= teams[teamCode].remainingBudget) {
    currentPlayer.highestBid = bidAmount;
    currentPlayer.highestBidder = teamCode;

    // Update Realtime DB
    rtdb.ref('auction/currentBid').set({
      highestBid: currentPlayer.highestBid,
      highestBidder: currentPlayer.highestBidder
    });

    updateAuctionUI();
  } else {
    alert("Invalid bid. Ensure it is higher than the current bid and within your budget.");
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
function sellPlayer() {
  if (!currentPlayer) return;
  
  // Mark player as sold in Firestore
  db.collection('players').doc(currentPlayer.id).update({
    status: 'sold',
    soldPrice: currentPlayer.highestBid,
    soldTo: currentPlayer.highestBidder
  });
  
  // Update team's remaining budget
  if (currentPlayer.highestBidder !== "No bids yet") {
    const team = teams[currentPlayer.highestBidder];
    const newBudget = team.remainingBudget - currentPlayer.highestBid;
    
    db.collection('teams').where('code', '==', currentPlayer.highestBidder)
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
  db.collection('players')
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
  
  // Updated startAuctionBtn click handler to include error handling
  if (document.getElementById("startAuctionBtn")) {
    document.getElementById("startAuctionBtn").addEventListener("click", () => {
      const playerId = prompt("Enter player ID to auction:");
      if (playerId) {
        db.collection('players').doc(playerId).get()
          .then(doc => {
            if (doc.exists) {
              startAuctionForPlayer({ id: doc.id, ...doc.data() });
            } else {
              alert("Player not found! Please check the ID and try again.");
            }
          })
          .catch(error => {
            console.error("Error fetching player data:", error);
            alert("Failed to fetch player data. Please try again.");
          });
      }
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initAuctionApp);