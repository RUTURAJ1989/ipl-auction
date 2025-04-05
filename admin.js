import { db, storage, rtdb } from './firebase-config.js';
import { showStatus, clearErrorMessages, formatPrice } from './utils.js';

let unsubscribeTeams = null;
let unsubscribePlayers = null;

export function initAdminPage() {
    setupEventListeners();
    loadTeams();
    loadPlayers();
    loadUnsoldPlayersForAuction();
    monitorAuctionStatus();
}

function setupEventListeners() {
    const teamForm = document.getElementById('teamForm');
    const playerForm = document.getElementById('playerForm');
    const uploadTeamsBtn = document.getElementById('uploadTeamsBtn');
    const uploadPlayersBtn = document.getElementById('uploadPlayersBtn');
    const startAuctionBtn = document.getElementById('startAuctionBtn');
    
    if (teamForm) {
        teamForm.addEventListener('submit', handleTeamFormSubmit);
        teamForm.addEventListener('reset', () => {
            document.getElementById('logoPreview').src = 'https://via.placeholder.com/100';
            clearErrorMessages('teamForm');
        });
    }
    
    if (playerForm) {
        playerForm.addEventListener('submit', handlePlayerFormSubmit);
        playerForm.addEventListener('reset', () => {
            document.getElementById('playerImagePreview').src = 'https://via.placeholder.com/150';
            clearErrorMessages('playerForm');
        });
    }
    
    if (uploadTeamsBtn) {
        uploadTeamsBtn.addEventListener('click', handleTeamsUpload);
    }
    
    if (uploadPlayersBtn) {
        uploadPlayersBtn.addEventListener('click', handlePlayersUpload);
    }
    
    if (startAuctionBtn) {
        startAuctionBtn.addEventListener('click', startAuctionForSelectedPlayer);
    }
    
    // Image preview handlers
    const teamLogoInput = document.getElementById('teamLogo');
    if (teamLogoInput) {
        teamLogoInput.addEventListener('change', handleImagePreview);
    }
    
    const playerImageInput = document.getElementById('playerImage');
    if (playerImageInput) {
        playerImageInput.addEventListener('change', handleImagePreview);
    }
}

async function handleTeamFormSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('teamName').value.trim();
    const code = document.getElementById('teamCode').value.trim().toUpperCase();
    const budget = document.getElementById('teamBudget').value;
    const logoFile = document.getElementById('teamLogo').files[0];
    const saveTeamBtn = document.getElementById('saveTeamBtn');
    
    // Validate inputs
    let isValid = true;
    clearErrorMessages('teamForm');
    
    if (!name) {
        document.getElementById('teamNameError').textContent = 'Team name is required';
        isValid = false;
    }
    
    if (!code || code.length !== 3) {
        document.getElementById('teamCodeError').textContent = 'Team code must be 3 characters';
        isValid = false;
    }
    
    if (!budget || budget < 50 || budget > 100) {
        document.getElementById('teamBudgetError').textContent = 'Budget must be between 50 and 100 crores';
        isValid = false;
    }
    
    if (!isValid) return;
    
    try {
        // Show loading state
        saveTeamBtn.disabled = true;
        document.getElementById('saveTeamText').classList.add('d-none');
        document.getElementById('saveTeamSpinner').classList.remove('d-none');
        
        let logoUrl = 'https://via.placeholder.com/100';
        
        // Upload logo if selected
        if (logoFile) {
            const storageRef = storage.ref(`team_logos/${code}_${Date.now()}`);
            const snapshot = await storageRef.put(logoFile);
            logoUrl = await snapshot.ref.getDownloadURL();
        }
        
        // Add team to Firestore
        await db.collection('teams').add({
            name,
            code,
            budget: parseFloat(budget),
            logoUrl,
            remainingBudget: parseFloat(budget),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showStatus('Team added successfully!', 'success');
        teamForm.reset();
    } catch (error) {
        console.error('Error adding team:', error);
        showStatus('Error adding team: ' + error.message, 'danger');
    } finally {
        // Reset button state
        saveTeamBtn.disabled = false;
        document.getElementById('saveTeamText').classList.remove('d-none');
        document.getElementById('saveTeamSpinner').classList.add('d-none');
    }
}

// ... (similar implementations for other admin functions)