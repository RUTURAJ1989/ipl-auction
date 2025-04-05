import { db, rtdb } from './firebase-config.js';
import { showStatus, createConfetti, formatPrice } from './utils.js';

let currentPlayer = null;
let teams = {};
let timeLeft = 30;
let timerInterval = null;
let unsubscribeTeams = null;
let unsubscribePlayers = null;
let lastBidTime = 0;
const BID_COOLDOWN = 3000;

export function initBiddingPage() {
    setupEventListeners();
    loadTeams();
    loadUnsoldPlayers();
    setupRealtimeListeners();
}

function setupEventListeners() {
    const bidButton = document.getElementById('bidButton');
    const quickBidButtons = document.querySelectorAll('.btn-outline-warning');
    
    if (bidButton) {
        bidButton.addEventListener('click', placeBid);
    }
    
    quickBidButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const increment = parseFloat(e.target.textContent.match(/[\d.]+/)[0]);
            quickBid(increment);
        });
    });
}

async function loadTeams() {
    try {
        unsubscribeTeams = db.collection('teams').onSnapshot(
            snapshot => {
                teams = {};
                const container = document.getElementById('teamsContainer');
                container.innerHTML = '';
                
                snapshot.forEach(doc => {
                    teams[doc.id] = doc.data();
                    renderTeam(doc.data());
                });
            },
            error => {
                console.error("Teams listener error:", error);
                showStatus("Teams update failed", "danger");
            }
        );
    } catch (error) {
        console.error("Error loading teams:", error);
        showStatus("Failed to load teams", "danger");
    }
}

function renderTeam(team) {
    const container = document.getElementById('teamsContainer');
    if (!container) return;
    
    const teamElement = document.createElement('div');
    teamElement.className = 'col-6 mb-3';
    teamElement.innerHTML = `
        <div class="team-card p-3 rounded-3">
            <div class="d-flex align-items-center">
                <img src="${team.logoUrl}" class="team-logo me-3">
                <div>
                    <h6 class="mb-1">${team.name}</h6>
                    <small class="text-muted">₹${team.remainingBudget.toFixed(2)} Cr remaining</small>
                </div>
            </div>
        </div>
    `;
    container.appendChild(teamElement);
}

function setupRealtimeListeners() {
    // Current player listener
    rtdb.ref('auction/currentPlayer').on('value', snapshot => {
        const player = snapshot.val();
        if (player) {
            setCurrentPlayer(player);
            startTimer();
        } else {
            resetAuctionUI();
        }
    });

    // Current bid listener
    rtdb.ref('auction/currentBid').on('value', snapshot => {
        const bid = snapshot.val();
        if (bid) {
            updateBidDisplay(bid);
            addBidToHistory(bid);
        }
    });
}

function setCurrentPlayer(player) {
    currentPlayer = player;
    
    // Update UI elements
    document.getElementById('currentPlayerName').textContent = player.name;
    document.getElementById('currentPlayerImage').src = player.imageUrl || "https://via.placeholder.com/150";
    document.getElementById('playerRole').textContent = player.role;
    document.getElementById('playerCountry').textContent = player.country;
    document.getElementById('basePrice').textContent = formatPrice(player.basePrice);
    document.getElementById('currentBid').textContent = formatPrice(player.basePrice);
    
    // Reset UI state
    document.getElementById('soldBadge').classList.add('d-none');
    document.getElementById('bidButton').disabled = false;
    document.getElementById('bidButtonText').innerHTML = '<i class="fas fa-hand-paper me-2"></i> PLACE BID';
    
    // Enable quick bid buttons
    document.querySelectorAll('.btn-outline-warning').forEach(btn => {
        btn.disabled = false;
    });
}

// ... (implementations for other bidding functions)