// إعدادات قاعدة البيانات
const firebaseConfig = {
    apiKey: "AIzaSyBH0RiKvZVe1U32aOHssIJmrUmabdbLVHo",
    authDomain: "football-draft-17985.firebaseapp.com",
    projectId: "football-draft-17985",
    storageBucket: "football-draft-17985.firebasestorage.app",
    messagingSenderId: "47168812628",
    appId: "1:47168812628:web:13656c779c32ae3a7c1fc1",
    databaseURL: "https://football-draft-17985-default-rtdb.firebaseio.com"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentUserPhone = null; 
let currentUserName = null;
let selectedPlayerId = null;

function showLogin() {
    document.getElementById('landing-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
}

function backToLanding() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('draft-section').style.display = 'none';
    document.getElementById('admin-section').style.display = 'none';
    document.getElementById('landing-section').style.display = 'block';
    currentUserPhone = null;
}

function viewerMode() {
    currentUserPhone = 'viewer';
    document.getElementById('landing-section').style.display = 'none';
    document.getElementById('draft-section').style.display = 'block';
    listenToDraft();
}

function login() {
    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();

    if (!username || !password) return alert("برجاء إدخال الاسم والباسورد");

    if (password === 'admin') {
        currentUserPhone = 'admin';
        currentUserName = username;
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('admin-section').style.display = 'block';
        document.getElementById('draft-section').style.display = 'block';
        listenToDraft();
        return;
    }

    db.ref('captains').once('value').then((snapshot) => {
        let found = false;
        snapshot.forEach((child) => {
            if (child.val().phone === password && child.val().name === username) {
                currentUserPhone = child.key;
                currentUserName = child.val().name;
                found = true;
            }
        });

        if (found) {
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('draft-section').style.display = 'block';
            listenToDraft();
        } else {
            alert("بيانات الدخول غير صحيحة!");
        }
    });
}

function addCaptain() {
    const name = document.getElementById('captainName').value.trim();
    const phone = document.getElementById('captainPhone').value.trim();
    if (name && phone) {
        db.ref('captains').push({ name: name, phone: phone });
        document.getElementById('captainName').value = '';
        document.getElementById('captainPhone').value = '';
    }
}

function removeCaptain(captainId) {
    if(confirm("هل تريد بالتأكيد حذف هذا الكابتن؟")) {
        db.ref(`captains/${captainId}`).remove();
    }
}

function addPlayer() {
    const name = document.getElementById('playerName').value.trim();
    if (name) {
        db.ref('players').push({ name: name, isPicked: false });
        document.getElementById('playerName').value = '';
    }
}

function removePlayer(playerId) {
    if(confirm("هل تريد حذف هذا اللاعب نهائياً من التقسيمة؟")) {
        db.ref(`players/${playerId}`).remove();
    }
}

function resetDraft() {
    if(confirm("مسح كل البيانات الحالية والبدء من جديد؟")) {
        db.ref('players').remove();
        db.ref('teams').remove();
        db.ref('draftState').remove();
        db.ref('captains').remove();
        alert("تم تفريغ النظام بنجاح.");
    }
}

// تنفيذ الـ Snake Draft وتعيين الفرق بترتيب عشوائي 100%
// تنفيذ التقسيمة وتعيين الفرق بترتيب عشوائي وتطبيق خوارزمية الإزاحة (Shift Draft)
function startDraft() {
    db.ref('captains').once('value').then((snapshot) => {
        const captainsObj = snapshot.val();
        if (!captainsObj) return alert("قم بإضافة الكباتن أولاً!");

        let captainIds = Object.keys(captainsObj); 
        
        // 1. خوارزمية الترتيب العشوائي لتحديد (من هو الفريق 1، ومن 2، ومن 3)
        for (let i = captainIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [captainIds[i], captainIds[j]] = [captainIds[j], captainIds[i]];
        }

        // 2. تعيين مسميات الفرق بناءً على الترتيب العشوائي الجديد
        let teamAssignments = {};
        captainIds.forEach((id, index) => {
            teamAssignments[id] = `الفريق ${index + 1}`;
        });

        // 3. خوارزمية الاختيار والأدوار بالظبط زي ما طلبت
        let turnSequence = [];
        for (let round = 1; round <= 15; round++) { // 15 جولة اختيار مثلاً
            let roundOrder = [...captainIds];
            
            // تحديد مقدار الإزاحة بناءً على رقم الدورة
            let shiftAmount = (round - 1) % captainIds.length;
            
            // أخذ أول كابتن ووضعه في آخر الطابور بناءً على مقدار الإزاحة
            for (let i = 0; i < shiftAmount; i++) {
                roundOrder.push(roundOrder.shift());
            }
            
            // إضافة ترتيب هذه الجولة إلى التسلسل النهائي
            turnSequence.push(...roundOrder);
        }

        // 4. رفع الحالة الجديدة لقاعدة البيانات
        db.ref('draftState').set({
            sequence: turnSequence,
            currentIndex: 0,
            isActive: true,
            teamNames: teamAssignments 
        });
        
        alert("تم خلط الكباتن عشوائياً وتحديد أدوار الاختيار بنجاح!");
    });
}

function listenToDraft() {
    // 1. الاستماع لقائمة الكباتن لعرضها في الجدول للأدمن
    db.ref('captains').on('value', (snapshot) => {
        const adminCapUl = document.getElementById('admin-captains-list');
        if (adminCapUl) {
            adminCapUl.innerHTML = '';
            snapshot.forEach((child) => {
                const li = document.createElement('li');
                li.innerHTML = `<span>👨‍✈️ ${child.val().name}</span> 
                                <button class="delete-item-btn" onclick="removeCaptain('${child.key}')">❌ حذف</button>`;
                adminCapUl.appendChild(li);
            });
        }
    });

    // 2. تحديث قائمة اللاعبين
    db.ref('players').on('value', (snapshot) => {
        const ul = document.getElementById('available-players');
        const adminUl = document.getElementById('admin-players-list');
        ul.innerHTML = '';
        if(adminUl) adminUl.innerHTML = '';
        
        snapshot.forEach((child) => {
            const player = child.val();
            const playerId = child.key;
            if (!player.isPicked) {
                const li = document.createElement('li');
                li.innerText = player.name;
                li.onclick = () => selectPlayer(playerId, li);
                ul.appendChild(li);
            }
            if(adminUl) {
                const adminLi = document.createElement('li');
                adminLi.innerHTML = `<span>🏃 ${player.name}</span> 
                                     <button class="delete-item-btn" onclick="removePlayer('${playerId}')">❌ حذف</button>`;
                adminUl.appendChild(adminLi);
            }
        });
    });

   // === دالة تحديث واجهة الفرق (مع إضافة رقم الموبايل) ===
    function renderTeamsUI() {
        db.ref('captains').once('value').then(capSnapshot => {
            db.ref('draftState').once('value').then(stateSnap => {
                db.ref('teams').once('value').then(teamsSnapshot => {
                    const container = document.getElementById('teams-container');
                    if (!container) return;
                    container.innerHTML = '';
                    
                    const state = stateSnap.val();
                    if (!state || !state.isActive) return;

                    const captains = capSnapshot.val() || {};
                    const teams = teamsSnapshot.val() || {};
                    const assignments = state.teamNames || {};

                    // الترتيب بناءً على sequence اللي حددناه في خوارزمية الأدوار
                    state.sequence.forEach(id => {
                        // نتأكد إن الكابتن موجود في البيانات
                        if (!captains[id]) return;

                        let players = Object.values(teams[id] || {}).map(p => `<li>⚽ ${p.name}</li>`).join('');
                        
                        container.innerHTML += `
                            <div class="team-card">
                                <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 10px;">
                                    <h4 style="margin: 0; color: #2d3748;">${assignments[id] || "فريق"}: ${captains[id].name}</h4>
                                    <span style="font-size: 14px; color: #718096;">📞 ${captains[id].phone}</span>
                                </div>
                                <ul style="list-style: none; padding: 0;">${players || '<li style="color: #a0aec0; font-size: 13px;">بانتظار الاختيار..</li>'}</ul>
                            </div>`;
                    });
                });
            });
        });
    }

    // 3. تحديث مؤشر الأدوار
    db.ref('draftState').on('value', (snapshot) => {
        const state = snapshot.val();
        const turnIndicator = document.getElementById('turn-indicator');
        const submitBtn = document.getElementById('submit-pick');

        if (state && state.isActive) {
            const currentCaptainId = state.sequence[state.currentIndex];
            if(!currentCaptainId) {
                turnIndicator.innerText = "🎉 انتهت التقسيمة!";
                submitBtn.disabled = true;
            } else {
                db.ref(`captains/${currentCaptainId}`).once('value').then(capSnap => {
                    turnIndicator.innerText = `الآن دور الكابتن: ${capSnap.val()?.name || "..."}`;
                    submitBtn.disabled = (currentUserPhone !== currentCaptainId && currentUserPhone !== 'admin');
                });
            }
        } else {
            if(turnIndicator) turnIndicator.innerText = "في انتظار بدء التقسيمة...";
            if(submitBtn) submitBtn.disabled = true;
        }
        
        renderTeamsUI();
    });

    // 4. تحديث الجدول عند اختيار أي لاعب
    db.ref('teams').on('value', () => {
        renderTeamsUI();
    });
}

function selectPlayer(playerId, liElement) {
    if(currentUserPhone === 'viewer') return; 
    document.querySelectorAll('#available-players li').forEach(el => el.classList.remove('selected'));
    liElement.classList.add('selected');
    selectedPlayerId = playerId;
}

function submitSelection() {
    if (!selectedPlayerId) return alert("حدد لاعب!");
    db.ref('draftState').once('value').then((stateSnap) => {
        const state = stateSnap.val();
        const currentCaptainId = state.sequence[state.currentIndex];
        db.ref(`players/${selectedPlayerId}`).once('value').then((snapshot) => {
            db.ref(`teams/${currentCaptainId}`).push({ name: snapshot.val().name });
            db.ref(`players/${selectedPlayerId}`).update({ isPicked: true });
            db.ref('draftState/currentIndex').set(state.currentIndex + 1);
            selectedPlayerId = null;
        });
    });
}
