document.addEventListener('DOMContentLoaded', () => {
    // 取得所有 DOM 元素
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

    // 存放所有行程的陣列
    let trips = [];
    let dayCounter = 0;
    
    // 創建新的天數輸入框
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

        // 為刪除按鈕新增事件監聽器
        const removeButton = dayInputGroup.querySelector('.remove-day-button');
        removeButton.addEventListener('click', () => {
            dayInputGroup.remove();
            updateDayLabels();
        });
        
        // 為圖片輸入新增事件監聽器
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

    // 更新天數標籤的數字
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

    // 切換區塊顯示的函式
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
            // 進入表單時重設表單並根據 trip 參數填充
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
                    daysContainer.innerHTML = ''; // 如果有 Canva 連結，清空每日行程
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

    // 重設表單
    function resetForm() {
        addTripForm.reset();
        daysContainer.innerHTML = '';
        dayCounter = 0;
        tripIdInput.value = '';
    }
    
    // 處理「新增行程」按鈕點擊事件
    addTripButton.addEventListener('click', () => {
        showSection('form');
    });

    // 處理「返回首頁」按鈕點擊事件 (表單頁)
    backToListButton.addEventListener('click', () => {
        showSection('trips');
    });
    
    // 處理「返回行程列表」按鈕點擊事件 (細節頁)
    backFromDetailButton.addEventListener('click', () => {
        showSection('trips');
    });

    // 處理表單提交事件，新增或更新行程
    addTripForm.addEventListener('submit', async (e) => {
        e.preventDefault();

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
        // 如果沒有提供 Canva 連結，才儲存每日行程細節
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
        
        // 將標籤字串轉換為陣列，並去除前後空白
        const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

        const newTrip = {
            title,
            destination,
            tags,
            canvaLink, // 新增 Canva 連結欄位
            days: daysData
        };

        if (tripId) {
            // 更新現有行程
            const index = trips.findIndex(t => t.id === parseInt(tripId));
            if (index !== -1) {
                trips[index] = { ...trips[index], ...newTrip };
            }
        } else {
            // 新增新行程
            newTrip.id = Date.now(); // 簡單的唯一 ID
            trips.unshift(newTrip); // 新增到陣列開頭
        }

        displayTrips(trips);
        showSection('trips'); // 新增/更新後自動返回首頁
    });

    // 處理搜尋事件
    searchButton.addEventListener('click', () => {
        performSearch();
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // 新增天數按鈕的事件監聽器
    addDayButton.addEventListener('click', createDayInput);

    // 搜尋邏輯
    function performSearch() {
        const query = searchInput.value.toLowerCase();
        const filteredTrips = trips.filter(trip => {
            // 搜尋目的地或標籤
            const matchesDestination = trip.destination.toLowerCase().includes(query);
            const matchesTags = trip.tags.some(tag => tag.toLowerCase().includes(query));
            return matchesDestination || matchesTags;
        });
        displayTrips(filteredTrips);
    }

    // 動態顯示行程到頁面 (只顯示摘要)
    function displayTrips(tripsToDisplay) {
        tripsList.innerHTML = ''; // 清空目前的列表

        if (tripsToDisplay.length === 0) {
            tripsList.innerHTML = '<p style="text-align: center; color: #888;">找不到符合條件的行程。</p>';
            return;
        }

        tripsToDisplay.forEach(trip => {
            const tripCard = document.createElement('div');
            tripCard.classList.add('trip-card');
            tripCard.setAttribute('data-id', trip.id); // 新增 data-id 屬性

            tripCard.innerHTML = `
                <h3>${trip.title}</h3>
                <p><strong>目的地：</strong> ${trip.destination}</p>
                <div class="tags-container">
                    ${trip.tags.map(tag => `<span>#${tag}</span>`).join('')}
                </div>
            `;
            tripsList.appendChild(tripCard);

            // 為每個卡片新增點擊事件監聽器
            tripCard.addEventListener('click', () => showTripDetails(trip.id));
        });
    }

    // 顯示單一行程的詳細內容
    function showTripDetails(tripId) {
        const selectedTrip = trips.find(trip => trip.id === tripId);
        if (!selectedTrip) return;

        // 清空內容
        tripDetailContent.innerHTML = '';

        // 顯示標題、目的地和標籤
        tripDetailContent.innerHTML = `
            <h2>${selectedTrip.title}</h2>
            <p><strong>目的地：</strong> ${selectedTrip.destination}</p>
            <div class="tags-container">
                ${selectedTrip.tags.map(tag => `<span>#${tag}</span>`).join('')}
            </div>
        `;

        // 檢查是否有 Canva 連結
        if (selectedTrip.canvaLink && selectedTrip.canvaLink.startsWith('https://www.canva.com/design/')) {
            // 如果有，顯示一個按鈕讓使用者在新分頁開啟
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
            // 否則，顯示手動輸入的每日行程
            let daysHtml = '';
            selectedTrip.days.forEach((day, index) => {
                const formattedContent = day.content.replace(/\n/g, '<br>');
                const hotelInfo = day.hotel ? `<p><strong>入住飯店：</strong>${day.hotel}</p>` : '';
                const imagesHtml = day.images.length > 0 ?
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
        
        // 為編輯按鈕新增事件監聽器
        editTripButton.addEventListener('click', () => {
            showSection('form', selectedTrip);
        });
    }

    // 頁面初次載入時顯示所有行程（一開始是空的）
    showSection('trips');
    displayTrips(trips);
});
