// Await the Firebase modules to be loaded by the HTML file
window.addEventListener('load', async () => {
    // Check for global Firebase objects exposed by the HTML script
    if (!window.firebase) {
        console.error("Firebase SDK not loaded. Please ensure the <script type='module'> block is present and correct in index.html.");
        return;
    }

    const {
        initializeApp,
        getAuth,
        signInAnonymously,
        signInWithCustomToken,
        onAuthStateChanged,
        getFirestore,
        collection,
        addDoc,
        doc,
        setDoc,
        deleteDoc,
        onSnapshot,
        query,
        orderBy,
        getDoc
    } = window.firebase;

    // Firebase initialization variables provided by the environment
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    // Use the user-provided Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyCZSC4KP9r9Ia74gjhVM4hkhkCiXU6ltR4",
      authDomain: "avny-ccbe9.firebaseapp.com",
      databaseURL: "https://avny-ccbe9-default-rtdb.firebaseio.com",
      projectId: "avny-ccbe9",
      storageBucket: "avny-ccbe9.firebasestorage.app",
      messagingSenderId: "686829295344",
      appId: "1:686829295344:web:5323d5a6861c4326701435",
      measurementId: "G-WMGJ1H89PF"
    };
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

    // Check if Firebase config is available
    if (Object.keys(firebaseConfig).length === 0) {
        console.error("Firebase config is missing. Cannot initialize the app.");
        return;
    }

    // Initialize Firebase and Firestore
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    let userId = null;
    let trips = []; // Local array to hold trip data from Firestore

    // Get all DOM elements
    const addTripForm = document.getElementById('add-trip-form');
    const tripsList = document.getElementById('trips-list');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const addTripButton = document.getElementById('add-trip-button');
    const backToListButton = document.getElementById('back-to-list-button');
    const backFromDetailButton = document.getElementById('back-from-detail-button');
    const tripsSection = document.querySelector('.trips-section');
    const formSection = document.querySelector('.form-section');
    const tripDetailSection = document.querySelector('.trip-detail-section');
    const daysContainer = document.getElementById('days-container');
    const addDayButton = document.getElementById('add-day-button');
    const tripDetailContent = document.getElementById('trip-detail-content');
    const canvaLinkInput = document.getElementById('canva-link');
    const formTitle = document.getElementById('form-title');
    const submitButton = document.getElementById('submit-button');
    const tripIdInput = document.getElementById('trip-id');
    const editTripButton = document.getElementById('edit-trip-button');
    const userInfoElement = document.getElementById('user-info');
    let dayCounter = 0;

    // --- Firebase Auth & Data Sync ---
    
    // Listen for authentication state changes
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            console.log("User is signed in with UID:", userId);
            userInfoElement.innerHTML = `
                <p>您已登入。使用者 ID: <span style="font-weight: bold;">${userId}</span></p>
                <p>您的所有行程將被自動儲存。</p>
            `;
            // Set up real-time listener for trips after auth
            setupTripListener();
        } else {
            console.log("No user is signed in. Attempting anonymous sign-in.");
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Authentication failed:", error);
            }
        }
    });

    // Real-time listener for the user's trips
    function setupTripListener() {
        const tripCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/travel_trips`);
        onSnapshot(tripCollectionRef, (snapshot) => {
            trips = [];
            snapshot.forEach(doc => {
                trips.push({ id: doc.id, ...doc.data() });
            });
            console.log("Trips updated from Firestore:", trips);
            // Sort trips by creation timestamp if available, otherwise by title
            trips.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || a.title.localeCompare(b.title));
            displayTrips(trips);
        }, (error) => {
            console.error("Error fetching trips:", error);
        });
    }

    // --- DOM Manipulation & Event Handlers ---

    // Create a new day input section
    function createDayInput(dayData = {}) {
        dayCounter++;
        const dayInputGroup = document.createElement('div');
        dayInputGroup.classList.add('day-input-group');
        dayInputGroup.innerHTML = `
            <button type="button" class="remove-day-button">✖</button>
            <label>第 ${dayCounter} 天：</label>
            <div class="form-group">
                <label for="hotel-day-${dayCounter}">入住飯店：</label>
                <input type="text" class="hotel-input" id="hotel-day-${dayCounter}" placeholder="輸入當日入住飯店名稱" value="${dayData.hotel || ''}">
            </div>
            <div class="form-group">
                <label for="content-day-${dayCounter}">行程細節：</label>
                <textarea class="day-content-input" id="content-day-${dayCounter}" rows="5" placeholder="輸入第 ${dayCounter} 天的行程...">${dayData.content || ''}</textarea>
            </div>
            <div class="form-group">
                <label>新增圖片：</label>
                <input type="file" class="image-input" multiple accept="image/*">
                <div class="image-preview-container">
                    ${dayData.images ? dayData.images.map(img => `<img src="${img}" alt="行程圖片">`).join('') : ''}
                </div>
            </div>
        `;
        daysContainer.appendChild(dayInputGroup);

        const removeButton = dayInputGroup.querySelector('.remove-day-button');
        removeButton.addEventListener('click', () => {
            dayInputGroup.remove();
            updateDayLabels();
        });
        
        const imageInput = dayInputGroup.querySelector('.image-input');
        const imagePreviewContainer = dayInputGroup.querySelector('.image-preview-container');
        imageInput.addEventListener('change', (event) => {
            imagePreviewContainer.innerHTML = '';
            const files = event.target.files;
            for (const file of files) {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        imagePreviewContainer.appendChild(img);
                    };
                    reader.readAsDataURL(file);
                }
            }
        });
    }

    // Update day labels after removal
    function updateDayLabels() {
        const dayInputGroups = daysContainer.querySelectorAll('.day-input-group');
        dayCounter = 0;
        dayInputGroups.forEach((group) => {
            dayCounter++;
            group.querySelector('label').textContent = `第 ${dayCounter} 天：`;
            group.querySelector('.hotel-input').id = `hotel-day-${dayCounter}`;
            group.querySelector('.day-content-input').id = `content-day-${dayCounter}`;
            group.querySelector('.day-content-input').placeholder = `輸入第 ${dayCounter} 天的行程...`;
        });
    }

    // Switch between different sections of the app
    function showSection(section, trip = null) {
        tripsSection.style.display = 'none';
        formSection.style.display = 'none';
        tripDetailSection.style.display = 'none';

        if (section === 'trips') {
            tripsSection.style.display = 'block';
            tripsSection.style.animation = 'fadeIn 1s ease-in forwards';
        } else if (section === 'form') {
            formSection.style.display = 'flex';
            formSection.style.animation = 'fadeIn 1s ease-in forwards';
            resetForm();
            if (trip) {
                formTitle.textContent = '編輯旅遊行程';
                submitButton.textContent = '更新行程';
                tripIdInput.value = trip.id;
                document.getElementById('trip-title').value = trip.title;
                document.getElementById('trip-destination').value = trip.destination;
                document.getElementById('trip-tags').value = trip.tags.join(', ');
                document.getElementById('canva-link').value = trip.canvaLink;
                
                if (!trip.canvaLink) {
                    trip.days.forEach(day => createDayInput(day));
                } else {
                    daysContainer.innerHTML = '';
                }

            } else {
                formTitle.textContent = '新增旅遊行程';
                submitButton.textContent = '新增行程';
                createDayInput();
            }
        } else if (section === 'detail') {
            tripDetailSection.style.display = 'block';
            tripDetailSection.style.animation = 'fadeIn 1s ease-in forwards';
        }
    }

    // Reset the form to its initial state
    function resetForm() {
        addTripForm.reset();
        daysContainer.innerHTML = '';
        dayCounter = 0;
        tripIdInput.value = '';
    }
    
    // Handle Add Trip button click
    addTripButton.addEventListener('click', () => {
        showSection('form');
    });

    // Handle Back to List button click from form page
    backToListButton.addEventListener('click', () => {
        showSection('trips');
    });
    
    // Handle Back to List button click from detail page
    backFromDetailButton.addEventListener('click', () => {
        showSection('trips');
    });

    // Handle form submission to add or update a trip in Firestore
    addTripForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!userId) {
            console.error("User not authenticated. Cannot save trip.");
            return;
        }

        const title = document.getElementById('trip-title').value.trim();
        const destination = document.getElementById('trip-destination').value.trim();
        const tagsInput = document.getElementById('trip-tags').value.trim();
        const canvaLink = document.getElementById('canva-link').value.trim();
        const tripId = tripIdInput.value;

        if (title === '' || destination === '') {
            console.error('請填寫行程標題和目的地！');
            return;
        }

        let daysData = [];
        if (canvaLink === '') {
            const dayInputGroups = daysContainer.querySelectorAll('.day-input-group');
            if (dayInputGroups.length === 0 || dayInputGroups.every(day => day.querySelector('.day-content-input').value.trim() === '')) {
                 console.error('請至少輸入一天的行程內容！');
                 return;
            }
            for (const group of dayInputGroups) {
                const hotel = group.querySelector('.hotel-input').value.trim();
                const content = group.querySelector('.day-content-input').value.trim();
                const images = [];

                const files = group.querySelector('.image-input').files;
                for (const file of files) {
                    if (file.type.startsWith('image/')) {
                        const base64 = await new Promise(resolve => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result);
                            reader.readAsDataURL(file);
                        });
                        images.push(base64);
                    }
                }
                daysData.push({ hotel, content, images });
            }
        }
        
        const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

        const tripData = {
            title,
            destination,
            tags,
            canvaLink,
            days: daysData,
            createdAt: new Date().toISOString() // Add timestamp for sorting
        };

        try {
            if (tripId) {
                const tripDocRef = doc(db, `artifacts/${appId}/users/${userId}/travel_trips`, tripId);
                await setDoc(tripDocRef, tripData, { merge: true });
                console.log("Trip updated with ID: ", tripId);
            } else {
                const tripCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/travel_trips`);
                const docRef = await addDoc(tripCollectionRef, tripData);
                console.log("Trip added with ID: ", docRef.id);
            }
            showSection('trips');
        } catch (e) {
            console.error("Error saving trip:", e);
        }
    });

    // Handle search event
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Handle add day button click
    addDayButton.addEventListener('click', createDayInput);

    // Search logic
    function performSearch() {
        const query = searchInput.value.toLowerCase();
        const filteredTrips = trips.filter(trip => {
            const matchesDestination = trip.destination.toLowerCase().includes(query);
            const matchesTags = trip.tags.some(tag => tag.toLowerCase().includes(query));
            return matchesDestination || matchesTags;
        });
        displayTrips(filteredTrips);
    }

    // Display trips on the page (summary view)
    function displayTrips(tripsToDisplay) {
        tripsList.innerHTML = '';
        if (tripsToDisplay.length === 0) {
            tripsList.innerHTML = '<p style="text-align: center; color: #888;">找不到符合條件的行程。</p>';
            return;
        }

        tripsToDisplay.forEach(trip => {
            const tripCard = document.createElement('div');
            tripCard.classList.add('trip-card');
            tripCard.setAttribute('data-id', trip.id);

            tripCard.innerHTML = `
                <h3>${trip.title}</h3>
                <p><strong>目的地：</strong> ${trip.destination}</p>
                <div class="tags-container">
                    ${trip.tags.map(tag => `<span>#${tag}</span>`).join('')}
                </div>
            `;
            tripsList.appendChild(tripCard);

            tripCard.addEventListener('click', () => showTripDetails(trip.id));
        });
    }

    // Show detailed view of a single trip
    function showTripDetails(tripId) {
        const selectedTrip = trips.find(trip => trip.id === tripId);
        if (!selectedTrip) {
            console.error("Trip not found for ID:", tripId);
            return;
        }

        tripDetailContent.innerHTML = '';

        tripDetailContent.innerHTML = `
            <h2>${selectedTrip.title}</h2>
            <p><strong>目的地：</strong> ${selectedTrip.destination}</p>
            <div class="tags-container">
                ${selectedTrip.tags.map(tag => `<span>#${tag}</span>`).join('')}
            </div>
        `;

        if (selectedTrip.canvaLink && selectedTrip.canvaLink.startsWith('https://www.canva.com/design/')) {
            const canvaLinkContainer = document.createElement('div');
            canvaLinkContainer.className = 'canva-link-container';
            canvaLinkContainer.innerHTML = `
                <p>此行程使用 Canva 設計，請點擊下方按鈕在新分頁檢視。</p>
                <a href="${selectedTrip.canvaLink}" target="_blank">
                    前往 Canva 查看行程
                </a>
            `;
            tripDetailContent.appendChild(canvaLinkContainer);
        } else {
            let daysHtml = '';
            selectedTrip.days.forEach((day, index) => {
                const formattedContent = day.content.replace(/\n/g, '<br>');
                const hotelInfo = day.hotel ? `<p><strong>入住飯店：</strong>${day.hotel}</p>` : '';
                const imagesHtml = day.images && day.images.length > 0 ?
                    `<div class="trip-day-images">${day.images.map(imgSrc => `<img src="${imgSrc}" alt="行程圖片">`).join('')}</div>`
                    : '';
                
                daysHtml += `
                    <div class="trip-day-content">
                        <h4>第 ${index + 1} 天</h4>
                        ${hotelInfo}
                        <p>${formattedContent}</p>
                        ${imagesHtml}
                    </div>
                `;
            });
            const daysContainerDiv = document.createElement('div');
            daysContainerDiv.innerHTML = daysHtml;
            tripDetailContent.appendChild(daysContainerDiv);
        }

        showSection('detail');
        
        editTripButton.onclick = () => {
            showSection('form', selectedTrip);
        };
    }

    // Initially show the trips section
    showSection('trips');
});

