import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD3CxCkvz81sYFiL02s_pXQegAIkrW2cWs",
  authDomain: "guidancemanagement.firebaseapp.com",
  projectId: "guidancemanagement",
  storageBucket: "guidancemanagement.appspot.com",
  messagingSenderId: "687404674870",
  appId: "1:687404674870:web:1f43ce202a98298a66cd97"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Helper to get proper image
async function getFacultyImage(faculty) {
  try {
    if (!faculty.attachments || faculty.attachments.length === 0) {
      return "../img/teacher.png";
    }

    let firstAttachment = faculty.attachments[0];

    // Normalize: unwrap object like { url: "..." }
    if (typeof firstAttachment === "object" && firstAttachment.url) {
      firstAttachment = firstAttachment.url;
    }

    // Blob URL
    if (typeof firstAttachment === "string" && firstAttachment.startsWith("blob:")) {
      return firstAttachment;
    }

    // Full online URL (Cloudinary, Firebase public URL, etc.)
    if (typeof firstAttachment === "string" && firstAttachment.startsWith("http")) {
      return firstAttachment;
    }

    // Firebase Storage path
    if (typeof firstAttachment === "string") {
      const storageRef = ref(storage, firstAttachment);
      return await getDownloadURL(storageRef);
    }

    return "../img/teacher.png";
  } catch (err) {
    console.warn("Image fetch failed, using fallback:", err);
    return "../img/teacher.png";
  }
}

// Load faculty data
async function loadFacultyData() {
  try {
    const querySnapshot = await getDocs(collection(db, "faculty"));
    const facultyList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    await renderPage(facultyList);
  } catch (error) {
    console.error("Error loading faculty:", error);
  }
}

// Render page
async function renderPage(facultyList) {
  const deptHeader = document.querySelector(".Faculty-Header h1");
  const deptHeadBox = document.querySelector(".Dept-Head");
  const facultyGrid = document.querySelector(".faculty-grid");

  if (!deptHeader || !deptHeadBox || !facultyGrid) return;

  const departmentName = deptHeader.textContent.replace("DEPARTMENT", "").trim().toUpperCase();
  const deptMembers = facultyList.filter(f => f.department.toUpperCase() === departmentName);

  // Head and other faculty
  const head = deptMembers.find(f => f.position === "Department Head");
  const others = deptMembers.filter(f => f.position !== "Department Head");

  // Render department head
  if (head) {
    const headImage = await getFacultyImage(head);
    deptHeadBox.innerHTML = `
      <div class="top">
        <img src="${headImage}" alt="${head.name}">
      </div>
      <div class="bottom">
        <h3>${head.name}</h3>
        <p>Department Head</p>
      </div>
    `;
  }

  // Render faculty members in parallel
  const facultyHtml = await Promise.all(others.map(async f => {
    const photo = await getFacultyImage(f);
    return `
      <div class="Faculty-Members">
        <div class="top-container">
          <img src="${photo}" alt="${f.name}">
        </div>
        <div class="bottom-container">
          <h4>${f.name}</h4>
        </div>
      </div>
    `;
  }));

  facultyGrid.innerHTML = facultyHtml.join("");
}

// Init
document.addEventListener("DOMContentLoaded", loadFacultyData);