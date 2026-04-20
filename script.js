/* ============================================================
   UDS FRONTEND <-> PYTHON BACKEND CONTRACT

   Backend Python chi can tra JSON dung cac endpoint duoi day.
   Frontend se tu fetch, validate co ban va render vao dung khu vuc HTML.
   Neu backend chay khac port/domain, sua API_BASE ben duoi va bat CORS trong Python.

   Goi y FastAPI:

   from fastapi import FastAPI
   from fastapi.middleware.cors import CORSMiddleware

   app = FastAPI()
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:5500", "http://127.0.0.1:5500"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )

   @app.get("/api/stock/{ticker}")
   def stock(ticker: str):
       return {
           "ticker": ticker.upper(),
           "name": "Vietcombank",
           "price": 92500,
           "change": 1.2,
           "nas_score": 82,
           "nas_5p": 8.1,
           "nas_20p": 7.8,
           "signal": "MUA"
       }

   @app.post("/api/requests")
   def create_request(payload: dict):
       return {"id": "REQ-001", "status": "received"}

   @app.get("/api/requests")
   def requests(limit: int = 8):
       return [{"ticker": "VCB", "name": "Vietcombank", "status": "pending"}]

   @app.get("/api/market/analysis")
   def market_analysis():
       return {
           "date": "20/04/2026",
           "content": "<p>Noi dung nhan dinh tu Python/AI.</p>",
           "signals": {
               "nas": {"value": "+12.4", "state": "up", "desc": "Hap thu tot"},
               "trend": {"value": "TANG", "state": "up", "desc": "Xu huong chinh"},
               "rsi": {"value": "58.2", "state": "nt", "desc": "Trung tinh"},
               "macd": {"value": "DUONG", "state": "up", "desc": "MACD tren signal"},
               "vol": {"value": "+18%", "state": "up", "desc": "Cao hon trung binh"},
               "rec": {"value": "THEO DOI", "state": "nt", "desc": "Cho xac nhan"}
           }
       }

   @app.get("/api/nas")
   def nas(date: str = "today", limit: int = 20):
       return [{
           "ticker": "VCB",
           "name": "Vietcombank",
           "sector": "Ngan hang",
           "score": 82,
           "nas_5p": 8.1,
           "nas_20p": 7.8,
           "rs": 1.2,
           "signal": "MUA",
           "updated_at": "2026-04-20T09:15:00"
       }]

   @app.get("/api/youtube/videos")
   def youtube_videos():
       return [{
           "videoId": "abc123",
           "title": "Nhan dinh VNIndex",
           "publishedAt": "2026-04-20T08:30:00",
           "thumbnail": "https://..."
       }]
============================================================ */

const API_BASE = "/api";
const AUTO_LOAD_BACKEND_DATA = true;

const API = {
	stock: (ticker) => `${API_BASE}/stock/${encodeURIComponent(ticker)}`,
	requests: `${API_BASE}/requests`,
	marketAnalysis: `${API_BASE}/market/analysis`,
	nas: `${API_BASE}/nas?date=today&limit=20`,
	youtubeVideos: `${API_BASE}/youtube/videos`,
};

const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll(".nav-links a");

window.addEventListener("scroll", () => {
	let current = "";
	sections.forEach((section) => {
		if (window.scrollY >= section.offsetTop - 100) current = section.id;
	});
	navLinks.forEach((link) =>
		link.classList.toggle("active", link.getAttribute("href") === `#${current}`),
	);
});

function escapeHtml(value) {
	return String(value ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

function formatNumber(value) {
	if (value === null || value === undefined || value === "") return "---";
	return Number(value).toLocaleString("vi-VN");
}

function formatSignedPercent(value) {
	const number = Number(value);
	if (Number.isNaN(number)) return "---";
	return `${number >= 0 ? "+" : ""}${number}%`;
}

async function fetchJson(url, options = {}) {
	const response = await fetch(url, {
		...options,
		headers: { "Content-Type": "application/json", ...options.headers },
	});

	if (!response.ok) {
		throw new Error(`API ${response.status}: ${url}`);
	}

	return response.json();
}

/* ============================================================
   STOCK SEARCH

   Python endpoint: GET /api/stock/{ticker}
   JSON tra ve:
   {
     "ticker": "VCB",
     "name": "Vietcombank",
     "price": 92500,
     "change": 1.2,
     "nas_score": 82,
     "signal": "MUA"
   }

   HTML render targets:
   #search-result, #res-ticker, #res-name, #res-price,
   #res-change, #res-nas, #res-signal
============================================================ */
function quickSearch(element) {
	document.getElementById("stock-search-input").value = element.textContent;
	handleSearch();
}

function setStockLoading(ticker) {
	document.getElementById("search-result").classList.add("show");
	document.getElementById("res-ticker").textContent = ticker;
	document.getElementById("res-name").textContent = "Dang tai du lieu tu backend...";
	document.getElementById("res-price").textContent = "---";
	document.getElementById("res-change").textContent = "---";
	document.getElementById("res-change").className = "val";
	document.getElementById("res-nas").textContent = "---";
	document.getElementById("res-signal").textContent = "---";
}

function renderStockResult(data) {
	document.getElementById("res-ticker").textContent = data.ticker ?? "---";
	document.getElementById("res-name").textContent = data.name ?? "Khong co ten cong ty";
	document.getElementById("res-price").textContent =
		data.price === undefined ? "---" : `${formatNumber(data.price)} d`;

	const changeEl = document.getElementById("res-change");
	changeEl.textContent = formatSignedPercent(data.change);
	changeEl.className = `val ${Number(data.change) >= 0 ? "c-up" : "c-dn"}`;

	document.getElementById("res-nas").textContent = data.nas_score ?? "---";
	document.getElementById("res-signal").textContent = data.signal ?? "---";
}

async function handleSearch() {
	const ticker = document
		.getElementById("stock-search-input")
		.value.trim()
		.toUpperCase();

	if (!ticker) return;

	setStockLoading(ticker);

	try {
		const data = await fetchJson(API.stock(ticker));
		renderStockResult(data);
	} catch (error) {
		document.getElementById("res-name").textContent =
			`Khong tim thay ma ${ticker} hoac backend chua tra du lieu`;
		console.warn("Stock API chua san sang:", error.message);
	}
}

/* ============================================================
   ANALYSIS REQUEST FORM

   Python endpoint: POST /api/requests
   Frontend gui body:
   {
     "ticker": "VCB",
     "type": "nas",
     "timeframe": "20",
     "note": "Noi dung nguoi dung nhap"
   }

   Python tra ve:
   {"id": "REQ-001", "status": "received"}

   HTML render targets: #req-msg, #request-list, #pending-count
============================================================ */
async function submitRequest() {
	const ticker = document
		.getElementById("req-ticker")
		.value.trim()
		.toUpperCase();
	const type = document.getElementById("req-type").value;
	const timeframe = document.getElementById("req-timeframe").value;
	const note = document.getElementById("req-note").value.trim();
	const msgEl = document.getElementById("req-msg");

	if (!ticker) {
		msgEl.className = "form-msg error";
		msgEl.textContent = "Vui long nhap ma co phieu";
		return;
	}

	msgEl.className = "form-msg";
	msgEl.textContent = "Dang gui ve backend Python...";
	msgEl.style.display = "block";

	try {
		const data = await fetchJson(API.requests, {
			method: "POST",
			body: JSON.stringify({ ticker, type, timeframe, note }),
		});

		msgEl.className = "form-msg success";
		msgEl.textContent = `Da nhan yeu cau phan tich ${ticker} - ID: ${data.id ?? "N/A"}`;
		document.getElementById("req-ticker").value = "";
		document.getElementById("req-note").value = "";
		loadRequests();
	} catch (error) {
		msgEl.className = "form-msg error";
		msgEl.textContent = "Backend Python chua san sang hoac loi ket noi";
		console.warn("Request API chua san sang:", error.message);
	}
}

function renderRequests(rows) {
	const listEl = document.getElementById("request-list");
	const countEl = document.getElementById("pending-count");
	const data = Array.isArray(rows) ? rows : [];

	if (data.length === 0) {
		countEl.style.display = "none";
		listEl.innerHTML =
			'<div style="padding:20px 0;text-align:center;font-family:var(--mono);font-size:11px;color:var(--muted)">Chua co yeu cau nao</div>';
		return;
	}

	const pending = data.filter((row) => row.status === "pending").length;
	countEl.textContent = `${pending} dang cho`;
	countEl.style.display = pending > 0 ? "inline" : "none";

	listEl.innerHTML = data
		.map((row) => {
			const isPending = row.status === "pending";
			return `
				<div class="req-item">
					<div>
						<div class="req-ticker">${escapeHtml(row.ticker)}</div>
						<div class="req-name">${escapeHtml(row.name || row.created_at || "")}</div>
					</div>
					<span class="badge ${isPending ? "badge-green" : "badge-muted"}">
						${isPending ? "Moi" : "Da xu ly"}
					</span>
				</div>
			`;
		})
		.join("");
}

async function loadRequests() {
	try {
		const data = await fetchJson(`${API.requests}?limit=8`);
		renderRequests(data);
	} catch (error) {
		console.warn("Requests API chua san sang:", error.message);
	}
}

/* ============================================================
   MARKET ANALYSIS + SIGNALS

   Python endpoint: GET /api/market/analysis
   JSON tra ve:
   {
     "date": "20/04/2026",
     "content": "<p>HTML da sanitize tu backend neu can.</p>",
     "signals": {
       "nas": {"value": "+12.4", "state": "up", "desc": "..."},
       "trend": {"value": "TANG", "state": "up", "desc": "..."},
       "rsi": {"value": "58.2", "state": "nt", "desc": "..."},
       "macd": {"value": "DUONG", "state": "up", "desc": "..."},
       "vol": {"value": "+18%", "state": "up", "desc": "..."},
       "rec": {"value": "THEO DOI", "state": "nt", "desc": "..."}
     }
   }

   state hop le: "up", "dn", "nt"
   HTML render targets: #analysis-content, #analysis-date, #sig-*
============================================================ */
function renderSignal(id, signal) {
	const valueEl = document.getElementById(`sig-${id}`);
	const descEl = document.getElementById(`sig-${id}-desc`);
	if (!valueEl || !descEl || !signal) return;

	valueEl.textContent = signal.value ?? "---";
	valueEl.className = `sig-val ${signal.state || "nt"}`;
	descEl.textContent = signal.desc ?? "Cho du lieu";
}

function renderAnalysis(data) {
	if (data.date) {
		document.getElementById("analysis-date").textContent = data.date;
	}

	if (data.content) {
		document.getElementById("analysis-content").innerHTML = data.content;
	}

	const signals = data.signals || {};
	renderSignal("nas", signals.nas);
	renderSignal("trend", signals.trend);
	renderSignal("rsi", signals.rsi);
	renderSignal("macd", signals.macd);
	renderSignal("vol", signals.vol);
	renderSignal("rec", signals.rec);
}

async function loadAnalysis() {
	try {
		const data = await fetchJson(API.marketAnalysis);
		renderAnalysis(data);
	} catch (error) {
		console.warn("Market analysis API chua san sang:", error.message);
	}
}

/* ============================================================
   NAS TABLE

   Python endpoint: GET /api/nas?date=today&limit=20
   JSON tra ve:
   [
     {
       "ticker": "VCB",
       "name": "Vietcombank",
       "sector": "Ngan hang",
       "score": 82,
       "nas_5p": 8.1,
       "nas_20p": 7.8,
       "rs": 1.2,
       "signal": "MUA",
       "updated_at": "2026-04-20T09:15:00"
     }
   ]

   HTML render targets: #nas-tbody, #nas-updated
============================================================ */
function renderNasTable(rows) {
	const data = Array.isArray(rows) ? rows : [];
	const tbody = document.getElementById("nas-tbody");

	if (data.length === 0) {
		tbody.innerHTML = `
			<tr>
				<td colspan="8" style="text-align:center;padding:40px;font-family:var(--mono);font-size:11px;color:var(--muted)">
					Backend chua tra du lieu NAS
				</td>
			</tr>
		`;
		return;
	}

	tbody.innerHTML = data
		.map((row) => {
			const score = Number(row.score) || 0;
			const scoreClass = score >= 70 ? "h" : score >= 50 ? "m" : "l";
			const scoreTextClass = score >= 70 ? "c-up" : score >= 50 ? "c-nt" : "c-dn";
			const signalClass =
				row.signal === "MUA"
					? "badge-green"
					: row.signal === "BAN"
						? "badge-red"
						: "badge-yellow";

			return `
				<tr>
					<td class="tc">${escapeHtml(row.ticker)}</td>
					<td>${escapeHtml(row.name)}</td>
					<td>${escapeHtml(row.sector)}</td>
					<td>
						<div class="score-wrap">
							<div class="score-bar">
								<div class="score-fill ${scoreClass}" style="width:${score}%"></div>
							</div>
							<span class="${scoreTextClass}">${score}</span>
						</div>
					</td>
					<td class="${Number(row.nas_5p) >= 0 ? "c-up" : "c-dn"}">${Number(row.nas_5p) >= 0 ? "+" : ""}${row.nas_5p}</td>
					<td class="${Number(row.nas_20p) >= 0 ? "c-up" : "c-dn"}">${Number(row.nas_20p) >= 0 ? "+" : ""}${row.nas_20p}</td>
					<td class="${Number(row.rs) >= 0 ? "c-up" : "c-dn"}">${Number(row.rs) >= 0 ? "▲" : "▼"} ${Math.abs(Number(row.rs))}%</td>
					<td><span class="badge ${signalClass}">${escapeHtml(row.signal)}</span></td>
				</tr>
			`;
		})
		.join("");

	const latestUpdate = data.find((row) => row.updated_at)?.updated_at;
	document.getElementById("nas-updated").textContent = latestUpdate
		? `Cap nhat: ${new Date(latestUpdate).toLocaleString("vi-VN")}`
		: `Cap nhat: ${new Date().toLocaleTimeString("vi-VN")}`;
}

async function loadNasTable() {
	try {
		const data = await fetchJson(API.nas);
		renderNasTable(data);
	} catch (error) {
		console.warn("NAS API chua san sang:", error.message);
	}
}

/* ============================================================
   YOUTUBE VIDEOS

   Nen de Python backend goi YouTube Data API de giau API key.
   Python endpoint: GET /api/youtube/videos
   JSON tra ve:
   [
     {
       "videoId": "abc123",
       "title": "Nhan dinh VNIndex",
       "publishedAt": "2026-04-20T08:30:00",
       "thumbnail": "https://..."
     }
   ]

   HTML render target: #youtube-grid
============================================================ */
function renderYouTube(items) {
	const data = Array.isArray(items) ? items : [];
	if (data.length === 0) return;

	document.getElementById("youtube-grid").innerHTML = data
		.map(
			(item) => `
				<div class="yt-card" onclick="openYT('${escapeHtml(item.videoId)}')">
					<div class="yt-thumb">
						<img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.title)}" />
						<div class="play-btn">▶</div>
					</div>
					<div class="yt-info">
						<div class="yt-title">${escapeHtml(item.title)}</div>
						<div class="yt-date">${new Date(item.publishedAt).toLocaleDateString("vi-VN")}</div>
					</div>
				</div>
			`,
		)
		.join("");
}

async function loadYouTubeVideos() {
	try {
		const data = await fetchJson(API.youtubeVideos);
		renderYouTube(data);
	} catch (error) {
		console.warn("YouTube API chua san sang:", error.message);
	}
}

/* ============================================================
   YOUTUBE MODAL
============================================================ */
function openYT(videoId) {
	document.getElementById("yt-iframe").src =
		`https://www.youtube.com/embed/${videoId}?autoplay=1`;
	document.getElementById("yt-modal").classList.add("show");
}

function closeYT(event) {
	const modal = document.getElementById("yt-modal");
	if (
		!event ||
		event.target === modal ||
		event.currentTarget.classList.contains("yt-modal-close")
	) {
		modal.classList.remove("show");
		document.getElementById("yt-iframe").src = "";
	}
}

document.addEventListener("keydown", (event) => {
	if (event.key === "Escape") {
		closeYT({ target: document.getElementById("yt-modal") });
	}
});

/* ============================================================
   INIT

   Khi Python backend da chay cung domain, frontend se tu goi cac API nay.
   Neu backend chua co, trang van hien placeholder va console se bao endpoint nao thieu.
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
	if (!AUTO_LOAD_BACKEND_DATA) return;

	loadRequests();
	loadAnalysis();
	loadNasTable();
	loadYouTubeVideos();
});
