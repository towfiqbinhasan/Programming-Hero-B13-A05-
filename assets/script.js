const tabs = document.querySelectorAll('.tab-btn');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelector('.tab-btn.active')?.classList.remove('active');
        tab.classList.add('active');
    });
});

const API_BASE = "https://phi-lab-server.vercel.app/api/v1/lab/issues";
let allIssuesData = [];

// --- Authentication ---
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    if (user === "admin" && pass === "admin123") {
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('main-page').classList.remove('hidden');
        fetchAllIssues();
    } else {
        alert("Invalid credentials! Use admin / admin123");
    }
});

async function fetchAllIssues() {
    toggleLoader(true);
    try {
        const res = await fetch(API_BASE);
        const data = await res.json();
        allIssuesData = Array.isArray(data) ? data : (data.data || []);
        renderIssues(allIssuesData);
        updateActiveButton('filter-all');
    } catch (err) {
        console.error("Error fetching data:", err);
    } finally {
        toggleLoader(false); 
    }
}


function filterIssues(status, buttonId) {
    updateActiveButton(buttonId);

    if (status === 'all') {
        renderIssues(allIssuesData);
    } else {
        const filtered = allIssuesData.filter(issue => 
            (issue.status || 'open').toLowerCase() === status.toLowerCase()
        );
        renderIssues(filtered);
    }
}

function updateActiveButton(activeId) {
    const buttons = ['filter-all', 'filter-open', 'filter-closed'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            if (id === activeId) {
                btn.classList.add('bg-blue-600', 'text-white');
                btn.classList.remove('bg-gray-100', 'text-gray-600');
            } else {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('bg-gray-100', 'text-gray-600');
            }
        }
    });
}


async function updateIssueStatus(id, newStatus) {
    toggleLoader(true);
    try {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (res.ok) {
            closeModal('modal');
            await fetchAllIssues();
        } else {
            alert("Failed to update status!");
        }
    } catch (err) {
        console.error("Update error:", err);
    } finally {
        toggleLoader(false);
    }
}


async function searchIssues(query) {
    if (!query.trim()) return renderIssues(allIssuesData);
    
    toggleLoader(true);
    try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const searchResults = Array.isArray(data) ? data : (data.data || []);
        renderIssues(searchResults);
    } catch (err) {
        console.error("Search error:", err);
    } finally {
        toggleLoader(false);
    }
}


document.getElementById('create-issue-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const labelsInput = document.getElementById('new-labels').value;
    const newIssue = {
        title: document.getElementById('new-title').value,
        description: document.getElementById('new-desc').value,
        priority: document.getElementById('new-priority').value,
        labels: labelsInput ? labelsInput.split(',').map(s => s.trim()) : ["Bug"],
        author: "Fahim Ahmed", 
        status: "open",
        createdAt: new Date().toISOString()
    };

    try {
        toggleLoader(true);
        const res = await fetch(API_BASE, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newIssue)
        });

        if (res.ok) {
            closeModal('create-modal');
            e.target.reset();
            await fetchAllIssues();
        }
    } catch (err) {
        console.error("Network Error:", err);
    } finally {
        toggleLoader(false);
    }
});


function renderIssues(issues) {
    const grid = document.getElementById('issues-grid');
    const countEl = document.getElementById('issue-count');
    grid.innerHTML = "";
    countEl.innerText = issues.length;

    issues.forEach(issue => {
        const status = (issue.status || 'open').toLowerCase();
        const card = document.createElement('div');
        const statusClass = status === 'open' ? 'border-l-4 border-green-500' : 'border-l-4 border-purple-500';
        
        card.className = `bg-white p-5 rounded-lg border shadow-sm issue-card cursor-pointer hover:shadow-md transition-all ${statusClass}`;
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2 text-[10px] font-bold text-gray-400 uppercase">
                <span>Priority: ${issue.priority}</span>
                <span>#${issue.id || issue._id || 'N/A'}</span>
            </div>
            <h3 class="font-bold text-gray-800 line-clamp-1 mb-2">${issue.title}</h3>
            <p class="text-sm text-gray-500 line-clamp-2 mb-4">${issue.description}</p>
            <div class="flex flex-wrap gap-2 mb-4">
                ${issue.labels.map(label => `<span class="badge ${label.toLowerCase()==='bug'?'badge-bug':'badge-help'}">${label}</span>`).join('')}
            </div>
            <div class="pt-4 border-t flex justify-between items-center text-[11px] text-gray-500">
                <span class="${status === 'open' ? 'text-green-600' : 'text-purple-600'} font-bold uppercase">${status}</span>
                <span>${new Date(issue.createdAt).toLocaleDateString()}</span>
            </div>
        `;
        card.onclick = () => showModal(issue);
        grid.appendChild(card);
    });
}


function showModal(issue) {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modal-content');
    const status = (issue.status || 'open').toLowerCase();
    const issueId = issue._id || issue.id;

    const statusBtn = status === 'open' 
        ? `<button onclick="updateIssueStatus('${issueId}', 'closed')" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase transition">Close Issue</button>`
        : `<button onclick="updateIssueStatus('${issueId}', 'open')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase transition">Reopen Issue</button>`;
    
    content.innerHTML = `
        <div class="space-y-4 text-left">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-900">${issue.title}</h2>
                ${statusBtn}
            </div>
            <div class="flex items-center gap-2 mb-4">
                <span class="${status === 'open' ? 'bg-green-600' : 'bg-purple-600'} text-white px-3 py-1 rounded-full text-xs font-semibold uppercase">${status}</span>
                <span class="text-gray-500 text-sm">• Opened by ${issue.author} • ${new Date(issue.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="flex gap-2 mb-6">
                 ${issue.labels.map(label => `<span class="badge ${label.toLowerCase()==='bug'?'badge-bug':'badge-help'}">${label}</span>`).join('')}
            </div>
            <p class="text-gray-600 text-sm leading-relaxed mb-6">${issue.description}</p>
            <div class="bg-gray-50 p-6 rounded-2xl flex justify-between items-center">
                <div>
                    <p class="text-gray-400 text-xs font-semibold uppercase mb-1">Author:</p>
                    <p class="text-gray-900 font-bold">${issue.author}</p>
                </div>
                <div class="text-right">
                    <p class="text-gray-400 text-xs font-semibold uppercase mb-1">Priority:</p>
                    <span class="bg-red-500 text-white px-4 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                        ${(issue.priority || 'Medium').toUpperCase()}
                    </span>
                </div>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
}


function toggleLoader(show) { 
    const loader = document.getElementById('loader');
    const grid = document.getElementById('issues-grid');
    
    if (loader) {
        if (show) {
            loader.classList.remove('hidden'); 
            if(grid) grid.classList.add('opacity-20'); 
        } else {
            loader.classList.add('hidden');    
            if(grid) grid.classList.remove('opacity-20');
        }
    }
}

function openCreateModal() { document.getElementById('create-modal').classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }


let searchTimeout;
document.getElementById('search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => { searchIssues(e.target.value); }, 500);
});


document.getElementById('filter-open')?.addEventListener('click', () => filterIssues('open', 'filter-open'));
document.getElementById('filter-closed')?.addEventListener('click', () => filterIssues('closed', 'filter-closed'));
document.getElementById('filter-all')?.addEventListener('click', () => filterIssues('all', 'filter-all'));