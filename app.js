import { db, storage, auth, rtdb } from './firebase-config.js';

// Application State
let currentPlayer = null;
let teams = {};
let timeLeft = 30;
let timerInterval = null;
let unsubscribeTeams = null;
let unsubscribePlayers = null;
let lastBidTime = 0;
const BID_COOLDOWN = 3000; // 3 seconds between bids

// DOM Elements
const bidButton = document.getElementById('bidButton');
const startAuctionBtn = document.getElementById('startAuctionBtn');
const loginForm = document.getElementById('loginForm');
const teamForm = document.getElementById('teamForm');
const playerForm = document.getElementById('playerForm');

// Initialize the application
function initApp() {
    setupEventListeners();
    checkAuthState();
    
    if (window.location.pathname.includes('bidding.html')) {
        initBiddingPage();
    } else if (window.location.pathname.includes('index.html')) {
        initAdminPage();
    }
}

function setupEventListeners() {
    if (bidButton) {
        bidButton.addEventListener('click', placeBid);
    }
    
    if (startAuctionBtn) {
        startAuctionBtn.addEventListener('click', startAuctionForSelectedPlayer);
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (teamForm) {
        teamForm.addEventListener('submit', handleTeamFormSubmit);
    }
    
    if (playerForm) {
        playerForm.addEventListener('submit', handlePlayerFormSubmit);
    }
}

function checkAuthState() {
    auth.onAuthStateChanged(user => {
        if (user && window.location.pathname.includes('login.html')) {
            window.location.href = 'index.html';
        } else if (!user && !window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    });
}

// Bidding Page Functions
function initBiddingPage() {
    loadTeams();
    loadUnsoldPlayers();
    setupRealtimeListeners();
    setupAuctionListeners();
}

function loadTeams() {
    return new Promise((resolve, reject) => {
        unsubscribeTeams = db.collection('teams').onSnapshot(
            snapshot => {
                teams = {};
                const container = document.getElementById('teamsContainer');
                container.innerHTML = '';
                
                snapshot.forEach(doc => {
                    teams[doc.id] = doc.data();
                    renderTeam(doc.data());
                });
                resolve();
            },
            error => {
                console.error("Teams listener error:", error);
                showStatus("Teams update failed", "danger");
                reject(error);
            }
        );
    });
}

// Admin Page Functions
function initAdminPage() {
    loadTeams();
    loadPlayers();
    loadUnsoldPlayersForAuction();
    monitorAuctionStatus();
}

// Core Auction Functions
function startAuctionForPlayer(player) {
    currentPlayer = {
        id: player.id,
        name: player.name,
        role: player.role,
        country: player.country,
        imageUrl: player.imageUrl,
        basePrice: player.price * 10000000,
        status: "auction"
    };
    
    return rtdb.ref('auction').set({
        currentPlayer: currentPlayer,
        currentBid: {
            highestBid: currentPlayer.basePrice,
            highestBidder: "No bids yet",
            amount: currentPlayer.basePrice,
            team: "No bids yet"
        },
        bidHistory: {}
    });
}

// UI Update Functions
function updateAuctionUI() {
    if (!currentPlayer) return;
    
    document.getElementById("currentPlayerName").textContent = currentPlayer.name;
    document.getElementById("currentPlayerImage").src = currentPlayer.imageUrl || "https://via.placeholder.com/150";
    document.getElementById("playerRole").textContent = currentPlayer.role;
    document.getElementById("playerCountry").textContent = currentPlayer.country;
    document.getElementById("basePrice").textContent = (currentPlayer.basePrice / 10000000).toFixed(2);
    
    if (currentPlayer.highestBid) {
        document.getElementById("currentBid").textContent = (currentPlayer.highestBid / 10000000).toFixed(2);
        document.getElementById("highestBidder").textContent = currentPlayer.highestBidder;
    }
    
    updateTeamBudgetsUI();
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initApp);