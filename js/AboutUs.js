import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD3CxCkvz81sYFiL02s_pXQegAIkrW2cWs",
  authDomain: "guidancemanagement.firebaseapp.com",
  projectId: "guidancemanagement",
  storageBucket: "guidancemanagement.firebasestorage.app",
  messagingSenderId: "687404674870",
  appId: "1:687404674870:web:1f43ce202a98298a66cd97"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ Render principal section
function renderPrincipal(principal) {
  const container = document.querySelector(".principal-section");
  if (!container || !principal) return;

  const photo = principal.attachments?.[0] || "../img/member.png";
  container.innerHTML = `
    <div style="display:flex; gap:16px; align-items:center; background:#fff7ed; padding:16px; border-radius:8px; margin-bottom:20px;">
      <img src="${photo}" alt="Principal" style="width:100px; height:100px; border-radius:50%; object-fit:cover;">
      <div>
        <h3 style="margin:0;">${principal.name || "Unnamed Principal"}</h3>
        <p style="margin:4px 0; font-size:14px; color:#555;">${principal.position || "Principal"}</p>
        <p style="margin:0; font-size:14px; color:#777;">${principal.email || ""}</p>
      </div>
    </div>
  `;
}

// ✅ Render faculty by department
function renderFacultyByDepartment(grouped) {
  const facultyGrid = document.querySelector(".faculty-grid");
  if (!facultyGrid) return;

  facultyGrid.innerHTML = "";

  const sortedDepartments = Object.keys(grouped).sort();

  sortedDepartments.forEach(dept => {
    const section = document.createElement("div");
    section.className = "department-section";
    section.innerHTML = `
      <h3 style="color:#b91c1c; margin-top:20px;">${dept}</h3>
      <div class="department-grid" style="display:flex; gap:16px; flex-wrap:wrap;"></div>
    `;

    const grid = section.querySelector(".department-grid");
    const sortedFaculty = grouped[dept].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );

    sortedFaculty.forEach(f => {
      const photo = f.attachments?.[0] || "../img/teacher.png";
      const card = `
        <div class="Faculty-Members" style="border:1px solid #eee; border-radius:8px; width:180px; overflow:hidden;">
          <div class="top-container">
            <img src="${photo}" alt="${f.name || "Faculty"}" style="width:100%; height:150px; object-fit:cover;">
          </div>
          <div class="bottom-container" style="padding:8px; text-align:center;">
            <h4 style="margin:4px 0;">${f.name || "Unnamed Faculty"}</h4>
            <p style="margin:0; font-size:14px; color:gray;">${f.department || "No Department"}</p>
          </div>
        </div>
      `;
      grid.insertAdjacentHTML("beforeend", card);
    });

    facultyGrid.appendChild(section);
  });
}

// ✅ Main loader
async function loadFacultyData() {
  const facultyGrid = document.querySelector(".faculty-grid");
  if (!facultyGrid) return;

  try {
    const snapshot = await getDocs(collection(db, "faculty"));
    if (snapshot.empty) {
      facultyGrid.innerHTML = `<p style="text-align:center; color:gray;">No faculty data found.</p>`;
      return;
    }

    const facultyList = snapshot.docs.map(doc => doc.data());

    // Extract principal
    const principal = facultyList.find(f => f.position === "Principal");
    renderPrincipal(principal);

    // Group by department
    const grouped = {};
    facultyList.forEach(f => {
      const dept = f.department || "No Department";
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push(f);
    });

    renderFacultyByDepartment(grouped);

  } catch (err) {
    console.error("Error fetching faculty:", err);
    facultyGrid.innerHTML = `<p style="color:red;">Error loading faculty data.</p>`;
  }
}

// ✅ Run after DOM loads
document.addEventListener("DOMContentLoaded", loadFacultyData);
