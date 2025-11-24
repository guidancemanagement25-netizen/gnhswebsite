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


  const EMAILJS_SERVICE_ID = "service_9ebxmbm";
  const EMAILJS_TEMPLATE_ID = "template_tjth6zm";

 
  const downloadBtn = document.getElementById("downloadBtn");
  const formOverlay = document.getElementById("formOverlay");
  const cancelBtn = document.getElementById("cancelBtn");
  const userForm = document.getElementById("userForm");

  
  const openVerifyForm = document.getElementById("openVerifyForm");
  const verifyOverlay = document.getElementById("verifyOverlay");
  const verifyForm = document.getElementById("verifyForm");
  const verifyLrnInput = document.getElementById("verifyLrn") || document.getElementById("verifyLRN");
  const verifySurnameInput = document.getElementById("verifySurname");

  const lrnInput = document.getElementById("lrn");
  const surnameInput = document.getElementById("surname");
  const address = document.getElementById("address");
  const contact = document.getElementById("contact");
  const email = document.getElementById("email");
  const guardianName = document.getElementById("guardianName");
  const guardianContact = document.getElementById("guardianContact");
  const relationship = document.getElementById("relationship");
  const privacyConsent = document.getElementById("privacyConsent");

  const requiredFields = [
    "address",
    "contact",
    "email",
    "guardianName",
    "guardianContact",
    "relationship",
  ];

  const lockFields = (state) => {
    requiredFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = state;
    });
    if (privacyConsent) privacyConsent.disabled = state;
  };
  lockFields(true);
  const normalize = (str) =>
    (str || "")
      .toString()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "")
      .trim();

  const generateAppToken = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let t = "";
    for (let i = 0; i < 8; i++) t += chars[Math.floor(Math.random() * chars.length)];
    return t;
  };

  /* ============================================================
      OPTION A — MANUAL SWAL VALIDATION (ADDED HERE)
  ============================================================ */
  function validateInputsBeforeVerify() {
    const lrn = lrnInput.value.trim();
    const srn = surnameInput.value.trim();

    if (!lrn || !srn) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "LRN and Surname are required before verification.",
      });
      return false;
    }

    if (!/^\d{12}$/.test(lrn)) {
      Swal.fire({
        icon: "error",
        title: "Invalid LRN",
        text: "LRN must be exactly 12 digits.",
      });
      return false;
    }

    return true;
  }
  /* ============================================================
      AUTO VERIFY (LRN + SURNAME) — same logic as original
  ============================================================ */
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

  /* ============================================================
      BIND BLUR EVENTS — run manual validation (Option A) BEFORE autoVerify
  ============================================================ */
  if (lrnInput) {
    lrnInput.addEventListener("blur", async () => {
      if (validateInputsBeforeVerify()) {
        await autoVerify();
      }
    });
  }

  if (surnameInput) {
    surnameInput.addEventListener("blur", async () => {
      if (validateInputsBeforeVerify()) {
        await autoVerify();
      }
    });
  }

  /* ============================================================
      LRN input must be numeric and max 12 chars (unchanged)
  ============================================================ */
  if (lrnInput) lrnInput.addEventListener("input", () => {
    lrnInput.value = lrnInput.value.replace(/\D/g, "").slice(0, 12);
  });

  /* ============================================================
      OPEN/CLOSE MAIN FORM (unchanged)
  ============================================================ */
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

  /* ============================================================
      EMAIL: send token via EmailJS (kept as your original)
  ============================================================ */
  // Note: emailjs must be loaded in HTML before this script (see snippet above).
  async function sendTokenEmailJS(toEmail, toName, tokenToSend) {
    // ensure emailjs is loaded and the args are present
    if (typeof emailjs === "undefined") {
      console.error("EmailJS is not loaded. Make sure you have included the EmailJS script and emailjs.init(publicKey) before dashboard.js in your HTML.");
      throw new Error("EmailJS not loaded. Add the EmailJS script in your HTML before dashboard.js.");
    }
    if (!toEmail) {
      console.error("sendTokenEmailJS called without recipient email:", toEmail, toName, tokenToSend);
      throw new Error("Recipient email is required to send token.");
    }

    const templateParams = {
      email: toEmail,           // IMPORTANT: named 'email' because template's 'To Email' field should be {{email}}
      to_name: toName || "",
      token: tokenToSend || "",
      time: new Date().toLocaleString(),
      from_name: "GNHS Guidance Office"
    };

    try {
      const res = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
      // EmailJS returns a response object — log for debugging
      console.log("EmailJS send success:", res);
      return res;
    } catch (err) {
      console.error("EmailJS send failed:", err);
      // rethrow so callers can handle/retry if necessary
      throw err;
    }
  }

  /* ============================================================
      MAIN FORM SUBMIT (kept intact)
  ============================================================ */
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

      // ensure email looks reasonable
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
        Swal.fire({ icon: "warning", title: "Invalid Email", text: "Please enter a valid email address." });
        return;
      }

      // ensure LRN format
      if (!/^\d{12}$/.test(fields.lrn)) {
        Swal.fire({ icon: "error", title: "Invalid LRN", text: "LRN must be exactly 12 digits." });
        return;
      }

      const lrn = fields.lrn;
      const downloadRef = doc(db, "student_downloads", `student_${lrn}`);
      const studentRef = doc(db, "student_records", `student_${lrn}`);
      const tokenDocRef = doc(db, "tokens", `student_${lrn}`);

      try {
        // check existing download record
        const existing = await getDoc(downloadRef);
        if (existing.exists()) {
          // existing token - do NOT show it on screen; email it instead
          const existingToken = existing.data()?.token || existing.data()?.Token || null;

          try {
            await sendTokenEmailJS(fields.email, fields.surname, existingToken);
            Swal.fire({
              icon: "info",
              title: "Already Registered",
              text: `A copy of your token has been sent to ${fields.email}.`,
            }).then(() => {
              if (formOverlay) formOverlay.style.display = "none";
              if (userForm) userForm.reset();
              window.location.href = "../APK/Guidance_Report.apk";
            });
          } catch (mailErr) {
            console.error("Email send error (existing):", mailErr);
            Swal.fire({
              icon: "warning",
              title: "Email Failed",
              text: "You are already registered. We could not send the token by email — please contact the guidance office.",
            });
          }

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

        // also save token to tokens/{student_<lrn>} for the OTP flow
        await setDoc(tokenDocRef, {
          token,
          email: fields.email,
          createdAt: serverTimestamp(),
        });

        // update student_records.student_info fields and guardian_info object:
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
            guardian_info: guardianInfo,
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

        // -------------------------
        // SEND EMAIL (token emailed only via EmailJS)
        // -------------------------
        try {
          await sendTokenEmailJS(fields.email, fields.surname, token);
        } catch (mailErr) {
          console.error("Email send error (new):", mailErr);
          // notify user that registration succeeded but email failed
          Swal.fire({
            icon: "warning",
            title: "Email Failed",
            text: "Registration completed, but we could not send the token by email. Please contact the guidance office.",
          }).then(() => {
            if (formOverlay) formOverlay.style.display = "none";
            if (userForm) userForm.reset();
            window.location.href = "../APK/Guidance_Report.apk";
          });
          return;
        }

        // -------------------------
        // SHOW PROMPT FOR OTP ENTRY (token still hidden)
        // -------------------------
        const { value: userToken } = await Swal.fire({
          title: "Check your email",
          text: "A verification token has been sent to your email. Please enter it below to continue.",
          input: "text",
          inputLabel: "Enter token",
          inputPlaceholder: "Enter the token you received by email",
          showCancelButton: true,
          inputValidator: (value) => {
            if (!value) return "Please enter the token.";
            if (!/^[A-Z0-9]{8}$/.test(value) && !/^\d{6}$/.test(value)) {
              // allow either your 8-char token or 6-digit OTP variants
              return "Token format invalid.";
            }
            return null;
          },
        });

        if (!userToken) {
          // user cancelled or closed dialog
          Swal.fire({
            icon: "info",
            title: "Verification Required",
            text: "You must enter the token sent to your email to download the app.",
          });
          return;
        }

        // verify token against Firestore tokens/{student_<lrn>}
        const tokenSnap = await getDoc(tokenDocRef);
        if (!tokenSnap.exists()) {
          Swal.fire({
            icon: "error",
            title: "Verification Failed",
            text: "No token found on server. Contact guidance office.",
          });
          return;
        }

        const serverToken = tokenSnap.data()?.token;
        if (serverToken !== userToken) {
          Swal.fire({
            icon: "error",
            title: "Invalid Token",
            text: "The token you entered is incorrect. Please try again or request a new token.",
          });
          return;
        }

        // token correct -> proceed to download
        Swal.fire({
          icon: "success",
          title: "Verified",
          text: "Token verified. Preparing your download...",
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
  // TOKEN RECOVERY / VERIFY POPUP (unchanged logic)
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
        // first check tokens collection
        const tokenSnap = await getDoc(doc(db, "tokens", `student_${lrn}`));
        const token = tokenSnap.exists() ? tokenSnap.data()?.token : null;

        // find an email to send to: prefer tokens doc email, else the student's record email
        let studentEmail = tokenSnap.exists() ? tokenSnap.data()?.email : null;

        if (!studentEmail) {
          const studentDoc = await getDoc(doc(db, "student_records", `student_${lrn}`));
          const studentInfo = studentDoc.exists() ? studentDoc.data()?.student_info : null;
          studentEmail = studentInfo?.Email || studentInfo?.email || null;
          const dbSurname = normalize(studentInfo?.Surname || "");
          if (dbSurname !== srn) {
            Swal.fire({
              icon: "error",
              title: "Mismatch",
              text: "Surname does not match our records"
            });
            return;
          }
        }

        if (!token) {
          Swal.fire({
            icon: "warning",
            title: "No Token Found",
            text: "No token was generated for this LRN."
          });
          return;
        }

        if (!studentEmail) {
          Swal.fire({
            icon: "warning",
            title: "No Email On Record",
            text: "We cannot email your token because there is no email on record. Please contact the guidance office."
          });
          return;
        }

        // send token via EmailJS
        try {
          await sendTokenEmailJS(studentEmail, srn, token);
          Swal.fire({
            icon: "info",
            title: "Token Sent",
            text: `A copy of your token has been emailed to ${studentEmail}.`,
          }).then(() => {
            verifyOverlay.style.display = "none";
          });
        } catch (mailErr) {
          console.error("Email send error (recovery):", mailErr);
          Swal.fire({
            icon: "error",
            title: "Email Failed",
            text: "We found your token but could not send it by email. Please contact the guidance office."
          });
        }
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
  // LOAD ANNOUNCEMENTS (unchanged)
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
