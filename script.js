// URL Shortener Service
class URLShortener {
    constructor() {
        this.links = this.loadLinks();
        this.baseURL = window.location.origin + '/';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderRecentLinks();
        this.checkExpiredLinks();
    }

    setupEventListeners() {
        const shortenBtn = document.getElementById('shorten-btn');
        const urlInput = document.getElementById('url-input');
        const copyBtn = document.getElementById('copy-btn');

        shortenBtn.addEventListener('click', () => this.handleShorten());
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleShorten();
        });
        copyBtn.addEventListener('click', () => this.handleCopy());
    }

    async handleShorten() {
        const urlInput = document.getElementById('url-input');
        const customAlias = document.getElementById('custom-alias');
        const expirySelect = document.getElementById('expiry-select');
        const shortenBtn = document.getElementById('shorten-btn');

        const longURL = urlInput.value.trim();
        
        // Validation
        if (!longURL) {
            this.showNotification('Please enter a URL');
            return;
        }

        if (!this.isValidURL(longURL)) {
            this.showNotification('Please enter a valid URL');
            return;
        }

        // Check if custom alias already exists
        const alias = customAlias.value.trim();
        if (alias && this.links.some(link => link.shortCode === alias)) {
            this.showNotification('This alias is already taken');
            return;
        }

        // Show loading state
        shortenBtn.classList.add('loading');

        // Simulate API delay
        await this.delay(800);

        // Generate short code
        const shortCode = alias || this.generateShortCode();
        const expiryHours = parseInt(expirySelect.value) || null;
        
        // Create link object
        const link = {
            id: Date.now(),
            longURL: longURL,
            shortCode: shortCode,
            shortURL: this.baseURL + shortCode,
            clicks: 0,
            createdAt: new Date().toISOString(),
            expiryHours: expiryHours,
            expiresAt: expiryHours ? this.calculateExpiry(expiryHours) : null
        };

        // Save link
        this.links.unshift(link);
        this.saveLinks();

        // Show result
        this.displayResult(link);

        // Reset form
        urlInput.value = '';
        customAlias.value = '';
        expirySelect.value = '';
        shortenBtn.classList.remove('loading');

        // Update recent links
        this.renderRecentLinks();
    }

    displayResult(link) {
        const resultSection = document.getElementById('result-section');
        const shortURLLink = document.getElementById('short-url-link');
        const originalURL = document.getElementById('original-url');
        const clickCount = document.getElementById('click-count');
        const expiryTime = document.getElementById('expiry-time');
        const expiryStat = document.getElementById('expiry-stat');

        shortURLLink.textContent = link.shortURL;
        shortURLLink.href = link.longURL;
        originalURL.textContent = this.truncateURL(link.longURL, 50);
        clickCount.textContent = link.clicks;

        if (link.expiresAt) {
            expiryTime.textContent = this.formatExpiryTime(link.expiresAt);
            expiryStat.style.display = 'block';
        } else {
            expiryStat.style.display = 'none';
        }

        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    handleCopy() {
        const shortURLLink = document.getElementById('short-url-link');
        const copyBtn = document.getElementById('copy-btn');
        
        navigator.clipboard.writeText(shortURLLink.textContent).then(() => {
            copyBtn.classList.add('copied');
            setTimeout(() => {
                copyBtn.classList.remove('copied');
            }, 2000);
        });
    }

    renderRecentLinks() {
        const recentList = document.getElementById('recent-list');
        const activeLinks = this.links.filter(link => !this.isExpired(link));

        if (activeLinks.length === 0) {
            recentList.innerHTML = '<div class="recent-empty">No links yet. Create your first one!</div>';
            return;
        }

        recentList.innerHTML = activeLinks.slice(0, 5).map((link, index) => `
            <div class="recent-item" style="animation-delay: ${index * 0.1}s">
                <div class="recent-item-header">
                    <a href="${link.longURL}" class="recent-short-url" target="_blank" onclick="urlShortener.trackClick('${link.shortCode}')">
                        ${link.shortCode}
                    </a>
                    <span class="recent-clicks">${link.clicks} clicks</span>
                </div>
                <div class="recent-original">${link.longURL}</div>
                <div class="recent-meta">
                    <span class="recent-meta-item">Created ${this.formatDate(link.createdAt)}</span>
                    ${link.expiresAt ? `<span class="recent-meta-item">Expires ${this.formatExpiryTime(link.expiresAt)}</span>` : ''}
                </div>
            </div>
        `).join('');
    }

    trackClick(shortCode) {
        const link = this.links.find(l => l.shortCode === shortCode);
        if (link && !this.isExpired(link)) {
            link.clicks++;
            this.saveLinks();
            this.renderRecentLinks();
            
            // Update result display if showing
            const clickCount = document.getElementById('click-count');
            const shortURLLink = document.getElementById('short-url-link');
            if (shortURLLink.textContent.includes(shortCode)) {
                clickCount.textContent = link.clicks;
            }
        }
    }

    generateShortCode() {
        const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        // Check if code already exists
        if (this.links.some(link => link.shortCode === code)) {
            return this.generateShortCode();
        }
        
        return code;
    }

    calculateExpiry(hours) {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + hours);
        return expiry.toISOString();
    }

    isExpired(link) {
        if (!link.expiresAt) return false;
        return new Date(link.expiresAt) < new Date();
    }

    checkExpiredLinks() {
        const activeLinks = this.links.filter(link => !this.isExpired(link));
        if (activeLinks.length !== this.links.length) {
            this.links = activeLinks;
            this.saveLinks();
            this.renderRecentLinks();
        }
    }

    formatExpiryTime(expiryDate) {
        const expiry = new Date(expiryDate);
        const now = new Date();
        const diff = expiry - now;
        
        if (diff < 0) return 'Expired';
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
        if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
        
        const minutes = Math.floor(diff / (1000 * 60));
        return `in ${minutes} min${minutes > 1 ? 's' : ''}`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    truncateURL(url, maxLength) {
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength) + '...';
    }

    isValidURL(string) {
        try {
            const url = new URL(string.startsWith('http') ? string : 'https://' + string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 24px;
            left: 50%;
            transform: translateX(-50%) translateY(-100px);
            background: #0a0a0a;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 14px;
            font-family: 'DM Sans', sans-serif;
            z-index: 1000;
            opacity: 0;
            transition: all 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-100px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    saveLinks() {
        localStorage.setItem('url-shortener-links', JSON.stringify(this.links));
    }

    loadLinks() {
        const saved = localStorage.getItem('url-shortener-links');
        return saved ? JSON.parse(saved) : [];
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the app
const urlShortener = new URLShortener();

// Check for expired links every minute
setInterval(() => {
    urlShortener.checkExpiredLinks();
}, 60000);