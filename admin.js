// Initialize Firebase (same as script.js)
// In admin.js, update the initAdmin function:
async function initAdmin() {
    try {
        // Verify admin status
        const user = auth.currentUser;
        if (!user) {
            window.location.href = "login.html";
            return;
        }
        
        const token = await user.getIdTokenResult();
        if (!token.claims.admin) {
            alert('You do not have admin privileges');
            auth.signOut();
            return;
        }
        
        // Initialize everything
        initFirestoreListeners();
        loadUnsoldPlayers();
        setupEventListeners();
        monitorAuctionState();
        
        // Load initial data
        await Promise.all([
            loadTeams(),
            loadPlayers()
        ]);
    } catch (error) {
        console.error('Admin initialization error:', error);
        alert('Error initializing admin panel');
    }
}

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
// Initialize Firestore listeners
function initFirestoreListeners() {
    // Team form submission
    document.getElementById('teamForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addTeam();
    });

    // Player form submission
    document.getElementById('playerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addPlayer();
    });
}

// Add a new team
async function addTeam() {
    const form = document.getElementById('teamForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const name = document.getElementById('teamName').value;
    const code = document.getElementById('teamCode').value.toUpperCase();
    const budget = parseFloat(document.getElementById('teamBudget').value);
    const logoFile = document.getElementById('teamLogo').files[0];
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
        
        // Validate inputs
        if (!name || !code || isNaN(budget)) {
            throw new Error('Please fill all required fields');
        }
        
        if (code.length !== 3) {
            throw new Error('Team code must be 3 characters');
        }
        
        // Check if team code already exists
        const existingTeam = await db.collection('teams').where('code', '==', code).get();
        if (!existingTeam.empty) {
            throw new Error('Team code already exists');
        }

        // Upload logo if provided
        let logoUrl = 'https://via.placeholder.com/100';
        if (logoFile) {
            const storageRef = storage.ref(`team_logos/${code}_${Date.now()}`);
            const snapshot = await storageRef.put(logoFile);
            logoUrl = await snapshot.ref.getDownloadURL();
        }
        
        // Add team to Firestore
        await db.collection('teams').add({
            name,
            code,
            budget,
            logoUrl,
            remainingBudget: budget,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Reset form
        form.reset();
        document.getElementById('logoPreview').src = 'https://via.placeholder.com/100';
        
        // Show success message
        showAlert('Team added successfully!', 'success');
    } catch (error) {
        console.error('Error adding team:', error);
        showAlert(error.message, 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save Team';
    }
}

// Add a new player
async function addPlayer() {
    const form = document.getElementById('playerForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const name = document.getElementById('playerName').value;
    const role = document.getElementById('playerRole').value;
    const price = parseFloat(document.getElementById('playerPrice').value);
    const country = document.getElementById('playerCountry').value || 'India';
    const imageFile = document.getElementById('playerImage').files[0];
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
        
        // Validate inputs
        if (!name || !role || isNaN(price)) {
            throw new Error('Please fill all required fields');
        }
        
        if (price < 0.2 || price > 20) {
            throw new Error('Price must be between 0.2 and 20 Cr');
        }

        // Upload image if provided
        let imageUrl = 'https://via.placeholder.com/150';
        if (imageFile) {
            const storageRef = storage.ref(`player_images/${name.replace(/\s+/g, '_')}_${Date.now()}`);
            const snapshot = await storageRef.put(imageFile);
            imageUrl = await snapshot.ref.getDownloadURL();
        }
        
        // Add player to Firestore
        await db.collection('players').add({
            name,
            role,
            price,
            country,
            imageUrl,
            status: 'unsold',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Reset form
        form.reset();
        document.getElementById('playerImagePreview').src = 'https://via.placeholder.com/100';
        
        // Show success message
        showAlert('Player added successfully!', 'success');
    } catch (error) {
        console.error('Error adding player:', error);
        showAlert(error.message, 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save Player';
    }
}

// Helper function to show alerts
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.tab-content');
    container.prepend(alertDiv);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    }, 5000);
}