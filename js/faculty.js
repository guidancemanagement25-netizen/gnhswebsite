// faculty.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD3CxCkvz81sYFiL02s_pXQegAIkrW2cWs",
  authDomain: "guidancemanagement.firebaseapp.com",
  projectId: "guidancemanagement",
  storageBucket: "guidancemanagement.firebasestorage.app",
  messagingSenderId: "687404674870",
  appId: "1:687404674870:web:1f43ce202a98298a66cd97"
};

// Initialize Firebase + Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper: get department from URL
function getDepartmentFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("dept") || null; // e.g., "Math Department"
}

async function loadFaculty() {
  const facultyGrid = document.querySelector(".faculty-grid");
  facultyGrid.innerHTML = "";

  const department = getDepartmentFromURL();

  try {
    let snapshot;

    if (department) {
      // Query only for this department
      const q = query(collection(db, "faculty"), where("department", "==", department));
      snapshot = await getDocs(q);
    } else {
      // Get all faculty
      snapshot = await getDocs(collection(db, "faculty"));
    }

    if (snapshot.empty) {
      facultyGrid.innerHTML = `<p style="text-align:center; color:gray;">No faculty data found.</p>`;
      return;
    }

    // Sort by name
    const facultyList = snapshot.docs.map(doc => doc.data()).sort((a, b) => {
      return (a.name || "").localeCompare(b.name || "");
    });

    // Render cards
    facultyList.forEach(f => {
      const imgSrc = (Array.isArray(f.attachments) && f.attachments[0]) || "../img/teacher.png";

      const card = `
        <div class="Faculty-Members" style="border:1px solid #eee; border-radius:8px; width:180px; overflow:hidden;">
          <div class="top-container">
            <img src="${imgSrc}" alt="${f.name || "Faculty"}" style="width:100%; height:150px; object-fit:cover;">
          </div>
          <div class="bottom-container" style="padding:8px; text-align:center;">
            <h4 style="margin:4px 0;">${f.name || "Unnamed Faculty"}</h4>
            <p style="margin:0; font-size:14px; color:gray;">${f.department || "No Department"}</p>
          </div>
        </div>
      `;
      facultyGrid.insertAdjacentHTML("beforeend", card);
    });

  } catch (err) {
    console.error("Error fetching faculty:", err);
    facultyGrid.innerHTML = `<p style="color:red;">Error loading faculty data.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", loadFaculty);
