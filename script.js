// Network status handling
function handleNetworkStatus() {
    window.addEventListener('online', () => {
        document.body.style.opacity = '1';
        alert('Internet connection established. Please restart the application.');
    });

    window.addEventListener('offline', () => {
        document.body.style.opacity = '0.8';
        alert('Internet connection is interrupted.');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    handleNetworkStatus();
    
    // Setup menu button functionality
    const menuBtn = document.getElementById('menu-btn');
    menuBtn.addEventListener('click', function() {
        const menu = document.getElementById('settings-panel');
        menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
    });
    
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            console.log("Logged in:", user.displayName);
            loadNotes(); // Kullanıcı giriş yaptıysa notları yükle
        } else {
            console.log("There are no users logged in.");
            const notesList = document.getElementById("notesList");
            if (notesList) {
                notesList.innerHTML = "<p></p>";
            }
        }
    });
});

// 📌 Google ile giriş yap
function googleLogin() {
    let provider = new firebase.auth.GoogleAuthProvider();

    firebase.auth().signInWithPopup(provider)
        .then(result => {
            let user = result.user;
            console.log("Login successful:", user.displayName);
            alert("Welcome, " + user.displayName);
        })
        .catch(error => {
            console.error("Login Error: ", error);
        });
}


// 📌 Not ekleme fonksiyonu
function addNote() {
    let noteContent = document.getElementById("noteInput").value;
    let user = firebase.auth().currentUser;

    if (user && noteContent.trim() !== "") {
        firebase.firestore().collection("notlar").add({
            uid: user.uid,
            content: noteContent,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            console.log("Note saved!");
            closeNotePanel();
        }).catch(error => {
            console.error("Error saving notes:", error);
            // Still close panel in offline mode
            if (!navigator.onLine) {
                closeNotePanel();
            }
        });
    } else {
        alert("You must be logged in to add a note!");
    }
}

function closeNotePanel() {
    document.getElementById("noteInput").value = "";
    let noteContainer = document.getElementById("noteContainer");
    noteContainer.classList.remove("show");
}

// 📌 Notları yükleme fonksiyonu (Gerçek Zamanlı)
function loadNotes(order = "desc") {
    let user = firebase.auth().currentUser;
    let notesList = document.getElementById("notesList");

    if (!user) {
        console.log("There are no users logged in.");
        return;
    }

    if (!navigator.onLine) {
        const cachedNotes = getNotesFromLocalStorage();
        displayNotes(cachedNotes, order);
        return;
    }

//delete note confirmation
let deleteNoteId = null;

function confirmDelete(noteId) {
  deleteNoteId = noteId;
  document.getElementById("deleteModal").style.display = "block";
}

document.getElementById("confirmDelete").addEventListener("click", function () {
  if (deleteNoteId) {
    firebase.firestore().collection("notlar").doc(deleteNoteId).delete().then(() => {
      console.log("The note was deleted.");
      document.getElementById("deleteModal").style.display = "none";
      deleteNoteId = null;
      loadNotes(); // Sayfayı güncelle
    });
  }
});

document.getElementById("cancelDelete").addEventListener("click", function () {
  document.getElementById("deleteModal").style.display = "none";
  deleteNoteId = null;
});

document.getElementById("cancelDelete").addEventListener("click", function () {
  document.getElementById("deleteModal").style.display = "none";
  deleteNoteId = null;
});

    // Update visual indication of sorting
    document.querySelectorAll('.filter-option').forEach(option => {
        option.classList.remove('active');
    });
    document.getElementById(order === "desc" ? "sort-newest" : "sort-oldest").classList.add('active');

    firebase.firestore().collection("notlar")
        .where("uid", "==", user.uid)
        .orderBy("timestamp", order)
        .onSnapshot(snapshot => {
            notesList.innerHTML = "";
            const emptyState = document.getElementById("emptyState");

            if (snapshot.empty) {
                emptyState.style.display = "block";
                return;
            }
            emptyState.style.display = "none";

            snapshot.docs.forEach(doc => {
                let note = doc.data();
                let noteItem = document.createElement("div");
                noteItem.classList.add("note-container");

                let formattedDate = note.timestamp ? new Date(note.timestamp.toDate()).toLocaleString() : "No date";
                const displayContent = note.content.replace(/\n/g, '<br>');

                noteItem.innerHTML = `
                    <div class="note-header">
                        <small>${formattedDate}</small>
                        <button class="three-dot-menu">⋮</button>
                        <div class="note-menu">
                            <div class="menu-item" onclick="editNote('${doc.id}')">Edit</div>
    <div class="menu-item" onclick="confirmDelete('${doc.id}')">Delete</div>
                        </div>
                    </div>
                    <p>${displayContent}</p>
                `;
                notesList.appendChild(noteItem);
            });
        });
}

// Note delete confirmation
function confirmDelete(noteId) {
    const deleteModal = document.getElementById('deleteModal');
    deleteModal.style.display = 'block';

    document.getElementById('confirmDelete').onclick = function() {
        deleteNote(noteId);
        deleteModal.style.display = 'none';
    };

    document.getElementById('cancelDelete').onclick = function() {
        deleteModal.style.display = 'none';
    };
}

// Note delete Function
function deleteNote(noteId) {
    firebase.firestore().collection("notlar").doc(noteId).delete()
        .then(() => {
            console.log("Note deleted!");
        })
        .catch(error => {
            console.error("Error deleting notes:", error);
        });
}


//edit note
let currentNoteId = null;

function editNote(noteId, currentContent) {
    // Get the note content directly from Firestore to avoid escaping issues
    firebase.firestore().collection("notlar").doc(noteId).get()
        .then(doc => {
            if (doc.exists) {
                const noteData = doc.data();
                document.getElementById("editNoteContainer").style.display = "block";
                document.getElementById("editNoteInput").value = noteData.content || '';
                currentNoteId = noteId;
            }
        })
        .catch(error => {
            console.error("Not getirme hatası:", error);
        });
}

function saveEdit() {
    let newContent = document.getElementById("editNoteInput").value;
    if (newContent.trim() !== "") {
        // Normalize line breaks before saving
        newContent = newContent.replace(/\r\n/g, '\n').trim();

        firebase.firestore().collection("notlar").doc(currentNoteId).update({
            content: newContent,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            console.log("note updated");
            loadNotes();
            cancelEdit();
        }).catch(error => {
            console.error("Note update error: ", error);
        });
    }
}

function cancelEdit() {
    document.getElementById("editNoteContainer").style.display = "none";
}
function toggleNoteInput() {
    let noteContainer = document.getElementById("noteContainer");
    noteContainer.classList.toggle("show");
}
//+ button iptal zone
function cancelNote() {
    let noteContainer = document.getElementById("noteContainer");
    noteContainer.classList.remove("show");
    document.getElementById("noteInput").value = "";
}

// Authentication state observer
firebase.auth().onAuthStateChanged(user => {
    // Normalize the current path by removing .html and leading/trailing slashes
    const currentPath = window.location.pathname
        .replace(/\.html$/, '')
        .replace(/^\/+|\/+$/g, '')
        || 'index'; // Default to 'index' if path is empty

    // Define auth pages without .html extension
    const authPages = ['login', 'register', 'reset', 'verify'];
    const isAuthPage = authPages.includes(currentPath);

    if (user) {
        // User is signed in
        if (!user.emailVerified) {
            // If email not verified
            if (currentPath !== 'verify' && !isAuthPage) {
                // Redirect to verify page if not already there and not on auth pages
                firebase.auth().signOut();
                window.location.replace("verify.html");
                return;
            }
        } else {
            // Email is verified
            if (isAuthPage) {
                // Redirect to index if trying to access auth pages
                window.location.replace("index.html");
                return;
            }
        }
    } else {
        // No user is signed in
        if (!isAuthPage) {
            // Redirect to login if trying to access protected pages
            window.location.replace("login.html");
            return;
        }
    }
});

// Logout function from edited snippet
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "login.html";
    }).catch((error) => {
        console.error("Logout error:", error);
    });
}

// Note container toggle function from edited snippet
function toggleNoteInput() {
    let noteContainer = document.getElementById("noteContainer");
    noteContainer.classList.toggle("show");
}

function cancelNote() {
    let noteContainer = document.getElementById("noteContainer");
    noteContainer.classList.remove("show");
    document.getElementById("noteInput").value = "";
}

// Add click-outside listeners for both note containers
document.addEventListener('DOMContentLoaded', () => {
    const noteContainer = document.getElementById("noteContainer");
    const editNoteContainer = document.getElementById("editNoteContainer");

    // Click outside for add note
    document.addEventListener("click", function(e) {
        if (noteContainer.classList.contains("show") && 
            !noteContainer.contains(e.target) && 
            e.target.id !== "addNoteButton") {
            cancelNote();
        }
    });

    // Click outside for edit note
    document.addEventListener("click", function(e) {
        if (editNoteContainer.style.display === "block" && 
            !editNoteContainer.contains(e.target) && 
            !e.target.closest('button[onclick^="editNote"]')) {
            cancelEdit();
        }
    });
    // Settings panel toggle functionality is handled by the menu button click
    document.getElementById('logout-button').addEventListener('click', function() {
        firebase.auth().signOut().then(() => {
            console.log("Successfully logged out!");
            window.location.href = "login.html";
        }).catch((error) => {
            console.error("An error occurred while logging out:", error);
        });
    });
});

//logout text button
document.addEventListener('DOMContentLoaded', () => {
    const logoutText = document.getElementById("logout-text");
    if (logoutText) {
        logoutText.addEventListener("click", function() {
            firebase.auth().signOut().then(() => {
                alert("Başarıyla çıkış yapıldı!");
                window.location.href = "login.html";
            }).catch((error) => {
                console.error("An error occurred while logging out:", error);
            });
        });
    }
});

//search 🔍 
document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById("searchButton");
    const searchBox = document.getElementById("searchBox");
    const searchInput = document.getElementById("searchInput");

    if (searchButton && searchBox) {
        searchButton.addEventListener("click", function(e) {
            e.stopPropagation();
            searchBox.style.display = "block";
            setTimeout(() => {
                searchBox.classList.add("active");
                searchInput.focus();
            }, 10);
        });

        const closeSearch = document.getElementById("closeSearch");
        closeSearch.addEventListener("click", function() {
            searchBox.classList.remove("active");
            setTimeout(() => {
                searchBox.style.display = "none";
                searchInput.value = "";
            }, 300);
        });

        // Handle clicks outside search box
        document.addEventListener("click", function(e) {
            if (!searchBox.contains(e.target) && !searchButton.contains(e.target)) {
                searchBox.classList.remove("active");
                setTimeout(() => {
                    searchBox.style.display = "none";
                    searchInput.value = "";
                }, 300);
            }
        });
    }
});

//Note search functionality
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("keyup", function() {
            const searchText = this.value.toLowerCase();
            const notes = document.querySelectorAll(".note-container");

            notes.forEach(note => {
                const noteText = note.textContent.toLowerCase();
                note.style.display = noteText.includes(searchText) ? "block" : "none";
            });
        });
    }
});



function saveNotesToLocalStorage(notes) {
    localStorage.setItem('cachedNotes', JSON.stringify(notes));
    localStorage.setItem('lastSync', new Date().toISOString());
}

function getNotesFromLocalStorage() {
    const notes = localStorage.getItem('cachedNotes');
    return notes ? JSON.parse(notes) : [];
}


function toggleFilterMenu() {
    const filterMenu = document.querySelector('.filter-menu');
    filterMenu.classList.toggle('show');
}

document.addEventListener('DOMContentLoaded', () => {
    const filterBtn = document.getElementById("filter-btn");
    const filterMenu = document.querySelector('.filter-menu');

    filterBtn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleFilterMenu();
    });

    // Close filter menu when clicking outside
    document.addEventListener("click", function(e) {
        if (filterMenu.classList.contains('show') && 
            !filterMenu.contains(e.target) && 
            !filterBtn.contains(e.target)) {
            filterMenu.classList.remove('show');
        }
    });

    // Prevent menu from closing when clicking inside
    filterMenu.addEventListener("click", function(e) {
        e.stopPropagation();
    });

    document.getElementById('sort-newest').addEventListener('click', () => {
        loadNotes('desc');
        toggleFilterMenu();
    });

    document.getElementById('sort-oldest').addEventListener('click', () => {
        loadNotes('asc');
        toggleFilterMenu();
    });
});

// Handle three-dot menu clicks
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('three-dot-menu')) {
        e.stopPropagation();
        // Close all other menus
        document.querySelectorAll('.note-menu.show').forEach(menu => {
            if (menu !== e.target.nextElementSibling) {
                menu.classList.remove('show');
            }
        });
        // Toggle current menu
        const menu = e.target.nextElementSibling;
        menu.classList.toggle('show');
    } else if (!e.target.closest('.note-menu')) {
        // Close all menus when clicking outside
        document.querySelectorAll('.note-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
    }
});

// Settings Panel Functionality
let settingsPanelVisible = false; // Added state variable

function toggleSettingsPanel() {
    const settingsPanel = document.getElementsByClassName('settings-panel');
    settingsPanelVisible = !settingsPanelVisible;
    settingsPanel.style.display = settingsPanelVisible ? 'flex' : 'none';
}


document.getElementById('settings-link').addEventListener('click', toggleSettingsPanel);

document.getElementById('close-settings').addEventListener('click', toggleSettingsPanel);

// Theme Toggle
document.getElementById('theme-toggle').addEventListener('change', function() {
    document.body.classList.toggle('dark-mode');
    // You can add more dark mode styles as needed
});

// Password Change Redirect
document.getElementById('change-password').addEventListener('click', () => {
    window.location.href = 'change-password.html';
});

// Delete Account
document.getElementById('delete-account').addEventListener('click', function() {
    document.getElementById('confirm-modal').style.display = 'block';
});

document.getElementById('confirm-delete').addEventListener('click', function() {
    const user = firebase.auth().currentUser;
    if (user) {
        user.delete().then(() => {
            alert('Your account has been successfully deleted.');
            firebase.auth().signOut().then(() => {
                window.location.href = 'login.html';
            });
        }).catch((error) => {
            if (error.code === 'auth/requires-recent-login') {
                alert('For security reasons, you must log in again to delete your account.');
                firebase.auth().signOut().then(() => {
                    window.location.href = 'login.html';
                });
            } else {
                alert('Account deletion error: ' + error.message);
            }
        });
    }
    document.getElementById('confirm-modal').style.display = 'none';
});

document.getElementById('cancel-delete').addEventListener('click', function() {
    document.getElementById('confirm-modal').style.display = 'none';
});

// Close modals when clicking outside
window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
    if (e.target.classList.contains('settings-panel')) {
        e.target.style.display = 'none';
    }
});

// Load notes by default when page loads
window.addEventListener("load", () => {
    loadNotes();
});


// password renew
function changePassword() {
    const user = firebase.auth().currentUser;
    const currentPassword = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-password").value;
    const email = user.email;

    if (!currentPassword || !newPassword) {
        alert("Lütfen tüm alanları doldurun.");
        return;
    }

    const credential = firebase.auth.EmailAuthProvider.credential(email, currentPassword);

    user.reauthenticateWithCredential(credential)
        .then(() => {
            return user.updatePassword(newPassword);
        })
        .then(() => {
            alert("Password updated successfully.");
            document.getElementById("password-change-container").classList.add("hidden");
        })
        .catch((error) => {
            console.error("Password change error:", error);
            alert("Password change failed: " + error.message);
        });
}
document.getElementById("change-password").addEventListener("click", () => {
    window.location.href = "change-password.html";
});

function closePasswordChange() {
    const container = document.getElementById("password-change-container");
    container.classList.remove("show");
    container.classList.add("hidden");
    // Clear inputs
    document.getElementById("current-password").value = "";
    document.getElementById("new-password").value = "";
}

// Close when clicking outside the content
document.getElementById("password-change-container").addEventListener("click", (e) => {
    if (e.target.id === "password-change-container") {
        closePasswordChange();
    }
});