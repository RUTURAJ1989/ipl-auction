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
const auth = firebase.auth();

// DOM Elements
const bidButton = document.getElementById('bidButton');
const countdownElement = document.getElementById('countdown');
const currentBidElement = document.getElementById('currentBid');
const leadingTeamElement = document.getElementById('leadingTeam');
const bidHistoryElement = document.getElementById('bidHistory');
const teamsContainer = document.getElementById('teamsContainer');
const upNextPlayers = document.getElementById('upNextPlayers');
const auctionStatus = document.getElementById('auctionStatus');
const soldBadge = document.getElementById('soldBadge');
const adminLink = document.getElementById('adminLink');
const liveBadge = document.getElementById('liveBadge');

// Auction state
let currentPlayer = null;
let timer = 30;
let countdownInterval = null;
let teams = [];
let isAuctionLive = false;

// Sound effects
const bidSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-positive-interface-beep-221.mp3');
const hammerSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-mallet-knock-833.mp3');
const timerSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');

// Check auth state
auth.onAuthStateChanged(user => {
  if (user) {
      adminLink.classList.remove('d-none');
  }
  initAuction();
});

// Initialize auction
function initAuction() {
  // Listen for auction state
  rtdb.ref('auction/state').on('value', (snapshot) => {
      isAuctionLive = snapshot.val() === 'live';
      updateAuctionStatusUI();
  });

  // Listen for current player changes
  rtdb.ref('auction/currentPlayer').on('value', (snapshot) => {
      const player = snapshot.val();
      if (player) {
          setCurrentPlayer(player);
          startTimer();
      } else {
          resetAuctionUI();
      }
  });

  // Listen for bid updates
  rtdb.ref('auction/currentBid').on('value', (snapshot) => {
      const bid = snapshot.val();
      if (bid) {
          updateBidDisplay(bid);
          addBidToHistory(bid);
          playSound(bidSound);
      }
  });

  // Listen for timer updates from admin
  rtdb.ref('auction/timer').on('value', (snapshot) => {
      const newTime = snapshot.val();
      if (newTime && newTime !== timer) {
          timer = newTime;
          countdownElement.textContent = timer;
      }
  });

  // Load teams
  db.collection('teams').onSnapshot((snapshot) => {
      teams = [];
      teamsContainer.innerHTML = '';
      snapshot.forEach((doc) => {
          const team = doc.data();
          team.id = doc.id;
          teams.push(team);
          renderTeam(team);
      });
  });

  // Load upcoming players
  loadUpcomingPlayers();
}

function loadUpcomingPlayers() {
  db.collection('players').where('status', '==', 'unsold')
    .orderBy('price', 'desc')
    .limit(5)
    .onSnapshot((snapshot) => {
        upNextPlayers.innerHTML = '';
        snapshot.forEach((doc) => {
            const player = doc.data();
            renderUpNextPlayer(player);
        });
    });
}

function updateAuctionStatusUI() {
  if (isAuctionLive) {
      liveBadge.classList.remove('d-none');
      auctionStatus.textContent = "Auction in progress";
  } else {
      liveBadge.classList.add('d-none');
      auctionStatus.textContent = "Auction paused";
      bidButton.disabled = true;
  }
}

function setCurrentPlayer(player) {
  currentPlayer = player;
  document.getElementById('currentPlayerName').textContent = player.name;
  document.getElementById('currentPlayerImage').src = player.imageUrl || 'https://via.placeholder.com/150';
  document.getElementById('playerRole').textContent = player.role;
  document.getElementById('playerCountry').textContent = player.country;
  document.getElementById('basePrice').textContent = player.price.toFixed(2);
  document.getElementById('currentBid').textContent = player.price.toFixed(2);
  
  // Reset UI
  soldBadge.classList.add('d-none');
  bidButton.disabled = !isAuctionLive;
  bidButton.classList.remove('btn-success');
  bidButton.classList.add('btn-warning');
  bidButton.innerHTML = '<i class="fas fa-hand-paper me-2"></i> PLACE BID';
}

function resetAuctionUI() {
  auctionStatus.textContent = "Waiting for auction to start...";
  document.getElementById('currentPlayerName').textContent = "No player selected";
  document.getElementById('basePrice').textContent = "0.00";
  document.getElementById('currentBid').textContent = "0.00";
  countdownElement.textContent = "--";
  bidButton.disabled = true;
  leadingTeamElement.innerHTML = '<h4 class="mb-0 fw-bold">No bids yet</h4>';
}

function startTimer() {
  clearInterval(countdownInterval);
  timer = 30;
  countdownElement.textContent = timer;
  
  countdownInterval = setInterval(() => {
      timer--;
      countdownElement.textContent = timer;
      
      if (timer <= 5) {
          playSound(timerSound);
          countdownElement.classList.add('animate__animated', 'animate__heartBeat');
          setTimeout(() => {
              countdownElement.classList.remove('animate__animated', 'animate__heartBeat');
          }, 1000);
      }
      
      if (timer <= 0) {
          clearInterval(countdownInterval);
          sellPlayer();
      }
  }, 1000);
}

function updateBidDisplay(bid) {
  currentBidElement.textContent = bid.amount.toFixed(2);
  
  const biddingTeam = teams.find(t => t.code === bid.team);
  if (biddingTeam) {
      leadingTeamElement.innerHTML = `
          <img src="${biddingTeam.logoUrl}" class="team-logo me-3">
          <div class="text-start">
              <h4 class="mb-0 fw-bold">${biddingTeam.code}</h4>
              <small class="text-muted">₹${(biddingTeam.remainingBudget - bid.amount).toFixed(2)} Cr left</small>
          </div>
      `;
  }
}

function addBidToHistory(bid) {
  const bidTime = moment().format('h:mm:ss a');
  const bidItem = document.createElement('div');
  bidItem.className = 'bid-history-item p-2 mb-2 rounded-2 animate__animated animate__fadeIn';
  bidItem.innerHTML = `
      <div class="d-flex justify-content-between">
          <span class="fw-bold">${bid.team}</span>
          <span class="text-warning">₹${bid.amount.toFixed(2)} Cr</span>
      </div>
      <small class="text-muted">${bidTime}</small>
  `;
  bidHistoryElement.prepend(bidItem);
  
  // Limit history items
  if (bidHistoryElement.children.length > 10) {
      bidHistoryElement.removeChild(bidHistoryElement.lastChild);
  }
}

function renderTeam(team) {
  const teamElement = document.createElement('div');
  teamElement.className = 'col-6';
  teamElement.innerHTML = `
      <div class="d-flex align-items-center p-2 rounded-3" style="background: rgba(255,255,255,0.05);">
          <img src="${team.logoUrl}" class="team-logo me-3">
          <div>
              <h6 class="mb-0 fw-bold">${team.code}</h6>
              <small class="text-muted">₹${team.remainingBudget.toFixed(2)} Cr</small>
          </div>
      </div>
  `;
  teamsContainer.appendChild(teamElement);
}

function renderUpNextPlayer(player) {
  const playerElement = document.createElement('div');
  playerElement.className = 'col-md-3 col-6 mb-3';
  playerElement.innerHTML = `
      <div class="player-card p-3 text-center rounded-3">
          <img src="${player.imageUrl || 'https://via.placeholder.com/150'}" 
               class="img-fluid rounded-circle mb-2" style="width: 80px; height: 80px; object-fit: cover;">
          <h6 class="mb-1">${player.name}</h6>
          <small class="d-block mb-1">${player.role}</small>
          <small class="text-warning fw-bold">₹${player.price.toFixed(2)} Cr</small>
      </div>
  `;
  upNextPlayers.appendChild(playerElement);
}

function sellPlayer() {
  rtdb.ref('auction/currentBid').once('value').then((snapshot) => {
      const bid = snapshot.val();
      if (bid) {
          // Mark as sold in Firestore
          db.collection('players').where('name', '==', currentPlayer.name)
            .get()
            .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    doc.ref.update({
                        status: 'sold',
                        soldPrice: bid.amount,
                        soldTo: bid.team,
                        soldAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
            });
          
          // Update team budget
          const team = teams.find(t => t.code === bid.team);
          if (team) {
              db.collection('teams').doc(team.id).update({
                  remainingBudget: team.remainingBudget - bid.amount
              });
          }
          
          // Update UI
          soldBadge.classList.remove('d-none');
          auctionStatus.textContent = "Player sold!";
          bidButton.disabled = true;
          bidButton.classList.remove('btn-warning');
          bidButton.classList.add('btn-success');
          bidButton.innerHTML = '<i class="fas fa-check me-2"></i> SOLD';
          
          // Play sound and animate
          playSound(hammerSound);
          document.querySelector('.player-card').classList.add('animate__tada');
          setTimeout(() => {
              document.querySelector('.player-card').classList.remove('animate__tada');
          }, 1000);
          
          // Load next player after delay
          setTimeout(() => {
              loadUpcomingPlayers();
          }, 3000);
      }
  });
}

function playSound(sound) {
  sound.currentTime = 0;
  sound.play().catch(e => console.log("Audio play failed:", e));
}

// Place a bid
bidButton.addEventListener('click', () => {
  if (!currentPlayer || !isAuctionLive) return;
  
  const team = prompt("Enter your team code (e.g., RCB, MI):");
  if (!team) return;
  
  const currentBid = parseFloat(currentBidElement.textContent);
  const bidAmount = parseFloat(prompt(`Enter bid amount (current: ₹${currentBid.toFixed(2)} Cr):`));
  
  if (isNaN(bidAmount) {
      alert("Please enter a valid number");
      return;
  }
  
  if (bidAmount <= currentBid) {
      alert(`Bid must be higher than ₹${currentBid.toFixed(2)} Cr`);
      return;
  }
  
  const biddingTeam = teams.find(t => t.code === team);
  if (!biddingTeam) {
      alert("Invalid team code!");
      return;
  }
  
  if (bidAmount > biddingTeam.remainingBudget) {
      alert(`${team} doesn't have enough budget!`);
      return;
  }
  
  // Update bid in Realtime DB
  rtdb.ref('auction/currentBid').set({
      team: team,
      amount: bidAmount,
      timestamp: firebase.database.ServerValue.TIMESTAMP
  });
  
  // Reset timer
  rtdb.ref('auction/timer').set(30);
});

// Quick bid buttons
function quickBid(increment) {
  if (!currentPlayer || !isAuctionLive) return;
  
  const currentBid = parseFloat(currentBidElement.textContent);
  const bidAmount = currentBid + increment;
  
  // Update bid in Realtime DB
  rtdb.ref('auction/currentBid').set({
      team: "AUTO",
      amount: bidAmount,
      timestamp: firebase.database.ServerValue.TIMESTAMP
  });
  
  // Reset timer
  rtdb.ref('auction/timer').set(30);
}

// Initialize when page loads
window.addEventListener('load', initAuction);