import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const downloadBtn = document.getElementById("downloadBtn");
  const formOverlay = document.getElementById("formOverlay");
  const cancelBtn = document.getElementById("cancelBtn");
  const userForm = document.getElementById("userForm");
  const gradeSelect = document.getElementById("grade");
  const sectionInput = document.getElementById("section");
  const lrnInput = document.getElementById("lrn");

  if (!downloadBtn || !formOverlay || !cancelBtn || !userForm) return;

  // LRN numeric restriction
  lrnInput.addEventListener("input", () => {
    lrnInput.value = lrnInput.value.replace(/\D/g, "").slice(0, 12);
  });

  const generateAppToken = () => Math.random().toString(36).substring(2, 10).toUpperCase();

  // Toggle form overlay
  downloadBtn.addEventListener("click", () => formOverlay.style.display = "flex");
  cancelBtn.addEventListener("click", () => formOverlay.style.display = "none");

  // Form submission
  userForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = {
      lrn: lrnInput.value.trim(),
      surname: document.getElementById("surname").value.trim(),
      firstname: document.getElementById("firstname").value.trim(),
      middlename: document.getElementById("middlename").value.trim(),
      birthday: document.getElementById("birthday").value,
      age: document.getElementById("age").value,
      grade: gradeSelect.value,
      section: sectionInput.value.trim(),
      address: document.getElementById("address").value.trim(),
      contact: document.getElementById("contact").value.trim(),
      email: document.getElementById("email").value.trim(),
      guardianName: document.getElementById("guardianName").value.trim(),
      guardianContact: document.getElementById("guardianContact").value.trim(),
      relationship: document.getElementById("relationship").value.trim(),
      timestamp: new Date().toISOString(),
    };

    // Validate all fields
    for (const key in formData) {
      if (!formData[key]) {
        Swal.fire({
          icon: "warning",
          title: "Incomplete Form",
          text: `Please fill out the ${key.replace(/([A-Z])/g, " $1")}.`,
        });
        return;
      }
    }

    // Validate LRN
    if (!/^\d{12}$/.test(formData.lrn)) {
      Swal.fire({ icon: "error", title: "Invalid LRN", text: "LRN must be exactly 12 digits." });
      return;
    }

    // Validate email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(formData.email)) {
      Swal.fire({ icon: "error", title: "Invalid Email", text: "Please enter a valid email address." });
      return;
    }

    try {
      const existingRef = doc(db, "student_downloads", `student_${formData.lrn}`);
      const existingSnap = await getDoc(existingRef);

      if (existingSnap.exists()) {
        const existingData = existingSnap.data();
        Swal.fire({
          icon: "info",
          title: "Already Registered",
          html: `This LRN has already submitted a form.<br><br>
                 <strong>Your App Token:</strong> <code>${existingData.token}</code>`,
        }).then(() => {
          formOverlay.style.display = "none";
          window.location.href = "../APK/Guidance_Report.apk";
        });
        return;
      }

      const appToken = generateAppToken();
      await setDoc(existingRef, { ...formData, token: appToken, createdAt: serverTimestamp() });

      Swal.fire({
        icon: "success",
        title: "Form Submitted!",
        html: `Your App Token is:<br><strong>${appToken}</strong><br><br>Your download will start shortly.`,
        confirmButtonText: "Download Now",
      }).then(() => {
        formOverlay.style.display = "none";
        window.location.href = "../APK/Guidance_Report.apk";
      });
    } catch (error) {
      console.error("Firestore Error:", error);
      Swal.fire({ icon: "error", title: "Submission Failed", text: "An error occurred. Please try again." });
    }
  });

  // Load 3 recent announcements
async function loadRecentAnnouncements(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const q = query(
      collection(db, "announcements"),
      where("status", "==", "Published"),
      orderBy("createdAt", "desc"),
      limit(3)
    );

    const snapshot = await getDocs(q);
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = `<p class="no-data">No announcements available.</p>`;
      return;
    }

   snapshot.forEach((doc) => {
  const data = doc.data();

  const card = document.createElement("div");
  card.classList.add("announcement-card");

  let dateString = "";
  if (data.date) {
    const dateObj = new Date(data.date);
    dateString = dateObj.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } else if (data.createdAt?.toDate) {
    dateString = data.createdAt.toDate().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  const imageUrl = data.attachmentUrls?.[0] || "../img/default-announcement.png";

  card.innerHTML = `
    <img src="${imageUrl}" alt="${data.title}">
    <div class="info">
      <h4>${data.title}</h4>
      <p>${dateString}</p>
    </div>
  `;
  container.appendChild(card);
});

  } catch (err) {
    console.error("Error fetching announcements:", err);
    container.innerHTML = `<p class="error">Failed to load announcements.</p>`;
  }
}


  loadRecentAnnouncements("announcementsContainer");
});
