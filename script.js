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
  let db, rtdb, auth;
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    rtdb = firebase.database();
    auth = firebase.auth();
    console.log("Firebase initialized successfully");
    
    // Initialize application
    initAuctionApp();
  } catch (error) {
    console.error("Firebase initialization error:", error);
    showStatus("Failed to connect to server", "danger");
  }
  
  // Application state
  let currentPlayer = null;
  let teams = {};
  let timeLeft = 30;
  let timerInterval = null;
  
  // Initialize the app
  function initAuctionApp() {
    loadTeams();
    loadCurrentPlayer();
    loadNextPlayers();
    loadBidHistory();
    
    // Set up bid button
    const bidButton = document.getElementById("bidButton");
    if (bidButton) {
      bidButton.addEventListener("click", placeBid);
      bidButton.disabled = false;
      bidButton.innerHTML = '<i class="fas fa-hand-paper me-2"></i> PLACE BID';
    }
    
    // Check auth status for admin link
    auth.onAuthStateChanged(user => {
      const adminLink = document.getElementById('adminLink');
      if (adminLink) {
        adminLink.classList.toggle('d-none', !user);
      }
    });
  }
  
  /* All the other functions (loadTeams, placeBid, etc.) go here */
  /* Include all the functions I provided earlier in this response */

// Load current player data
function loadCurrentPlayer() {
  rtdb.ref('auction/currentPlayer').on('value', (snapshot) => {
    const playerData = snapshot.val();
    if (playerData) {
      currentPlayer = playerData;
      updateAuctionUI();
      startTimer();
    } else {
      document.getElementById("currentPlayerName").textContent = "No player selected";
      document.getElementById("bidButton").disabled = true;
    }
  });
}
// Load teams data
function loadTeams() {
  db.collection('teams').onSnapshot(snapshot => {
      teams = {};
      const container = document.getElementById("teamsContainer");
      if (!container) return;
      
      container.innerHTML = '';
      
      snapshot.forEach(doc => {
          const team = doc.data();
          teams[team.code] = {
              id: doc.id,
              name: team.name,
              code: team.code,
              budget: team.budget,
              remainingBudget: team.remainingBudget || team.budget,
              logoUrl: team.logoUrl
          };
          
          const teamElement = document.createElement('div');
          teamElement.className = 'col-md-4 mb-3';
          teamElement.innerHTML = `
              <div class="team-card p-3 rounded-3 ${currentPlayer?.highestBidder === team.code ? 'leading-team' : ''}">
                  <div class="d-flex align-items-center">
                      <img src="${team.logoUrl}" class="team-logo me-3">
                      <div>
                          <h5 class="mb-1">${team.name}</h5>
                          <p class="mb-0">₹${(team.remainingBudget / 10000000).toFixed(2)} Cr</p>
                      </div>
                  </div>
              </div>
          `;
          container.appendChild(teamElement);
      });
  }, error => {
      console.error("Error loading teams:", error);
      showStatus("Failed to load teams", "danger");
  });
}

// Place a bid
function placeBid() {
  if (!currentPlayer) {
      showStatus("No player is currently being auctioned", "warning");
      return;
  }

  // Create team options dropdown
  let teamOptions = '';
  for (const code in teams) {
      const team = teams[code];
      const canBid = team.remainingBudget > currentPlayer.highestBid;
      teamOptions += `<option value="${code}" ${!canBid ? 'disabled' : ''}>
          ${team.name} (₹${(team.remainingBudget / 10000000).toFixed(2)} Cr)
      </option>`;
  }

  const modalHtml = `
      <div class="modal fade" id="bidModal" tabindex="-1">
          <div class="modal-dialog">
              <div class="modal-content bg-dark text-white">
                  <div class="modal-header">
                      <h5 class="modal-title">Place Bid for ${currentPlayer.name}</h5>
                      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                  </div>
                  <div class="modal-body">
                      <div class="mb-3">
                          <label class="form-label">Select Team</label>
                          <select class="form-select" id="bidTeamSelect">
                              ${teamOptions}
                          </select>
                      </div>
                      <div class="mb-3">
                          <label class="form-label">Bid Amount (₹ Crores)</label>
                          <input type="number" class="form-control" id="bidAmount" 
                                 min="${(currentPlayer.highestBid / 10000000 + 0.25).toFixed(2)}" 
                                 step="0.25" 
                                 value="${(currentPlayer.highestBid / 10000000 + 0.25).toFixed(2)}">
                      </div>
                  </div>
                  <div class="modal-footer">
                      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                      <button type="button" class="btn btn-warning" id="confirmBid">Place Bid</button>
                  </div>
              </div>
          </div>
      </div>
  `;

  // Add modal to DOM
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modal = new bootstrap.Modal(document.getElementById('bidModal'));
  modal.show();

  // Handle confirm bid
  document.getElementById('confirmBid').addEventListener('click', () => {
      const teamCode = document.getElementById('bidTeamSelect').value;
      const bidAmount = parseFloat(document.getElementById('bidAmount').value);
      const bidAmountInLakhs = bidAmount * 10000000;

      if (isNaN(bidAmount)) {
          showStatus("Please enter a valid bid amount", "danger");
          return;
      }

      if (bidAmountInLakhs <= currentPlayer.highestBid) {
          showStatus(`Bid must be higher than ₹${(currentPlayer.highestBid / 10000000).toFixed(2)} Cr`, "warning");
          return;
      }

      if (!teams[teamCode]) {
          showStatus("Invalid team selected", "danger");
          return;
      }

      if (bidAmountInLakhs > teams[teamCode].remainingBudget) {
          showStatus(`${teams[teamCode].name} doesn't have enough budget!`, "danger");
          return;
      }

      // Update bid in Realtime DB
      rtdb.ref('auction/currentBid').set({
          highestBid: bidAmountInLakhs,
          highestBidder: teamCode
      });

      // Add to bid history
      rtdb.ref('auction/bidHistory').push().set({
          team: teamCode,
          amount: bidAmountInLakhs,
          timestamp: firebase.rtdb.ServerValue.TIMESTAMP,
          playerId: currentPlayer.id
      });

      resetTimer();
      modal.hide();
      document.getElementById('bidModal').remove();
  });

  // Clean up modal when closed
  document.getElementById('bidModal').addEventListener('hidden.bs.modal', () => {
      document.getElementById('bidModal').remove();
  });
}

// Quick bid function
function quickBid(increment) {
  if (!currentPlayer) return;
  
  const bidAmount = currentPlayer.highestBid + (increment * 10000000);
  const teamCode = "SYS"; // System bid
  
  rtdb.ref('auction/currentBid').set({
      highestBid: bidAmount,
      highestBidder: teamCode
  });
  
  // Add to bid history
  rtdb.ref('auction/bidHistory').push().set({
      team: teamCode,
      amount: bidAmount,
      timestamp: firebase.rtdb.ServerValue.TIMESTAMP,
      playerId: currentPlayer.id
  });
  
  resetTimer();
}

// Timer functionality
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
  
  // Update team's remaining budget if bid was placed
  if (currentPlayer.highestBidder !== "No bids yet" && teams[currentPlayer.highestBidder]) {
      const team = teams[currentPlayer.highestBidder];
      const newBudget = team.remainingBudget - currentPlayer.highestBid;
      
      db.collection('teams').doc(team.id).update({ 
          remainingBudget: newBudget 
      });
  }
  
  // Update UI
  document.getElementById("soldBadge").classList.remove("d-none");
  document.getElementById("bidButton").classList.add("btn-success");
  document.getElementById("bidButton").classList.remove("btn-warning");
  document.getElementById("bidButton").innerHTML = '<i class="fas fa-check me-2"></i> SOLD';
  
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
    .onSnapshot(snapshot => {
      const upNextContainer = document.getElementById("upNextPlayers");
      if (!upNextContainer) return;
      
      upNextContainer.innerHTML = '';
      
      if (snapshot.empty) {
        upNextContainer.innerHTML = '<div class="col-12 text-center py-4 text-muted">No players available</div>';
        return;
      }
      
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
    }, error => {
      console.error("Error loading next players:", error);
      showStatus("Failed to load next players", "danger");
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
          bidElement.className = 'bid-history-item animate__animated animate__fadeIn';
          bidElement.innerHTML = `
              <div class="d-flex justify-content-between">
                  <span class="fw-bold">${bid.team}</span>
                  <span class="text-warning">₹${(bid.amount / 10000000).toFixed(2)} Cr</span>
              </div>
              <small class="text-muted">${new Date(bid.timestamp).toLocaleTimeString()}</small>
          `;
          bidHistoryContainer.appendChild(bidElement);
      });
      
      if (bids.length === 0) {
          bidHistoryContainer.innerHTML = '<div class="text-center py-2 text-muted">No bids yet</div>';
      }
  });
}

// Show status message
function showStatus(message, type = "info") {
  const alert = document.getElementById('statusAlert');
  const messageEl = document.getElementById('statusMessage');
  
  alert.className = `alert status-alert alert-${type} show`;
  messageEl.textContent = message;
  
  setTimeout(() => {
      alert.classList.remove('show');
  }, 5000);
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
  
  // Check auth status for admin link
  auth.onAuthStateChanged(user => {
      const adminLink = document.getElementById('adminLink');
      if (adminLink) {
          adminLink.classList.toggle('d-none', !user);
      }
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

  // Update leading team display
  const leadingTeamDiv = document.getElementById("leadingTeam");
  if (leadingTeamDiv) {
      if (currentPlayer.highestBidder !== "No bids yet" && teams[currentPlayer.highestBidder]) {
          const team = teams[currentPlayer.highestBidder];
          leadingTeamDiv.innerHTML = `
              <img src="${team.logoUrl}" class="team-logo me-3">
              <div class="text-start">
                  <h4 class="mb-0 fw-bold">${team.name}</h4>
                  <small class="text-muted">₹${((team.remainingBudget - currentPlayer.highestBid) / 10000000).toFixed(2)} Cr left</small>
              </div>
          `;
          document.getElementById("leadingBidAmount").textContent = `₹${(currentPlayer.highestBid / 10000000).toFixed(2)} Cr`;
      } else {
          leadingTeamDiv.innerHTML = `
              <div class="text-start">
                  <h4 class="mb-0 fw-bold">No bids yet</h4>
                  <small class="text-muted">₹0.00 Cr</small>
              </div>
          `;
      }
  }

  // Add "Sold" button for admin
  const soldButtonContainer = document.getElementById("soldButtonContainer");
  if (soldButtonContainer) {
      if (currentPlayer.highestBidder !== "No bids yet") {
          soldButtonContainer.innerHTML = `
              <button id="sellPlayerButton" class="btn btn-success">
                  <i class="fas fa-check me-2"></i> Sell Player
              </button>
          `;

          // Add event listener to the "Sell Player" button
          document.getElementById("sellPlayerButton").addEventListener("click", () => {
              sellPlayerToTeam(currentPlayer.highestBidder, currentPlayer.highestBid);
          });
      } else {
          soldButtonContainer.innerHTML = '';
      }
  }

  // Update team cards highlighting
  const teamCards = document.querySelectorAll('.team-card');
  teamCards.forEach(card => {
      card.classList.remove('leading-team');
  });

  if (currentPlayer.highestBidder !== "No bids yet") {
      const leadingCard = document.querySelector(`.team-card img[src="${teams[currentPlayer.highestBidder]?.logoUrl}"]`)?.closest('.team-card');
      if (leadingCard) {
          leadingCard.classList.add('leading-team');
      }
  }
}

// Sell player to team function
function sellPlayerToTeam(teamCode, bidAmount) {
  if (!currentPlayer || !teams[teamCode]) {
      showStatus("Invalid operation. No player or team found.", "danger");
      return;
  }

  // Update player's status in Firestore
  db.collection('players').doc(currentPlayer.id).update({
      status: 'sold',
      soldPrice: bidAmount,
      soldTo: teamCode
  }).then(() => {
      console.log(`Player ${currentPlayer.name} sold to ${teams[teamCode].name} for ₹${(bidAmount / 10000000).toFixed(2)} Cr`);
  }).catch(error => {
      console.error("Error updating player status:", error);
      showStatus("Failed to sell player. Try again.", "danger");
  });

  // Update team's remaining budget in Firestore
  const newBudget = teams[teamCode].remainingBudget - bidAmount;
  db.collection('teams').doc(teams[teamCode].id).update({
      remainingBudget: newBudget
  }).then(() => {
      console.log(`Updated budget for team ${teams[teamCode].name}. Remaining budget: ₹${(newBudget / 10000000).toFixed(2)} Cr`);
  }).catch(error => {
      console.error("Error updating team budget:", error);
      showStatus("Failed to update team budget. Try again.", "danger");
  });

  // Update UI
  showStatus(`Player ${currentPlayer.name} sold to ${teams[teamCode].name}!`, "success");
  document.getElementById("soldBadge").classList.remove("d-none");
  document.getElementById("bidButton").classList.add("btn-success");
  document.getElementById("bidButton").classList.remove("btn-warning");
  document.getElementById("bidButton").innerHTML = '<i class="fas fa-check me-2"></i> SOLD';

  // Reset current player
  currentPlayer = null;
  updateAuctionUI();
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initAuctionApp);