// 🔥 Firebase Authentication ile giriş kontrolü
// Auth State Observer
document.addEventListener('DOMContentLoaded', () => {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            console.log("Giriş yapan:", user.displayName);
            loadNotes(); // Kullanıcı giriş yaptıysa notları yükle
        } else {
            console.log("Giriş yapan kullanıcı yok.");
            const notesList = document.getElementById("notesList");
            if (notesList) {
                notesList.innerHTML = "<p>Lütfen giriş yapın.</p>";
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
            console.log("Giriş başarılı:", user.displayName);
            alert("Hoş geldin, " + user.displayName);
        })
        .catch(error => {
            console.error("Giriş hatası:", error);
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
            archived: false
        }).then(() => {
            console.log("Not kaydedildi!");
            document.getElementById("noteInput").value = "";
            let noteContainer = document.getElementById("noteContainer");
            noteContainer.classList.remove("show");
        }).catch(error => {
            console.error("Not kaydetme hatası:", error);
        });
    } else {
        alert("Not eklemek için giriş yapmalısınız!");
    }
}

// 📌 Notları yükleme fonksiyonu (Gerçek Zamanlı)
function loadNotes() {
    let user = firebase.auth().currentUser;
    let notesList = document.getElementById("notesList");

    if (!user) {
        console.log("Giriş yapmış kullanıcı yok.");
        return;
    }

    firebase.firestore().collection("notlar")
        .where("uid", "==", user.uid)
        .orderBy("timestamp", "desc")
        .onSnapshot(snapshot => {  
            notesList.innerHTML = ""; // Eski notları temizle

            if (snapshot.empty) {
                return;
            }

            snapshot.docs.forEach(doc => {
                let note = doc.data();
                let noteItem = document.createElement("div");
                noteItem.classList.add("note-container");

                let formattedDate = note.timestamp ? new Date(note.timestamp.toDate()).toLocaleString() : "Tarih yok";

                // Convert line breaks to <br> tags for display
                const displayContent = note.content.replace(/\n/g, '<br>');
                noteItem.innerHTML = `
<small>${formattedDate}</small>
   <p>${displayContent}</p>
                    <button onclick="deleteNote('${doc.id}')"style= background-color:red ;>Sil</button>
                    <button onclick="editNote('${doc.id}')">Düzenle</button>

                `;
                notesList.appendChild(noteItem);
            });
        });
}

// 📌 Not silme fonksiyonu
function deleteNote(noteId) {
    firebase.firestore().collection("notlar").doc(noteId).delete()
        .then(() => {
            console.log("Not silindi!");
        })
        .catch(error => {
            console.error("Not silme hatası:", error);
        });
}


//edit note
let currentNoteId = null; // Düzenlenecek notun ID'si

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
            console.log("Not güncellendi!");
            loadNotes();
            cancelEdit();
        }).catch(error => {
            console.error("Not güncelleme hatası:", error);
        });
    }
}

function cancelEdit() {
    // Düzenleme alanını gizle
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
    const menuBtn = document.getElementById("menu-btn");
    const menu = document.getElementById("menu");
    
    menuBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        menu.classList.add("show");
    });

    // Close menu when clicking outside
    document.addEventListener("click", function(e) {
        if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
            menu.classList.remove("show");
        }
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
                console.error("Çıkış yapılırken hata oluştu:", error);
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



function loadNotes(order = "desc") {
    let user = firebase.auth().currentUser;
    let notesList = document.getElementById("notesList");

    if (!user) {
        console.log("Giriş yapmış kullanıcı yok.");
        return;
    }

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

                let formattedDate = note.timestamp ? new Date(note.timestamp.toDate()).toLocaleString() : "Tarih yok";
                const displayContent = note.content.replace(/\n/g, '<br>');
                
                noteItem.innerHTML = `
                    <div class="note-header">
                        <small>${formattedDate}</small>
                        <button class="three-dot-menu">⋮</button>
 <div class="note-menu">
<div class="menu-item" onclick="editNote('${doc.id}')">Düzenle</div>
<div class="menu-item" onclick="archiveNote('${doc.id}')">Arşive Taşı</div>
 <div class="menu-item" onclick="deleteNote('${doc.id}')">Sil</div>
 
                        </div>
                    </div>
                    <p>${displayContent}</p>
                `;
                notesList.appendChild(noteItem);
            });
        });
}

document.addEventListener('DOMContentLoaded', () => {
    // Filter menu toggle
    const filterBtn = document.getElementById("filter-btn");
    const filterMenu = document.getElementById("filter-menu");
    
    filterBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        filterMenu.style.display = filterMenu.style.display === "block" ? "none" : "block";
    });

    // Close filter menu when clicking outside
    document.addEventListener("click", function(e) {
        if (!filterMenu.contains(e.target) && !filterBtn.contains(e.target)) {
            filterMenu.style.display = "none";
        }
    });

    // Sort options click handlers
    document.getElementById("sort-newest").addEventListener("click", function() {
        loadNotes("desc");
        filterMenu.style.display = "none";
    });

    document.getElementById("sort-oldest").addEventListener("click", function() {
        loadNotes("asc");
        filterMenu.style.display = "none";
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
document.getElementById('settings-link').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('settings-panel').style.display = 'flex';
    document.getElementById('menu').classList.remove('show');
});

document.getElementById('close-settings').addEventListener('click', function() {
    document.getElementById('settings-panel').style.display = 'none';
});

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
    // Add actual delete account logic here
    alert('Hesap silme özelliği yakında eklenecek!');
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

// Sayfa yüklendiğinde varsayılan olarak notları yükle
window.addEventListener("load", () => {
    loadNotes();
});

document.getElementById("filter-btn").addEventListener("click", function () {
    let filterMenu = document.getElementById("filter-menu");

    if (filterMenu.classList.contains("hidden")) {
        filterMenu.classList.remove("hidden");
        filterMenu.classList.add("show");
    } else {
        filterMenu.classList.remove("show");
        filterMenu.classList.add("hidden");
    }
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
            alert("Şifre başarıyla güncellendi.");
            document.getElementById("password-change-container").classList.add("hidden");
        })
        .catch((error) => {
            console.error("Şifre değiştirme hatası:", error);
            alert("Şifre değiştirilemedi: " + error.message);
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
//archive
// Archive note function
function archiveNote(noteId) {
    let user = firebase.auth().currentUser;
    if (user) {
        firebase.firestore().collection("notlar").doc(noteId).update({
            archived: true
        }).then(() => {
            console.log("Not arşive taşındı.");
            loadNotes();
        }).catch(error => {
            console.error("Arşivleme hatası:", error);
        });
    }
}

// Show archived notes
function showArchivedNotes() {
    let user = firebase.auth().currentUser;
    let notesList = document.getElementById("notesList");

    if (!user) {
        console.log("Giriş yapmış kullanıcı yok.");
        return;
    }

    firebase.firestore().collection("notlar")
        .where("uid", "==", user.uid)
        .where("archived", "==", true)
        .orderBy("timestamp", "desc")
        .get()
        .then(snapshot => {
            notesList.innerHTML = "";
            
            if (snapshot.empty) {
                notesList.innerHTML = "<p>Arşivlenmiş not bulunamadı.</p>";
                return;
            }

            snapshot.forEach(doc => {
                let note = doc.data();
                let noteItem = document.createElement("div");
                noteItem.classList.add("note-container");

                let formattedDate = note.timestamp ? new Date(note.timestamp.toDate()).toLocaleString() : "Tarih yok";
                const displayContent = note.content.replace(/\n/g, '<br>');
                
                noteItem.innerHTML = `
                    <div class="note-header">
                        <small>${formattedDate}</small>
                        <button class="three-dot-menu">⋮</button>
                        <div class="note-menu">
                            <div class="menu-item" onclick="unarchiveNote('${doc.id}')">Arşivden Çıkar</div>
                            <div class="menu-item" onclick="deleteNote('${doc.id}')">Sil</div>
                        </div>
                    </div>
                    <p>${displayContent}</p>
                `;
                notesList.appendChild(noteItem);
            });
        });
}

// Unarchive note function
function unarchiveNote(noteId) {
    let user = firebase.auth().currentUser;
    if (user) {
        firebase.firestore().collection("notlar").doc(noteId).update({
            archived: false
        }).then(() => {
            console.log("Not arşivden çıkarıldı.");
            showArchivedNotes();
        }).catch(error => {
            console.error("Arşivden çıkarma hatası:", error);
        });
    }
}