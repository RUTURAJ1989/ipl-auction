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
const database = firebase.database();
const firestore = firebase.firestore();

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
      imageUrl: player.imageUrl,
      basePrice: player.price,
      highestBid: player.price,
      highestBidder: "No bids yet",
      status: "auction"
  };

  // Update Realtime DB
  database.ref('auction/currentPlayer').set(currentPlayer);
  database.ref('auction/currentBid').set({
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
              remainingBudget: team.remainingBudget,
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
function placeBid() {
    if (!currentPlayer) return;

    const teamName = prompt("Enter your team code (e.g., RCB, MI, CSK):");
    if (!teamName || !teams[teamName]) {
        alert("Invalid team code!");
        return;
    }

    const currentBidInCr = currentPlayer.highestBid / 10000000;
    const bidAmountInCr = Number(prompt(`Enter your bid (current: ₹${currentBidInCr.toFixed(2)} Cr):`));

    if (isNaN(bidAmountInCr) || bidAmountInCr <= currentBidInCr) {
        alert("Invalid bid! Bid must be higher than the current bid.");
        return;
    }

    const bidAmount = bidAmountInCr * 10000000;

    // Check if bid is valid
    if (bidAmount <= teams[teamName].remainingBudget) {
        // Update Firebase (real-time sync)
        database.ref('auction/currentBid').set({
            highestBid: bidAmount,
            highestBidder: teamName
        });

        // Add to bid history
        const bidHistoryRef = database.ref('auction/bidHistory').push();
        bidHistoryRef.set({
            team: teamName,
            amount: bidAmount,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            playerId: currentPlayer.id
        });

        // Reset timer
        resetTimer();
    } else {
        alert("Invalid bid! Exceeds team's remaining budget.");
    }
}

// Quick bid function
function quickBid(increment) {
    if (!currentPlayer) return;

    const bidAmount = currentPlayer.highestBid + (increment * 10000000);

    // Ensure bid does not exceed any team's budget
    const validTeams = Object.values(teams).filter(team => team.remainingBudget >= bidAmount);
    if (validTeams.length === 0) {
        alert("No team has enough budget for this bid.");
        return;
    }

    const teamName = "SYS"; // System bid

    database.ref('auction/currentBid').set({
        highestBid: bidAmount,
        highestBidder: teamName
    });

    // Add to bid history
    const bidHistoryRef = database.ref('auction/bidHistory').push();
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
    firestore.collection('players').doc(currentPlayer.id).update({
        status: 'sold',
        soldPrice: currentPlayer.highestBid,
        soldTo: currentPlayer.highestBidder
    }).catch(error => {
        console.error("Error updating player status:", error);
        alert("Failed to mark player as sold. Please try again.");
    });

    // Update team's remaining budget
    if (currentPlayer.highestBidder !== "No bids yet") {
        const team = teams[currentPlayer.highestBidder];
        if (team) {
            const newBudget = team.remainingBudget - currentPlayer.highestBid;

            firestore.collection('teams').where('code', '==', currentPlayer.highestBidder)
                .get()
                .then(snapshot => {
                    snapshot.forEach(doc => {
                        doc.ref.update({ remainingBudget: newBudget });
                    });
                })
                .catch(error => {
                    console.error("Error updating team budget:", error);
                    alert("Failed to update team budget. Please try again.");
                });
        }
    }

    // Update UI
    const soldBadge = document.getElementById("soldBadge");
    const bidButton = document.getElementById("bidButton");
    if (soldBadge) soldBadge.classList.remove("d-none");
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

            if (snapshot.empty) {
                upNextContainer.innerHTML = '<p class="text-center text-muted">No players available.</p>';
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
                        <small>Base Price: ₹${(player.price / 10000000).toFixed(2)} Cr</small>
                    </div>
                `;
                upNextContainer.appendChild(playerElement);
            });
        })
        .catch(error => {
            console.error("Error loading next players:", error);
            alert("Failed to load next players. Please try again.");
        });
}