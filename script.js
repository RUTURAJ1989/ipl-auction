// Current player being auctioned
let currentPlayer = {
    id: "player1",
    name: "Virat Kohli",
    basePrice: 20000000, // 2 Crore
    highestBid: 20000000,
    highestBidder: "No bids yet"
  };
  
  // Team budgets (example)
  const teams = {
    RCB: { budget: 80000000, name: "RCB" },
    MI: { budget: 75000000, name: "MI" },
    CSK: { budget: 70000000, name: "CSK" }
  };
  
  // Update UI with player data
  function updateAuctionUI() {
    document.getElementById("currentPlayerName").textContent = currentPlayer.name;
    document.getElementById("currentBid").textContent = `₹${(currentPlayer.highestBid / 10000000).toFixed(2)} Cr`;
    document.getElementById("highestBidder").textContent = currentPlayer.highestBidder;
  }
  
  // Place a bid (triggered by button click)
  function placeBid() {
    const teamName = prompt("Enter your team name (RCB, MI, CSK):");
    const bidAmount = Number(prompt("Enter your bid (in Crores):")) * 10000000;
  
    if (!teamName || !bidAmount) return;
  
    // Check if bid is valid
    if (bidAmount > currentPlayer.highestBid && bidAmount <= teams[teamName].budget) {
      // Update Firebase (real-time sync)
      database.ref('auction/currentBid').set({
        highestBid: bidAmount,
        highestBidder: teamName
      });
    } else {
      alert("Invalid bid! Either too low or exceeds budget.");
    }
  }
  
  // Listen for real-time bid changes
  database.ref('auction/currentBid').on('value', (snapshot) => {
    const bidData = snapshot.val();
    if (bidData) {
      currentPlayer.highestBid = bidData.highestBid;
      currentPlayer.highestBidder = bidData.highestBidder;
      updateAuctionUI();
    }
  });
  
  // Initialize UI
  updateAuctionUI();