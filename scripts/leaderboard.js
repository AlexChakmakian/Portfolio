// Functions to handle the winners leaderboard

// DOM elements
const victoryModal = document.getElementById('victory-modal');
const winnerForm = document.getElementById('winner-form');
const winnerNameInput = document.getElementById('winner-name');
const closeModalButton = document.getElementById('close-modal');
const winnersList = document.getElementById('winners-list');

// Event listeners
winnerForm.addEventListener('submit', submitWinner);
closeModalButton.addEventListener('click', closeModal);

// Function to display the victory modal
function showVictoryModal() {
  victoryModal.style.display = 'block';
}

// Function to close the modal
function closeModal() {
  victoryModal.style.display = 'none';
}

// Function to submit a winner to Firebase
function submitWinner(e) {
  e.preventDefault();
  
  const winnerName = winnerNameInput.value.trim();
  
  if (winnerName) {
    // Add to Firebase
    db.collection('chess-winners').add({
      name: winnerName,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      console.log('Winner successfully added!');
      winnerNameInput.value = '';
      closeModal();
      loadWinners(); // Refresh the leaderboard
    })
    .catch(error => {
      console.error('Error adding winner: ', error);
    });
  }
}

// Function to load winners from Firebase
function loadWinners() {
  // Clear current list except for loading message
  while (winnersList.firstChild) {
    winnersList.removeChild(winnersList.firstChild);
  }
  
  // Add loading message
  const loadingItem = document.createElement('li');
  loadingItem.className = 'loading-winners';
  loadingItem.textContent = 'Loading champions...';
  winnersList.appendChild(loadingItem);
  
  // Get winners from Firebase, ordered by timestamp
  db.collection('chess-winners')
    .orderBy('timestamp', 'desc')
    .limit(10) // Show only the 10 most recent winners
    .get()
    .then((querySnapshot) => {
      // Remove loading message
      winnersList.removeChild(loadingItem);
      
      if (querySnapshot.empty) {
        const emptyItem = document.createElement('li');
        emptyItem.textContent = 'No champions yet. Be the first to defeat Alex!';
        winnersList.appendChild(emptyItem);
      } else {
        querySnapshot.forEach((doc) => {
          const winner = doc.data();
          const winnerItem = document.createElement('li');
          
          // Create name span
          const nameSpan = document.createElement('span');
          nameSpan.className = 'winner-name';
          nameSpan.textContent = winner.name;
          
          // Create date span
          const dateSpan = document.createElement('span');
          dateSpan.className = 'winner-date';
          
          // Format the timestamp
          if (winner.timestamp) {
            const date = winner.timestamp.toDate();
            dateSpan.textContent = date.toLocaleDateString();
          } else {
            dateSpan.textContent = 'Just now';
          }
          
          // Add to list item
          winnerItem.appendChild(nameSpan);
          winnerItem.appendChild(dateSpan);
          winnersList.appendChild(winnerItem);
        });
      }
    })
    .catch((error) => {
      console.error('Error getting winners: ', error);
      
      // Remove loading message
      winnersList.removeChild(loadingItem);
      
      // Show error message
      const errorItem = document.createElement('li');
      errorItem.textContent = 'Error loading champions. Please try again later.';
      winnersList.appendChild(errorItem);
    });
}

// Load winners when the page loads
document.addEventListener('DOMContentLoaded', () => {
  loadWinners();
});