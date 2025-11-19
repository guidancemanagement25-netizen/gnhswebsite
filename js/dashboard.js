// dashboard.js
import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", function () {
  // -------------------------
  // DOM ELEMENTS
  // -------------------------
  const downloadBtn = document.getElementById("downloadBtn");
  const formOverlay = document.getElementById("formOverlay");
  const cancelBtn = document.getElementById("cancelBtn");
  const userForm = document.getElementById("userForm");

  // verification popup elements (token recovery)
  const openVerifyForm = document.getElementById("openVerifyForm"); // click here link
  const verifyOverlay = document.getElementById("verifyOverlay");
  const verifyForm = document.getElementById("verifyForm");
  // tolerate different casing of IDs
  const verifyLrnInput = document.getElementById("verifyLrn") || document.getElementById("verifyLRN") || document.getElementById("verifyLRN");
  const verifySurnameInput = document.getElementById("verifySurname") || document.getElementById("verifySurname");

  const lrnInput = document.getElementById("lrn");
  const surnameInput = document.getElementById("surname");
  const address = document.getElementById("address");
  const contact = document.getElementById("contact");
  const email = document.getElementById("email");
  const guardianName = document.getElementById("guardianName");
  const guardianContact = document.getElementById("guardianContact");
  const relationship = document.getElementById("relationship");
  const privacyConsent = document.getElementById("privacyConsent");

  // required fields inside main popup (these will be locked until LRN+Surname verified)
  const requiredFields = [
    "address",
    "contact",
    "email",
    "guardianName",
    "guardianContact",
    "relationship",
  ];

  // guard: ensure required DOM exists
  if (!userForm || !formOverlay || !lrnInput || !surnameInput) {
    console.error("One or more required DOM elements are missing. dashboard.js may not work correctly.");
  }

  // disable fields until verified
  const lockFields = (state) => {
    requiredFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = state;
    });
    if (privacyConsent) privacyConsent.disabled = state;
  };

  lockFields(true);

  // -------------------------
  // NORMALIZE TEXT
  // -------------------------
  const normalize = (str) =>
    (str || "")
      .toString()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "")
      .trim();

  // -------------------------
  // TOKEN GENERATOR
  // -------------------------
  const generateAppToken = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let t = "";
    for (let i = 0; i < 8; i++) t += chars[Math.floor(Math.random() * chars.length)];
    return t;
  };

  // -------------------------
  // AUTO VERIFY (LRN + SURNAME)
  // -------------------------
  const autoVerify = async () => {
    const lrn = (lrnInput?.value || "").trim();
    const srn = normalize(surnameInput?.value || "");

    if (lrn.length !== 12 || !/^\d{12}$/.test(lrn) || !srn) {
      // require 12-digit lrn and non-empty surname
      return;
    }

    try {
      const docRef = doc(db, "student_records", `student_${lrn}`);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        Swal.fire({ icon: "error", title: "Not Found", text: "No student record found." });
        lockFields(true);
        return;
      }

      const info = snap.data()?.student_info;
      if (!info) {
        Swal.fire({ icon: "error", title: "Invalid Record", text: "Missing student_info in the record." });
        lockFields(true);
        return;
      }

      const dbSurname = normalize(info.Surname || "");
      if (dbSurname === srn) {
        // Verified
        lrnInput.readOnly = true;
        surnameInput.readOnly = true;
        lockFields(false);
        Swal.fire({ icon: "success", title: "Verified", text: "Student verified successfully." });
      } else {
        lockFields(true);
        Swal.fire({ icon: "error", title: "Mismatch", text: "Surname does not match our records." });
      }
    } catch (err) {
      console.error("autoVerify error:", err);
      Swal.fire({ icon: "error", title: "Error", text: "Verification error occurred. See console." });
      lockFields(true);
    }
  };

  // Attach verify to blur events
  if (lrnInput) lrnInput.addEventListener("blur", autoVerify);
  if (surnameInput) surnameInput.addEventListener("blur", autoVerify);

  // LRN input must be numeric and max 12 chars
  if (lrnInput) lrnInput.addEventListener("input", () => {
    lrnInput.value = lrnInput.value.replace(/\D/g, "").slice(0, 12);
  });

  // -------------------------
  // OPEN/CLOSE MAIN FORM
  // -------------------------
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      if (formOverlay) formOverlay.style.display = "flex";
      lockFields(true);
      if (lrnInput) {
        lrnInput.readOnly = false;
        lrnInput.focus();
      }
      if (surnameInput) surnameInput.readOnly = false;
    });
  }
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (formOverlay) formOverlay.style.display = "none";
    });
  }

  // -------------------------
  // MAIN FORM SUBMIT (create download + update student_records)
  // -------------------------
  if (userForm) {
    userForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // require verification first
      if (!lrnInput.readOnly) {
        Swal.fire({ icon: "error", title: "Not Verified", text: "Please verify LRN and Surname first." });
        return;
      }

      if (!privacyConsent?.checked) {
        Swal.fire({ icon: "warning", title: "Consent Required", text: "Please accept the privacy consent." });
        return;
      }

      const fields = {
        lrn: (lrnInput?.value || "").trim(),
        surname: (surnameInput?.value || "").trim(),
        address: (address?.value || "").trim(),
        contact: (contact?.value || "").trim(),
        email: (email?.value || "").trim(),
        guardianName: (guardianName?.value || "").trim(),
        guardianContact: (guardianContact?.value || "").trim(),
        relationship: (relationship?.value || "").trim(),
        submittedAt: new Date().toISOString(),
      };

      // validate required
      for (const k in fields) {
        if (!fields[k]) {
          Swal.fire({ icon: "warning", title: "Missing Field", text: `${k} is required.` });
          return;
        }
      }

      // ensure LRN format
      if (!/^\d{12}$/.test(fields.lrn)) {
        Swal.fire({ icon: "error", title: "Invalid LRN", text: "LRN must be exactly 12 digits." });
        return;
      }

      const lrn = fields.lrn;
      const downloadRef = doc(db, "student_downloads", `student_${lrn}`);
      const studentRef = doc(db, "student_records", `student_${lrn}`);

      try {
        // check existing download record
        const existing = await getDoc(downloadRef);
        if (existing.exists()) {
          const existingToken = existing.data()?.token || existing.data()?.Token;
          Swal.fire({
            icon: "info",
            title: "Already Registered",
            html: `Your token:<br><b>${existingToken || "—"}</b>`,
            confirmButtonText: "Download Now",
          }).then(() => {
            // close & reset main form, start download
            if (formOverlay) formOverlay.style.display = "none";
            if (userForm) userForm.reset();
            window.location.href = "../APK/Guidance_Report.apk";
          });
          return;
        }

        // generate token
        const token = generateAppToken();

        // save to student_downloads
        await setDoc(downloadRef, {
          ...fields,
          token,
          createdAt: serverTimestamp(),
        });

        // update student_records.student_info fields and guardian_info object:
        // student_info: Address, ContactNumber, Email, Token
        // guardian_info: Name, ContactNumber, Relationship
        const studentInfoUpdate = {
          "student_info.Address": fields.address,
          "student_info.ContactNumber": fields.contact,
          "student_info.Email": fields.email,
          "student_info.Token": token,
        };

        const guardianInfo = {
          Name: fields.guardianName,
          ContactNumber: fields.guardianContact,
          Relationship: fields.relationship,
        };

        // Try updateDoc; if doc doesn't exist or nested map missing, fallback to setDoc with merge
        try {
          // update or create nested fields
          await updateDoc(studentRef, {
            ...studentInfoUpdate,
            "guardian_info": guardianInfo,
          });
        } catch (updErr) {
          // fallback: set merge
          await setDoc(
            studentRef,
            {
              student_info: {
                Address: fields.address,
                ContactNumber: fields.contact,
                Email: fields.email,
                Token: token,
              },
              guardian_info: guardianInfo,
            },
            { merge: true }
          );
        }

        // success - show token and prompt to download
        Swal.fire({
          icon: "success",
          title: "Success",
          html: `Your token:<br><b>${token}</b>`,
          confirmButtonText: "Download Now",
        }).then(() => {
          if (formOverlay) formOverlay.style.display = "none";
          if (userForm) userForm.reset();
          window.location.href = "../APK/Guidance_Report.apk";
        });
      } catch (err) {
        console.error("Submission error:", err);
        Swal.fire({ icon: "error", title: "Submission Failed", text: err.message || "See console." });
      }
    });
  }

  // -------------------------
// TOKEN RECOVERY / VERIFY POPUP
// -------------------------
if (openVerifyForm && verifyOverlay && verifyForm && verifyLrnInput && verifySurnameInput) {

  openVerifyForm.addEventListener("click", (ev) => {
    ev.preventDefault();
    verifyOverlay.style.display = "flex";
    verifyLrnInput.value = "";
    verifySurnameInput.value = "";
    verifyLrnInput.focus();
  });

  // -------------------------
  // FIX: CANCEL BUTTON
  // -------------------------
  const closeVerify = document.getElementById("closeVerify");
  if (closeVerify) {
    closeVerify.addEventListener("click", () => {
      verifyOverlay.style.display = "none";
    });
  }

  // close verify overlay when clicking background
  verifyOverlay.addEventListener("click", (e) => {
    if (e.target === verifyOverlay) verifyOverlay.style.display = "none";
  });

  // close with ESC key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && verifyOverlay.style.display === "flex") {
      verifyOverlay.style.display = "none";
    }
  });

  verifyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const lrn = (verifyLrnInput.value || "").trim();
    const srn = normalize(verifySurnameInput.value || "");

    if (!/^\d{12}$/.test(lrn) || !srn) {
      Swal.fire({
        icon: "error",
        title: "Invalid Input",
        text: "Please enter a 12-digit LRN and surname."
      });
      return;
    }

    try {
      // first check student_downloads
      const downloadDoc = await getDoc(doc(db, "student_downloads", `student_${lrn}`));

      if (downloadDoc.exists()) {

        // surname check for safety
        const studentDoc = await getDoc(doc(db, "student_records", `student_${lrn}`));
        const studentInfo = studentDoc.exists() ? studentDoc.data()?.student_info : null;
        const dbSurname = normalize(studentInfo?.Surname || "");

        if (dbSurname !== srn) {
          Swal.fire({
            icon: "error",
            title: "Mismatch",
            text: "Surname does not match our records."
          });
          return;
        }

        const token = downloadDoc.data()?.token || downloadDoc.data()?.Token;
        Swal.fire({
          icon: "info",
          title: "Your App Token",
          html: `<strong>${token || "No token available"}</strong>`,
          confirmButtonText: "Close",
        }).then(() => {
          verifyOverlay.style.display = "none";
        });

        return;
      }

      // fallback: check student_records
      const studentDoc = await getDoc(doc(db, "student_records", `student_${lrn}`));

      if (studentDoc.exists()) {
        const studentInfo = studentDoc.data()?.student_info;
        const dbSurname = normalize(studentInfo?.Surname || "");

        if (dbSurname !== srn) {
          Swal.fire({
            icon: "error",
            title: "Mismatch",
            text: "Surname does not match our records."
          });
          return;
        }

        const token = studentInfo?.Token;

        if (token) {
          Swal.fire({
            icon: "info",
            title: "Your App Token",
            html: `<strong>${token}</strong>`,
            confirmButtonText: "Close",
          }).then(() => verifyOverlay.style.display = "none");

          return;
        }

        Swal.fire({
          icon: "warning",
          title: "No Token Found",
          text: "No token was generated for this LRN."
        });

        return;
      }

      Swal.fire({
        icon: "error",
        title: "Not Found",
        text: "No records found for this LRN."
      });

    } catch (err) {
      console.error("verify error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Verification failed. See console."
      });
    }
  });

} else {
  console.warn("Verify overlay elements not found — token-recovery popup disabled.");
}

  // -------------------------
  // LOAD ANNOUNCEMENTS
  // -------------------------
  async function loadAnnouncements() {
    const container = document.getElementById("announcementsContainer");
    if (!container) return;

    try {
      const qRef = query(
        collection(db, "announcements"),
        where("status", "==", "Published"),
        orderBy("createdAt", "desc"),
        limit(3)
      );

      const snap = await getDocs(qRef);
      container.innerHTML = "";

      if (snap.empty) {
        container.innerHTML = "<p>No announcements.</p>";
        return;
      }

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const card = document.createElement("div");
        card.classList.add("announcement-card");

        const img = data.attachmentUrls?.[0] || "../img/default-announcement.png";
        const date = data.createdAt?.toDate?.() || new Date();

        card.innerHTML = `
          <img src="${img}" class="ann-img">
          <div class="info">
            <h4>${data.title}</h4>
            <p>${date.toDateString()}</p>
          </div>
        `;

        card.style.cursor = "pointer";
        card.addEventListener("click", () => {
          window.location.href = "../html/Announcement.html";
        });

        container.appendChild(card);
      });
    } catch (e) {
      console.error(e);
      container.innerHTML = "<p>Error loading announcements.</p>";
    }
  }

  loadAnnouncements();
}); // END DOMContentLoaded
