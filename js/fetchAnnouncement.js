import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD3CxCkvz81sYFiL02s_pXQegAIkrW2cWs",
  authDomain: "guidancemanagement.firebaseapp.com",
  projectId: "guidancemanagement",
  storageBucket: "guidancemanagement.firebasestorage.app",
  messagingSenderId: "687404674870",
  appId: "1:687404674870:web:1f43ce202a98298a66cd97",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Fetch and display announcements
export async function fetchAnnouncements(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = `<p class="no-data">No announcements available yet.</p>`;
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status !== "Published") return;

      const box = document.createElement("div");
      box.classList.add("announcement-box");

      const dateText = data.date
        ? new Date(data.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "No date";

      const image = data.attachmentUrls?.[0] || "../img/default-announcement.png";

      box.innerHTML = `
        <div class="info">
          <h2>${data.title || "Untitled Announcement"}</h2>
          <p class="date">${dateText}</p>
          <p class="summary">${(data.summary || "Click to view details.").slice(0, 80)}...</p>
        </div>
      `;

      box.addEventListener("click", () => {
        // Remove any existing modal
        const existingModal = document.querySelector(".announcement-modal");
        if (existingModal) existingModal.remove();

        const details = `
          <h3>${data.title || "Untitled Announcement"}</h3>
          <p><b>📅 Date:</b> ${dateText}</p>
          <p><b>🕒 Time:</b> ${data.time || "Not specified"}</p>
          <p><b>📍 Location:</b> ${data.location || "Not specified"}</p>
          <p><b>👥 Audience:</b> ${data.audience || "Not specified"}</p>
          <p><b>🏷 Category:</b> ${data.category || "Not specified"}</p>
          <p><b>📝 Summary:</b><br>${data.summary || "No summary provided."}</p>
          ${
            data.attachmentUrls?.length
              ? data.attachmentUrls
                  .map((url) => `<img src="${url}" style="max-width:100%; margin-top:10px;" />`)
                  .join("")
              : ""
          }
        `;

        const modal = document.createElement("div");
        modal.className = "announcement-modal";
        modal.innerHTML = `
          <div class="modal-content">
            <span class="close-btn">&times;</span>
            ${details}
          </div>
        `;
        document.body.appendChild(modal);

        // Close modal and restore scroll
        const closeBtn = modal.querySelector(".close-btn");
        closeBtn.addEventListener("click", () => {
          modal.remove();
        });
      });

      container.appendChild(box);
    });
  } catch (error) {
    console.error("Error loading announcements:", error);
    container.innerHTML = `
      <div class="error-box">
        ❌ Failed to load announcements. Please try again later.
      </div>`;
  }
}
