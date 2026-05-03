// ================= FIREBASE =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  increment,
  getDoc,
  setDoc, 
  onSnapshot,   // ✅ ADD THIS
  query,        // ✅ ADD THIS
  where,       // ✅ ADD THIS
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyADV5pyfU7MQsU0lzWCcyTCu0kDDVDtjdE",
  authDomain: "lynk-bffb7.firebaseapp.com",
  projectId: "lynk-bffb7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
// 🔥 ADD THIS FUNCTION
const trackVisitor = async () => {
  const today = new Date().toISOString().split("T")[0];

  const ref = doc(db, "analytics", today);

  await setDoc(ref, {
    count: increment(1)
  }, { merge: true });
};

// ================= STATE =================
let currentUser = null;
let allTrips = [];
let lastSeenNotif = 0; // 🔥 ADD THIS
// ================= DOM =================
const tripsEl = document.getElementById("trips");
const myTripsList = document.getElementById("myTripsList");
const trendingTrips = document.getElementById("trendingTrips");
const authEl = document.getElementById("authArea");

const modal = document.getElementById("modal");

const tripNameEl = document.getElementById("tripName");
const budgetEl = document.getElementById("budget");
const dateEl = document.getElementById("date");
const linkEl = document.getElementById("link");

// ================= AUTH =================
const login = async () => {
  const provider = new GoogleAuthProvider();
  const res = await signInWithPopup(auth, provider);
  currentUser = res.user;
  render();
};

const logout = async () => {

  const confirmLogout = confirm("Are you sure you want to logout?");
  if (!confirmLogout) return;

  await signOut(auth);
  currentUser = null;
  render();
};

// ================= CREATE =================
const createTrip = async () => {
  if (!currentUser) return alert("Login first");

  const tripName = tripNameEl.value;
  const budget = budgetEl.value;
  const date = dateEl.value;
  const link = linkEl.value;

  if (!tripName || !budget || !date || !link || !selectedImage) {
    return alert("Fill all fields + image");
  }

  const reader = new FileReader();

  reader.onloadend = async () => {
    const base64Image = reader.result;

    await addDoc(collection(db, "trips"), {
      tripName,
      budget,
      date,
      link,
      image: base64Image,
      userId: currentUser.uid,
      joins: 1,
      maxUsers: 4,
      joinedUsers: [currentUser.uid],
      createdAt: Date.now()
    });

    alert("Trip Created 🚀");
    document.getElementById("modal").classList.add("hidden");
    renderTrips();
  };

  reader.readAsDataURL(selectedImage);
};

// ================= LOAD =================
const renderTrips = async () => {
  const snap = await getDocs(collection(db, "trips"));
allTrips = [];

snap.forEach(d => {
  allTrips.push({ id: d.id, ...d.data() });
});

// 🔥 NEW FIRST (latest on top)
allTrips.sort((a, b) => b.createdAt - a.createdAt);

displayHome(allTrips);
displayTrending();
};

// ================= DISPLAY HOME =================
const displayHome = (trips) => {
  tripsEl.innerHTML = "";

  trips.forEach(t => {
    const joined = t.joinedUsers?.includes(currentUser?.uid);
    const spotsLeft = t.maxUsers - t.joins;
    const card = document.createElement("div");
    card.className = "card";

 card.innerHTML = `
  <img src="${t.image}" style="width:100%;height:300px;object-fit:cover;border-radius:10px;">

  <h3>${t.tripName}</h3>
  <p>₹${t.budget}</p>
  <p>📅 ${t.date}</p>
<p>
  👨 ${t.maleCount ?? (t.joinedUsers?.length || 1)} 
  | 
  👩 ${t.femaleCount ?? 0}
</p>


  <p style="color:${spotsLeft <= 1 ? 'red' : '#22c55e'}">
    ${spotsLeft} spots left
  </p>

  <button class="joinBtn" data-id="${t.id}" data-joined="${joined}">
    ${joined ? "Withdraw ❌" : "Join 🚀"}
  </button>

  <button class="shareBtn" data-id="${t.id}">
    Share 🔗
  </button>

  ${currentUser?.uid === t.userId 
    ? `<button class="deleteBtn" data-id="${t.id}">Delete</button>` 
    : ""}
`;

    tripsEl.appendChild(card);
  });
};

// ================= TRENDING =================
const displayTrending = () => {
  const sorted = [...allTrips].sort((a, b) => b.joins - a.joins);

  trendingTrips.innerHTML = "";

  sorted.slice(0, 5).forEach(t => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <img src="${t.image}" style="width:100%;height:300px;object-fit:cover;border-radius:10px;">
      <h4>${t.tripName} 🔥</h4>
      <p>${t.joins} joined</p>
    `;

    // ✅ CLICK EVENT
    
    const openTripDetails = async (id) => {
  if (!currentUser) return alert("Login first");

  const ref = doc(db, "trips", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const t = snap.data();

  const isJoined = t.joinedUsers?.includes(currentUser.uid);

  const action = confirm(
`Trip: ${t.tripName}
Budget: ₹${t.budget}
Date: ${t.date}
Joined: ${t.joins}

${isJoined ? "Do you want to WITHDRAW?" : "Do you want to JOIN?"}`
  );

  if (!action) return;

  // 🔥 trigger same button logic
  handleJoinWithdraw(id, isJoined);
};
div.addEventListener("click", () => {
  openTripDetails(t.id);
});
    trendingTrips.appendChild(div);
  });
};

// ================= MY TRIPS =================
console.log("Create clicked");
const createdBtn = document.getElementById("myCreated");
const joinedBtn = document.getElementById("myJoined");

// CREATED CLICK
createdBtn.onclick = () => {
  if (!currentUser) return alert("Login first");

  // 🔥 make Created blue
  createdBtn.classList.add("activeTabBtn");
  joinedBtn.classList.remove("activeTabBtn");

  const created = allTrips.filter(t => t.userId === currentUser.uid);
  displayMyTrips(created);
};

// JOINED CLICK
joinedBtn.onclick = () => {
  if (!currentUser) return alert("Login first");

  // 🔥 make Joined blue
  joinedBtn.classList.add("activeTabBtn");
  createdBtn.classList.remove("activeTabBtn");

  const joined = allTrips.filter(t =>
    t.joinedUsers?.includes(currentUser.uid) &&
    t.userId !== currentUser.uid
  );

  displayMyTrips(joined);
};

const displayMyTrips = (list) => {
  myTripsList.innerHTML = "";

  if (!list.length) {
    myTripsList.innerHTML = "<p>No trips 😢</p>";
    return;
  }

  list.forEach(t => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <h4>${t.tripName}</h4>
      <p>₹${t.budget}</p>
      <p>📅 ${t.date}</p>
      <p>${t.joins}/${t.maxUsers} joined</p>
    `;

    // ✅ CLICK ENABLE
    div.addEventListener("click", () => {
      openTripDetails(t.id); // 🔥 reuse same function
    });

    myTripsList.appendChild(div);
  });
};

// ================= AUTH UI =================
const renderAuth = () => {
  if (currentUser) {
    authEl.innerHTML = `
      <img src="${currentUser.photoURL}" style="width:30px;border-radius:50%">
      <button class="logout">Logout</button>
    `;
  } else {
    authEl.innerHTML = `<button class="login">Login</button>`;
  }
};
// ================= NOTIFICATIONS =================
const loadNotifications = () => {
  if (!currentUser) return;

  const q = query(
  collection(db, "notifications"),
  where("toUserId", "==", currentUser.uid)
);

  onSnapshot(q, (snap) => {
  const panel = document.getElementById("notifPanel");
  if (!panel) return;

  let list = [];
  let hasNew = false; // 🔥 ADD THIS

 snap.forEach(d => {
  const data = d.data();

  list.push({ id: d.id, ...data });

  // 🔴 CHECK NEW NOTIFICATION
  if (data.createdAt > lastSeenNotif) {
    hasNew = true;
  }
});
  // ✅ RED DOT LOGIC
  const notifDot = document.getElementById("notifDot");
  const profileDot = document.getElementById("profileDot");

  if (hasNew) {
    notifDot?.classList.remove("hidden");
    profileDot?.classList.remove("hidden");
  } else {
    notifDot?.classList.add("hidden");
    profileDot?.classList.add("hidden");
  }

  // 🔥 SORT: newest first
  list.sort((a, b) => b.createdAt - a.createdAt);

  panel.innerHTML = "";

  list.forEach((n, index) => {
    const div = document.createElement("div");

    div.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <div>
      <p>${n.message}</p>
      ${n.link ? `<a href="${n.link}" target="_blank">Join 🔗</a>` : ""}
    </div>

    ${
      index >= 5
        ? `<button class="deleteNotif" data-id="${n.id}">❌</button>`
        : `<small style="color:#aaa">🔒</small>`
    }
  </div>
`;

    panel.appendChild(div);
  });

  // 🔥 EMPTY STATE
  if (list.length === 0) {
    panel.innerHTML = "<p>No notifications 😴</p>";
  }
});
}

// ================= EVENTS =================
// ================= HELPER FUNCTION =================
const handleJoinWithdraw = async (id, isJoined) => {
  const ref = doc(db, "trips", id);
  const snap = await getDoc(ref);
  const trip = snap.data();

  const userRef = doc(db, "users", currentUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    alert("Complete profile first ⚠️");
    return;
  }

  const gender = userSnap.data().gender;

  if (isJoined) {
    // ❌ WITHDRAW
    await updateDoc(ref, {
      joins: increment(-1),
      maleCount: gender === "Male" ? increment(-1) : increment(0),
      femaleCount: gender === "Female" ? increment(-1) : increment(0),
      joinedUsers: trip.joinedUsers.filter(u => u !== currentUser.uid)
    });

  } else {
    // ✅ JOIN
    if (trip.joins >= trip.maxUsers) return alert("Full 🚫");

    const newUsers = [...(trip.joinedUsers || []), currentUser.uid];

    await updateDoc(ref, {
      joins: increment(1),
      maleCount: gender === "Male" ? increment(1) : increment(0),
      femaleCount: gender === "Female" ? increment(1) : increment(0),
      joinedUsers: newUsers
    });
  }

  renderTrips();
};
// ================= EMAIL FUNCTION =================
const sendEmail = (toEmail, tripName, link) => {

  emailjs.send("service_73205za", "template_mrxfwmr", {
    to_email: toEmail,
    trip: tripName,
    link: link
  })
  .then(() => {
    console.log("Email sent ✅");
  })
  .catch((err) => {
    console.log("Email error ❌", err);
  });

};
document.addEventListener("click", async (e) => {

  // SHARE
  if (e.target.classList.contains("shareBtn")) {
    const id = e.target.dataset.id;
    const link = `${window.location.origin}?trip=${id}`;
    window.open(`https://wa.me/?text=Join this trip: ${link}`);
    alert("Link copied 🔗");
  }

  if (e.target.classList.contains("login")) login();
  if (e.target.classList.contains("logout")) logout();

  if (e.target.closest("#openCreate")) {
    modal.classList.remove("hidden");
  }

  if (e.target.closest("#closeModal")) {
    modal.classList.add("hidden");
  }

  // JOIN / WITHDRAW
  if (e.target.classList.contains("joinBtn")) {
    if (!currentUser) return alert("Login first");

    const id = e.target.dataset.id;
    const isJoined = e.target.dataset.joined === "true";

    const ref = doc(db, "trips", id);
    const snap = await getDoc(ref);
    const trip = snap.data();

    // get current user gender
    const userRef = doc(db, "users", currentUser.uid);
const userSnap = await getDoc(userRef);

if (!userSnap.exists()) {
  alert("⚠️ Please complete profile first");
  return;
}

const gender = userSnap.data().gender;

if (!gender) {
  alert("⚠️ Gender missing in profile");
  return;
}

    if (isJoined) {
  // ❌ WITHDRAW
  await updateDoc(ref, {
    joins: increment(-1),
    maleCount: gender === "Male" ? increment(-1) : increment(0),
    femaleCount: gender === "Female" ? increment(-1) : increment(0),
    joinedUsers: trip.joinedUsers.filter(u => u !== currentUser.uid)
  });

} else {
  // ✅ JOIN
  if (trip.joins >= trip.maxUsers) return alert("Full 🚫");

  const newUsers = [...(trip.joinedUsers || []), currentUser.uid];

  await updateDoc(ref, {
    joins: increment(1),
    maleCount: gender === "Male" ? increment(1) : increment(0),
    femaleCount: gender === "Female" ? increment(1) : increment(0),
    joinedUsers: newUsers
  });

// 🔔 SEND NOTIFICATION + EMAIL
newUsers.forEach(async (uid) => {
  if (uid === currentUser.uid) return;

  // 📩 get user email from DB
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return;

  const userData = userSnap.data();
  const email = userData.email;

  // 🔔 FIRESTORE NOTIFICATION
  await addDoc(collection(db, "notifications"), {
    toUserId: uid,
    message: `${currentUser.displayName} joined ${trip.tripName} 🚀`,
    createdAt: Date.now()
  });

  // 📧 SEND EMAIL
  sendEmail(email, trip.tripName, trip.link);
});

  // 🎉 FULL TRIP
  if (newUsers.length === trip.maxUsers) {
    newUsers.forEach(async (uid) => {
      await addDoc(collection(db, "notifications"), {
        toUserId: uid,
        message: `🎉 Trip FULL: ${trip.tripName}`,
        link: trip.link,
        createdAt: Date.now()
      });
      
    });
  }
}

    renderTrips(); // 🔥 IMPORTANT
  }

  // DELETE
  if (e.target.classList.contains("deleteBtn")) {
    await deleteDoc(doc(db, "trips", e.target.dataset.id));
    renderTrips();
  }
    // 🔥 ADD THIS HERE (IMPORTANT)
  if (e.target.classList.contains("deleteNotif")) {
    const id = e.target.dataset.id;

    await deleteDoc(doc(db, "notifications", id));

    // remove from screen instantly
    e.target.parentElement.remove();
  }

});

// ================= INIT =================
onAuthStateChanged(auth, async user => {
  currentUser = user;
  render();
   trackVisitor();        // 🔥 ADD THIS
  loadVisitorCount();    // 🔥 ADD THIS
  if (user) {
     // 🔥 LOAD LAST SEEN
    lastSeenNotif = Number(localStorage.getItem("lastSeenNotif")) || 0;
  cleanOldNotifications();   // 🔥 ADD THIS
  loadNotifications();
  loadProfile();
}
});
// ✅ DEFAULT LOAD ARTICLES
setTimeout(() => {
  if (typeof loadArticles === "function") {
    loadArticles("places");
  }
}, 500);
// 🔥 ADD THIS FUNCTION
const loadVisitorCount = async () => {
  const today = new Date().toISOString().split("T")[0];

  const ref = doc(db, "analytics", today);
  const snap = await getDoc(ref);

  const el = document.getElementById("visitorCount");

  if (!el) return;

  if (snap.exists()) {
    el.innerText = "👀 Visitors Today: " + snap.data().count;
  } else {
    el.innerText = "👀 Visitors Today: 0";
  }
};
const render = () => {
  renderAuth();
  renderTrips();
};

const searchInput = document.getElementById("searchInput");

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const value = e.target.value.toLowerCase();

    const filtered = allTrips.filter(t =>
      t.tripName.toLowerCase().includes(value)
    );

    displayHome(filtered);
  });
}
const notifBox = document.querySelector(".notifBox");

if (notifBox) {
  notifBox.addEventListener("click", () => {

  const panel = document.getElementById("notifPanel");
  panel.classList.toggle("hidden");

  // 🔥 MARK AS SEEN
  lastSeenNotif = Date.now();
  localStorage.setItem("lastSeenNotif", lastSeenNotif);

  // 🔴 REMOVE DOT
  document.getElementById("notifDot")?.classList.add("hidden");
  document.getElementById("profileDot")?.classList.add("hidden");
});
}
document.querySelectorAll(".bottomNav button").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.screen;

    // 🔥 Active tab highlight
    document.querySelectorAll(".bottomNav button")
      .forEach(b => b.classList.remove("activeTab"));

    btn.classList.add("activeTab");

    // 🔥 Skip create button
    if (!target) return;

    // 🔥 Screen switching
    document.querySelectorAll(".screen").forEach(s => {
  s.classList.remove("active");
});

updateHeader(target);

if (target === "profileScreen") {
  loadProfile(); // ✅ correct place
}

    document.getElementById(target).classList.add("active");
    // 🔥 ADD THIS
loadVisitorCount();

    // 🔥 Optional: update title
    document.getElementById("pageTitle").innerText = btn.dataset.title || "Home";
  });
});
document.querySelector('.bottomNav button[data-screen="homeScreen"]').classList.add("activeTab");
// ===== OPEN & CLOSE MODAL =====

// ===== IMAGE PREVIEW =====
const imageFile = document.getElementById("imageFile");
const preview = document.getElementById("preview");

let selectedImage = null;

if (imageFile) {
  imageFile.addEventListener("change", () => {
    const file = imageFile.files[0];
    if (!file) return;

    selectedImage = file;
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
  });
}
// ===== FINAL CREATE BUTTON FIX =====
const createBtn = document.getElementById("createBtn");

if (createBtn) {
  createBtn.addEventListener("click", async () => {
    console.log("Create clicked"); // debug

    if (!currentUser) return alert("Login first");

    const tripName = tripNameEl.value;
    const budget = budgetEl.value;
    const date = dateEl.value;
    const link = linkEl.value;

    if (!tripName || !budget || !date || !link || !selectedImage) {
      return alert("Fill all fields + image");
    }

    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64Image = reader.result;

      // get current user gender
const userRef = doc(db, "users", currentUser.uid);
const userSnap = await getDoc(userRef);
if (!userSnap.exists()) {
  return alert("Complete profile first ⚠️");
}
const gender = userSnap.data()?.gender || "unknown";

await addDoc(collection(db, "trips"), {
  tripName,
  budget,
  date,
  link,
  image: base64Image,
  userId: currentUser.uid,

  joins: 1,
  joinedUsers: [currentUser.uid],

  // ✅ FORCE COUNT
  maleCount: gender === "Male" ? 1 : 0,
  femaleCount: gender === "Female" ? 1 : 0,

  maxUsers: 4,
  createdAt: Date.now()
});

      alert("Trip Created 🚀");

      modal.classList.add("hidden");
      renderTrips();
    };

    reader.readAsDataURL(selectedImage);
  });
}
// OPEN SHARED TRIP
const params = new URLSearchParams(window.location.search);
const tripId = params.get("trip");

if (tripId) {
  setTimeout(async () => {
    const ref = doc(db, "trips", tripId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      alert("Opened: " + snap.data().tripName);
    }
  }, 1000);
}
const openTripDetails = async (id) => {
  const ref = doc(db, "trips", id);
  const snap = await getDoc(ref);
  const t = snap.data();

  const isJoined = t.joinedUsers?.includes(currentUser.uid);

  const action = confirm(
    `${t.tripName}
₹${t.budget}
📅 ${t.date}

${isJoined ? "Withdraw?" : "Join?"}`
  );

  if (!action) return;

  handleJoinWithdraw(id, isJoined);
};

const updateHeader = (screen) => {
  const title = document.getElementById("pageTitle");
  const right = document.getElementById("rightHeader");

  // RESET
  right.innerHTML = `<div id="visitorCount"></div>`;

  if (screen === "homeScreen") {
  title.innerText = "Home";
  }

  if (screen === "myTripsScreen") {
    title.innerText = "My Trips";
  }

  if (screen === "trendingScreen") {
    title.innerText = "Trending 🔥";
  }

  if (screen === "profileScreen") {
    title.innerText = "Profile";
  }
};
window.addEventListener("scroll", () => {
  const hero = document.querySelector(".hero");

  if (!hero) return;

  if (window.scrollY > 50) {
    hero.classList.add("hero-small");
  } else {
    hero.classList.remove("hero-small");
  }
});
// ===== OPEN ARTICLES SCREEN =====
const exploreBtn = document.getElementById("exploreBtn");

if (exploreBtn) {
  exploreBtn.addEventListener("click", () => {
    document.querySelectorAll(".screen").forEach(s => {
      s.classList.remove("active");
    });

    document.getElementById("articlesScreen").classList.add("active");
    document.getElementById("pageTitle").innerText = "Explore";
  });
}
const articlesData = {
  places: [
    { 
      title: "Victoria Memorial", 
      img: "images/articles/victoria.jpg",
      desc: "A grand marble monument built in memory of Queen Victoria, surrounded by beautiful gardens."
    },
    { 
      title: "Prinsep Ghat", 
      img: "images/articles/ghat.jpg",
      desc: "A peaceful riverside spot along the Hooghly River, perfect for evening walks, sunset views, and relaxing under colonial-era architecture."
    },
    { 
      title: "Howrah Bridge", 
      img: "images/articles/howrah.jpg",
      desc: "One of the busiest cantilever bridges in the world connecting Kolkata and Howrah."
    },
    { 
      title: "Kalighat", 
      img: "images/articles/kalig.jpg",
      desc: "One of the oldest and most sacred temples in Kolkata, dedicated to Goddess Kali, attracting thousands of devotees every day."
    },
    { 
      title: "Dakshineswar temple", 
      img: "images/articles/dakshi.jpg",
      desc: "A famous temple dedicated to Goddess Kali, located on the banks of the Hooghly River, known for its spiritual vibe and historic connection to Ramakrishna Paramhansa."
    },
     { 
      title: "BAPS Swaminarayan Temple", 
      img: "images/articles/baps.jpg",
      desc: "A modern architectural marvel with intricate carvings and a serene environment, perfect for spiritual peace and cultural exploration."
    },
    { 
      title: "St. Paul's Cathedral", 
      img: "images/articles/st.jpg",
      desc: "A beautiful Gothic-style cathedral known for its stunning architecture, peaceful ambiance, and historical significance in Kolkata."
    }
  ],
  food: [
    { 
      title: "Kolkata Biryani", 
      img: "images/articles/biryani.jpg",
      desc: "Famous for its subtle spices and signature potato, a must-try delicacy."
    },
    { 
      title: "Puchka", 
      img: "images/articles/puchka.jpg",
      desc: "Kolkata’s version of pani puri, tangy, spicy and addictive."
    },
     { 
      title: "Rasgulla", 
      img: "images/articles/rasgulla.jpg",
      desc: "Soft and spongy cheese balls soaked in sugar syrup—simple, sweet, and a symbol of Bengali desserts."
    },
     { 
      title: "Mishti Doi", 
      img: "images/articles/dohi.jpg",
      desc: "Creamy fermented sweet yogurt with a rich caramel flavor, served chilled in traditional clay pots."
    },
     { 
      title: "Fish Fry", 
      img: "images/articles/fish.jpg",
      desc: "Crispy fried fish fillet coated in breadcrumbs, served with kasundi mustard sauce—perfect evening snack.."
    },
     { 
      title: "Luchi & Aloo Dum", 
      img: "images/articles/luchi.jpg",
      desc: "Soft, fluffy fried bread served with spicy potato curry—a classic Bengali breakfast combo."
    },
     { 
      title: "Shorshe Ilish", 
      img: "images/articles/ilish.jpg",
      desc: "Hilsa fish cooked in mustard gravy—rich, traditional, and deeply rooted in Bengali cuisine."
    }
  ],
  culture: [
    { 
      title: "Durga Puja", 
      img: "images/articles/durga.jpg",
      desc: "The biggest festival of Kolkata celebrated with grand pandals and devotion."
    },
    { 
      title: "Tram Life", 
      img: "images/articles/tram.jpg",
      desc: "Experience the old-world charm of Kolkata through its iconic tram rides."
    },
    { 
      title: "Kumartuli (Idol Making)", 
      img: "images/articles/kumartuli.jpg",
      desc: "A historic artisan hub where craftsmen create beautiful idols for festivals like Durga Puja—perfect to witness traditional artistry."
    },
    { 
      title: "Bengali Theatre (Natok)", 
      img: "images/articles/natok.jpg",
      desc: "A rich tradition of stage plays showcasing powerful storytelling, literature, and social themes in Bengali culture."
    },
    { 
      title: "College Street (Book Market)", 
      img: "images/articles/book.jpg",
      desc: "Asia’s largest second-hand book market, famous for its endless rows of books and intellectual heritage."
    },
    { 
      title: "Rabindra Sangeet", 
      img: "images/articles/sangeet.jpg",
      desc: "Soulful songs written by Rabindranath Tagore, deeply connected to Bengali emotions, art, and culture."
    },
    { 
      title: "Street Art & Murals", 
      img: "images/articles/art.jpg",
      desc: "Colorful murals and street art across Kolkata that showcase creativity, social messages, and modern culture."
    }
  ]
};
const articlesList = document.getElementById("articlesList");

function loadArticles(type) {
  articlesList.innerHTML = "";

  articlesData[type].forEach(a => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
  <div class="articleCard">
    <img src="${a.img}" class="articleImg" style="width:40%;height:200px;object-fit:cover;border-radius:10px;">
    
    <div class="articleContent">
      <h4>${a.title}</h4>
      <p>${a.desc}</p>
    </div>
  </div>
`;

    articlesList.appendChild(div);
  });
}
// 🔥 FIXED TAB CLICK (works even after screen switch)
document.addEventListener("click", (e) => {
  if (e.target.closest(".articlesTabs button")) {

    const btn = e.target.closest(".articlesTabs button");

    // remove active from all
    document.querySelectorAll(".articlesTabs button")
      .forEach(b => b.classList.remove("activeArticle"));

    // add active to clicked
    btn.classList.add("activeArticle");

    // load data
    loadArticles(btn.dataset.type);
  }
});
// 📸 POST WITH LYNK BUTTON
const postBtn = document.getElementById("postNowBtn");

if (postBtn) {
  postBtn.addEventListener("click", () => {
    window.open("https://www.instagram.com/joinlynk", "_blank");
  });
}
const row = document.querySelector(".placesRow");

if (row) {
  let scrollAmount = 0;

  setInterval(() => {
    scrollAmount += 180; // move one card

    if (scrollAmount >= row.scrollWidth - row.clientWidth) {
      scrollAmount = 0; // loop back
    }

    row.scrollTo({
      left: scrollAmount,
      behavior: "smooth"
    });
  }, 2500); // speed (lower = faster)
}
const steps = document.querySelectorAll("#lynkSteps .step");
let currentStep = 0;

function highlightStep(index) {
  steps.forEach(step => step.classList.remove("active"));
  steps[index].classList.add("active");
}

setInterval(() => {
  currentStep = (currentStep + 1) % steps.length;
  highlightStep(currentStep);
}, 2000);
steps.forEach((step, index) => {
  step.addEventListener("click", () => {
    currentStep = index;
    highlightStep(currentStep);
  });
});
// ===== PROFILE SYSTEM =====

const profileBox = document.getElementById("profileBox");
const profileForm = document.getElementById("profileForm");

const nameInput = document.getElementById("nameInput");
const ageInput = document.getElementById("ageInput");
const genderInput = document.getElementById("genderInput");

const avatars = [
  "avatar.1.png.png","avatar.2.png.png","avatar.3.png.png","avatar.4.png.png",
  "avatar.5.png.jpeg","avatar.6.png.jpeg","avatar.7.png.jpeg","avatar.8.png.jpeg"
];

let selectedAvatar = "";

// Load avatars
const avatarGrid = document.getElementById("avatarGrid");

if (avatarGrid) {
  avatarGrid.innerHTML = "";

  avatars.forEach(src => {
    const img = document.createElement("img");
    img.src = "images/" + src;

    img.onerror = () => {
      img.src = "https://via.placeholder.com/70"; // fallback if image missing
    };

    img.classList.add("avatar");

    img.onclick = () => {
      document.querySelectorAll(".avatar")
        .forEach(a => a.classList.remove("selected"));

      img.classList.add("selected");
      selectedAvatar = src;
    };

    avatarGrid.appendChild(img);
  });
}

// Load Profile
async function loadProfile() {
  if (!currentUser) return;

  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);

  // ❌ No profile → show form
  if (!snap.exists()) {
    profileBox.innerHTML = "";
    profileForm.classList.remove("hidden");
    return;
  }

  // ✅ Profile exists → show data
  const data = snap.data();

  profileForm.classList.add("hidden");

  profileBox.innerHTML = `
    <img src="images/${data.avatar}" class="profilePic">
    <h3>${data.name}</h3>
    <p>Age: ${data.age}</p>
    <p>${data.gender}</p>
    <p>${data.email}</p>

    <button id="editBtn">Edit Profile</button>
  `;

  document.getElementById("editBtn").onclick = () => {
    nameInput.value = data.name;
    ageInput.value = data.age;
    genderInput.value = data.gender;
    selectedAvatar = data.avatar;

    profileForm.classList.remove("hidden");
  };
}

// Save Profile
document.getElementById("saveProfile").onclick = async () => {

  if (!currentUser) return alert("Login first");

  if (!nameInput.value || !ageInput.value || !genderInput.value || !selectedAvatar) {
    return alert("Fill all fields");
  }

  await setDoc(doc(db, "users", currentUser.uid), {
    name: nameInput.value,
    age: ageInput.value,
    gender: genderInput.value,
    avatar: selectedAvatar,
    email: currentUser.email
  });

  alert("Saved ✅");
  loadProfile();
};
document.querySelectorAll(".filterBar button").forEach(btn => {
  btn.addEventListener("click", () => {

    document.querySelectorAll(".filterBar button")
      .forEach(b => b.classList.remove("activeFilter"));

    btn.classList.add("activeFilter");

    let sorted = [...allTrips];

    const type = btn.dataset.sort;

    if (type === "latest") {
      sorted.sort((a, b) => b.createdAt - a.createdAt);
    }

    if (type === "date") {
      sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    if (type === "budget") {
      sorted.sort((a, b) => Number(a.budget) - Number(b.budget));
    }

    if (type === "trending") {
      sorted.sort((a, b) => b.joins - a.joins);
    }

    displayHome(sorted);
  });
});
const cleanOldNotifications = async () => {
  const snap = await getDocs(collection(db, "notifications"));

  const now = Date.now();
  const limit = 14 * 24 * 60 * 60 * 1000;

  snap.forEach(async (d) => {
    if (now - d.data().createdAt > limit) {
      await deleteDoc(doc(db, "notifications", d.id));
    }
  });
};