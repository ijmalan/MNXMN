import './style.css'

// --- Video Highlights Logic ---
async function loadHighlights() {
  const grid = document.getElementById('highlights-grid');
  const section = document.getElementById('highlights-section');
  if(!grid || !section) return;

  try {
    const res = await fetch('/api/content'); 
    const data = await res.json();
    const videos = data.videoHighlights || [];

    if(videos.length > 0) {
      section.style.display = 'block';
      
      const isHighlightPage = document.body.classList.contains('page-highlight');
      
      // Limit to 3 on home, show more on highlight page
      const initialCount = isHighlightPage ? videos.length : 3; 
      
      const initialVideos = videos.slice(0, initialCount);
      const remainingVideos = videos.slice(initialCount);
      
      grid.innerHTML = initialVideos.map(createVideoCard).join('');
      
      // Handle Load More
      const loadMoreContainer = document.getElementById('highlights-load-more');
      // Clear previous button if exists
      if(loadMoreContainer) loadMoreContainer.innerHTML = '';

      // Logic: If on Home and there are remaining videos -> Show "Load More" that goes to /highlight.html
      // If on Highlight page -> We showed 50, if still more maybe standard load more (or just simple pagination) - ignoring complex refactor for now.
      
      if (!isHighlightPage && remainingVideos.length > 0) {
         let container = loadMoreContainer;
         if (!container) {
             // Create if missing (though index.html has it)
             const existing = document.getElementById('highlights-load-more');
             if(existing) container = existing;
             else {
                container = document.createElement('div');
                container.id = 'highlights-load-more';
                container.className = 'load-more-container';
                grid.after(container);
             }
         }
         
         const btn = document.createElement('button');
         btn.className = 'btn-load-more';
         btn.innerText = 'Load More';
         btn.onclick = () => {
             // Redirect to highlight page instead of loading underneath
             window.location.href = '/highlight.html';
         };
         container.appendChild(btn);
      }

      // Trigger animations for initial set
      document.querySelectorAll('.highlight-card').forEach((el, i) => {
         setTimeout(() => el.classList.add('visible'), i * 100);
      });
      
      // Load/Reload TikTok Script safely
      if(initialVideos.some(v => v.type === 'tiktok')) {
        reloadTikTokScript();
      }
    } else {
      section.style.display = 'none';
    }

  } catch (err) {
    console.error('Failed to load highlights', err);
    section.style.display = 'none';
  }
}

function createVideoCard(video) {
  let embedHtml = '';
  // Force high z-index for the wrapper to ensure clicks pass through
  let wrapperClass = 'highlight-video-wrapper';

  if (video.type === 'youtube') {
    wrapperClass += ' youtube';
    const videoId = getYouTubeId(video.url);
    // Add playsinline and modestbranding for cleaner look
    embedHtml = `<iframe src="https://www.youtube.com/embed/${videoId}?playsinline=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="z-index: 10;"></iframe>`;
  } else if (video.type === 'tiktok') {
    // Determine ID safely (Handle standard and short URLs if possible, though short needs API)
    // We assume standard URL: https://www.tiktok.com/@user/video/ID
    let videoId = ''; 
    try { 
        if(video.url.includes('/video/')) videoId = video.url.split('/video/')[1].split('?')[0];
        else videoId = video.url;
    } catch(e){}
    
    // Try Player V1 again with minimal params and specific referrer policy
    // This gives the "Dark Mode" player look and inline playback if supported
    embedHtml = `<iframe src="https://www.tiktok.com/player/v1/${videoId}?music_info_check=1" allow="fullscreen" referrerpolicy="unsafe-url" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0; border: none; background: #000;"></iframe>`;
    
    // Use fixed ratio container for player look
    wrapperClass = 'highlight-video-wrapper'; 
  } else {
    embedHtml = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fff;">Invalid Video URL</div>`;
  }

  return `
    <div class="highlight-card scroll-reveal" style="z-index: 5;">
      <div class="${wrapperClass}">
        ${embedHtml}
      </div>
      <div class="highlight-info">
        <div class="highlight-title">${video.caption}</div>
        <div class="highlight-meta">
           <span>${video.type === 'tiktok' ? '🎵 TikTok' : '📺 YouTube'}</span>
        </div>
      </div>
    </div>
  `;
}

function getYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function reloadTikTokScript() {
  // Remove existing script if any to force re-execution
  const existingScript = document.getElementById('tiktok-embed-script');
  if(existingScript) existingScript.remove();

  const script = document.createElement('script');
  script.id = 'tiktok-embed-script';
  script.src = 'https://www.tiktok.com/embed.js';
  script.async = true;
  document.body.appendChild(script);
}

// Call at the end of init or DOMContentLoaded
// Call at the end of init or DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    fetchDiscordData(); // Fixed name
    initScrollReveal();
    loadHighlights();
    loadEvents(); // Load events
});

// Load Events
// ... (lines 149-195 unchanged, skipped in this replace block for brevity if possible, but I must replace contiguous block.
// Wait, I can't skip the middle if I use replace_file_content with a huge range.
// Better to do two replaces or one smart one.
// The incorrect call is at line 142.
// The missing function def is at 938.
// I will use multi_replace.

// Actually, I can use replace_file_content for line 142.
// And another one for lines 938+.


// Load Events
async function loadEvents() {
    const grid = document.getElementById('events-grid');
    if(!grid) return;
    
    try {
        const res = await fetch('/api/events');
        const events = await res.json();
        
        grid.innerHTML = '';
        
        // Filter out past events
        const now = new Date();
        const futureEvents = events.filter(e => {
            const eventTime = new Date(`${e.date}T${e.time}`);
            return eventTime > now;
        });

        if(futureEvents.length === 0) {
            // Keep hidden or show message? 
            // Better to hide the section or show a nice "Stay tuned" message
            // If the user wants it to disappear from view if empty, we can hide the section.
            // But let's show a message for now.
             grid.innerHTML = '<div class="no-events-msg">No upcoming events right now. Stay tuned! 🌟</div>';
            return;
        }
        
        // Sort by nearest date
        futureEvents.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
        
        futureEvents.forEach(event => {
            const dateObj = new Date(event.date);
            // const dateStr = dateObj.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            
            const card = document.createElement('div');
            card.className = 'event-card scroll-reveal';
            card.innerHTML = `
                <div class="event-glow"></div>
                <div class="event-date">
                    <span class="day">${dateObj.getDate()}</span>
                    <span class="month">${dateObj.toLocaleDateString('id-ID', { month: 'short' })}</span>
                </div>
                <div class="event-details">
                    <h3>${event.name}</h3>
                    <p class="event-time">
                      <span class="icon">🕒</span> ${event.time} WIB
                    </p>
                    <p class="event-desc">Join us for ${event.name}!</p>
                </div>
                <div class="event-action">
                   <span class="status-badge">Upcoming</span>
                </div>
            `;
            grid.appendChild(card);
        });
        
        // Re-trigger scroll reveal for new elements
        initScrollReveal();

    } catch(e) {
        console.error('Failed to load events:', e);
        grid.innerHTML = '<p style="text-align: center; color: #888;">Failed to load events.</p>';
    }
}


console.log('MNXMN Community Site Loaded')

// --- AUTH LOGIC ---
const authState = {
    user: JSON.parse(localStorage.getItem('mnxmn_user') || 'null')
};

function checkAuth() {
    // 1. Check for URL callback data
    const urlParams = new URLSearchParams(window.location.search);
    const authData = urlParams.get('auth');
    const authError = urlParams.get('auth_error');

    if (authData) {
        try {
            const user = JSON.parse(atob(authData));
            localStorage.setItem('mnxmn_user', JSON.stringify(user));
            authState.user = user;
            
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
            console.error('Auth decode failed', e);
        }
    } else if (authError) {
        // Decode error if present
        const msg = decodeURIComponent(authError);
        alert(`Login failed: ${msg}`);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    updateAuthUI();
}

function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const profile = document.getElementById('user-profile');
    const avatar = document.getElementById('user-avatar');
    const name = document.getElementById('user-name');
    const badge = document.getElementById('user-badge');
    const logoutBtn = document.getElementById('logout-btn');

    if (authState.user) {
        if(loginBtn) loginBtn.style.display = 'none';
        if(profile) {
            profile.style.display = 'flex';
            if(avatar) avatar.src = authState.user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
            if(name) name.innerText = authState.user.username;
            
            if(badge) {
                if(authState.user.isMember) {
                    if (authState.user.topRole) {
                        badge.innerText = authState.user.topRole.name;
                        badge.style.color = authState.user.topRole.color;
                        badge.style.borderColor = authState.user.topRole.color; // Optional: add border/glow
                        badge.className = 'user-badge'; // Reset classes, use inline style for custom color
                    } else {
                        badge.innerText = 'Verified Member';
                        badge.className = 'user-badge verified';
                    }
                } else {
                    badge.innerText = 'Guest';
                    badge.className = 'user-badge';
                    badge.style.color = ''; // Reset
                }
            }
        }
        
        // 1. Personalized Greeting
        const heroSubtitle = document.querySelector('.hero-subtitle');
        if (heroSubtitle) {
            // Save original for logout
            if (!heroSubtitle.dataset.original) heroSubtitle.dataset.original = heroSubtitle.innerHTML;
            heroSubtitle.innerHTML = `Welcome back, <span class="text-gradient">${authState.user.username}</span>!`;
        }

        // UPDATE HOLO CARD
        if (typeof updateHoloCard === 'function') {
            updateHoloCard(authState.user);
        }

        // 2. Change 'Join' to 'Open' if they are a member
        const joinBtn = document.querySelector('.discord-promo .btn-primary');
        if (joinBtn && authState.user.isMember) {
            joinBtn.innerHTML = `
               <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 13.06 13.06 0 0 0-1.063 2.192 14.857 14.857 0 0 0-5.225 0 13.025 13.025 0 0 0-1.069-2.2.072.072 0 0 0-.079-.033 19.544 19.544 0 0 0-4.881 1.515.061.061 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.118.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"/></svg>
               Open Discord
            `;
            // Optional: change link to a specific channel if possible, e.g., https://discord.com/channels/SERVER_ID
        }

    } else {
        if(loginBtn) loginBtn.style.display = 'block';
        if(profile) profile.style.display = 'none';
        
        // Restore original hero text if it was changed
        const heroSubtitle = document.querySelector('.hero-subtitle');
        if (heroSubtitle && heroSubtitle.dataset.original) {
            heroSubtitle.innerHTML = heroSubtitle.dataset.original;
        }
        
        // RESET HOLO CARD
        if (typeof updateHoloCard === 'function') {
            updateHoloCard(null);
        }
    }

    if(logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem('mnxmn_user');
            authState.user = null;
            updateAuthUI();
            // Optional: location.reload() if some content depends on auth
        }
    }
}

// Check Auth on Init
checkAuth();

// --- Preloader (Hacker Effect) ---
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()";

window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  const textElement = document.querySelector('.hacker-text');
  
  if (textElement) {
    let iteration = 0;
    const originalText = textElement.dataset.value;
    let interval = null;
    
    interval = setInterval(() => {
      textElement.innerText = originalText
        .split("")
        .map((letter, index) => {
          if(index < iteration) {
            return originalText[index];
          }
          return letters[Math.floor(Math.random() * letters.length)];
        })
        .join("");
      
      if(iteration >= originalText.length) { 
        clearInterval(interval);
        
        // Wait a bit after text finishes, then fade out
        setTimeout(() => {
            if(preloader) preloader.classList.add('loaded');
        }, 800);
      }
      
      iteration += 1 / 3; // Speed of decoding
    }, 50); // Speed of flicker
  } else {
      // Fallback if element missing
      if(preloader) preloader.classList.add('loaded');
  }
});

// --- Theme Toggle ---
const themeToggleBtn = document.getElementById('theme-toggle');
const body = document.body;
// Ensure we select the image, not the wrapper
const logo = document.querySelector('.hero-logo');

// Default is Dark Mode
// Default is Dark Mode unless saved otherwise
let isDarkMode = true;

// Check LocalStorage
const savedTheme = localStorage.getItem('mnxmn_theme');
if (savedTheme === 'light') {
    isDarkMode = false;
    body.classList.add('light-mode');
    if(themeToggleBtn) themeToggleBtn.innerHTML = '🌙';
    if(logo) logo.src = '/logo-light.png';
}

if (themeToggleBtn) {
themeToggleBtn.addEventListener('click', () => {
  isDarkMode = !isDarkMode;
  
  if (isDarkMode) {
    body.classList.remove('light-mode');
    themeToggleBtn.innerHTML = '☀️';
    if(logo) logo.src = '/logo.png';
    localStorage.setItem('mnxmn_theme', 'dark');
  } else {
    body.classList.add('light-mode');
    themeToggleBtn.innerHTML = '🌙';
    if(logo) logo.src = '/logo-light.png';
    localStorage.setItem('mnxmn_theme', 'light');
  }
  
  // Re-init particles to update color
  initParticles();
});
}


// --- Cursor Effect ---
const cursorDot = document.querySelector('[data-cursor-dot]');
const cursorOutline = document.querySelector('[data-cursor-outline]');
const cursorGlow = document.querySelector('[data-cursor-glow]');

window.addEventListener('mousemove', function (e) {
  const posX = e.clientX;
  const posY = e.clientY;

  cursorDot.style.left = `${posX}px`;
  cursorDot.style.top = `${posY}px`;

  cursorGlow.style.left = `${posX}px`;
  cursorGlow.style.top = `${posY}px`;

  cursorOutline.animate({
    left: `${posX}px`,
    top: `${posY}px`
  }, { duration: 500, fill: "forwards" });
});

document.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursorOutline.style.width = '60px';
    cursorOutline.style.height = '60px';
    // Adjust outline color based on mode handled by CSS mostly, but bg change here
    cursorOutline.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0,0,0,0.05)';
    cursorGlow.style.background = 'radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, transparent 60%)';
  });
  el.addEventListener('mouseleave', () => {
    cursorOutline.style.width = '40px';
    cursorOutline.style.height = '40px';
    cursorOutline.style.backgroundColor = 'transparent';
    cursorGlow.style.background = 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 60%)';
  });
});

// --- Particle System ---
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const mouse = {
  x: undefined,
  y: undefined
}

window.addEventListener('mousemove', function(event) {
  mouse.x = event.x;
  mouse.y = event.y;
});

class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2 + 0.1;
    this.speedX = Math.random() * 1 - 0.5;
    this.speedY = Math.random() * 1 - 0.5;
    
    // Dynamic color based on mode
    if (isDarkMode) {
      this.color = `hsl(${Math.random() * 60 + 240}, 100%, 70%)`; // Blue-Purple
    } else {
      this.color = `hsl(${Math.random() * 60 + 200}, 70%, 50%)`; // Darker Blue/Cyan for light mode
    }
  }
  
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    
    // Bounce off edges
    if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
    if (this.y > canvas.height || this.y < 0) this.speedY *= -1;

    // Mouse interaction (repulse + magnify)
    let dx = mouse.x - this.x;
    let dy = mouse.y - this.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    let maxDistance = 150; // Increased interaction radius
    
    if (distance < maxDistance) {
      const forceDirectionX = dx / distance;
      const forceDirectionY = dy / distance;
      const force = (maxDistance - distance) / maxDistance;
      const directionX = forceDirectionX * force * 5; // Stronger repulsion
      const directionY = forceDirectionY * force * 5;
      this.x -= directionX;
      this.y -= directionY;
      
      // "Timbul" Effect: Magnify particles near mouse
      this.currentSize = this.size * (1 + force * 2); 
    } else {
      this.currentSize = this.size;
    }
  }
  
  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    // Use currentSize instead of fixed size
    ctx.arc(this.x, this.y, this.currentSize || this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initParticles() {
  particles = [];
  const numberOfParticles = (canvas.width * canvas.height) / 9000;
  for (let i = 0; i < numberOfParticles; i++) {
    particles.push(new Particle());
  }
}

function handleParticles() {
  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].draw();
    
    // Connect particles
    for (let j = i; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 100) {
        ctx.beginPath();
        // Line color based on mode
        if (isDarkMode) {
          ctx.strokeStyle = `rgba(124, 58, 237, ${1 - distance/100})`;
        } else {
           ctx.strokeStyle = `rgba(124, 58, 237, ${(1 - distance/100) * 0.5})`; // More subtle in light mode
        }
        ctx.lineWidth = 0.5;
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }
}

// --- Matrix Rain Effect ---
let isMatrixMode = false;
const matrixChars = "MNXMN0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const matrixFontSize = 16;
let matrixColumns = canvas.width / matrixFontSize;
let drops = [];

function initMatrix() {
    matrixColumns = canvas.width / matrixFontSize;
    drops = [];
    for(let i = 0; i < matrixColumns; i++) {
        drops[i] = 1;
    }
}

function drawMatrix() {
    // Semi-transparent black to create trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0F0'; // Green text
    ctx.font = matrixFontSize + 'px monospace';

    for(let i = 0; i < drops.length; i++) {
        const text = matrixChars.charAt(Math.floor(Math.random() * matrixChars.length));
        ctx.fillText(text, i * matrixFontSize, drops[i] * matrixFontSize);

        // Reset drop to top randomly after it crosses screen
        if(drops[i] * matrixFontSize > canvas.height && Math.random() > 0.975)
            drops[i] = 0;

        drops[i]++;
    }
}

// Toggle Matrix Mode
window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'm' && e.target.tagName !== 'INPUT') {
        isMatrixMode = !isMatrixMode;
        if (isMatrixMode) {
            initMatrix();
            // Optional: Hide other elements if desired, but overlay is cool
        } else {
            // Clear trails when switching back
            ctx.clearRect(0, 0, canvas.width, canvas.height); 
        }
    }
});

// Resize handler update
window.addEventListener('resize', () => {
    resizeCanvas();
    initMatrix(); // Re-calc columns
});

function animate() {
  if (isMatrixMode) {
      drawMatrix();
  } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height); 
      handleParticles();
  }
  requestAnimationFrame(animate);
}

initParticles();
initMatrix(); // Prep matrix
animate();

// --- Typing Effect ---
const typingElement = document.getElementById('typing-text');
const CONTENT_API = '/api/content';

async function fetchContent() {
    try {
        const res = await fetch(CONTENT_API);
        if (!res.ok) return; // Silent fail if backend offline
        const data = await res.json();

        // Update Hero Texts
        // Note: Title is now an Image (Logo), and Subtitle contains the Typing Effect which we keep static/complex.
        // We only allow editing the Description and Buttons to prevent layout breakage.
        
        if(data.heroDescription) {
            const descEl = document.getElementById('hero-description');
            if(descEl) descEl.innerText = data.heroDescription;
        }
        

        
        // Update Button
        if(data.joinButtonText) document.getElementById('join-btn-text').innerText = data.joinButtonText;
        if(data.joinButtonLink) {
            const btns = document.querySelectorAll('a[href*="discord.gg"]'); // Update all join buttons
            btns.forEach(btn => btn.href = data.joinButtonLink);
        }

        // Update Footer
        if(data.footerText) {
            const footer = document.querySelector('footer p');
            if(footer) footer.innerText = data.footerText;
        }

        // Update Gallery
        if (data.gallery && Array.isArray(data.gallery) && data.gallery.length > 0) {
          const galleryGrid = document.querySelector('.gallery-grid');
          if (galleryGrid) {
            galleryGrid.innerHTML = ''; // Clear default static items
            
            const isMomentPage = document.body.classList.contains('page-moment');
            const initialGalleryCount = isMomentPage ? 50 : 3;
            
            const initialGallery = data.gallery.slice(0, initialGalleryCount);
            const remainingGallery = data.gallery.slice(initialGalleryCount);
            
            initialGallery.forEach(item => {
              const div = document.createElement('div');
              div.className = 'gallery-item scroll-reveal visible'; // Add visible since they load late
              div.innerHTML = `
                <img src="${item.src}" alt="Moment" loading="lazy" />
                <div class="overlay"><span>${item.caption || 'Moment'}</span></div>
              `;
              galleryGrid.appendChild(div);
            });
            
            // Load More Logic for Gallery
            if (!isMomentPage && remainingGallery.length > 0) {
                 let container = document.getElementById('gallery-load-more');
                 if (!container) {
                    container = document.createElement('div');
                    container.id = 'gallery-load-more';
                    container.className = 'load-more-container'; // Reuse highlight button style
                    galleryGrid.after(container);
                 }
                 container.innerHTML = ''; // Clear existing
                 
                 const btn = document.createElement('button');
                 btn.className = 'btn-load-more';
                 btn.innerText = 'Load More';
                 btn.onclick = () => {
                     window.location.href = '/moment.html';
                 };
                 container.appendChild(btn);
            }
          }
        }

    } catch (e) {
        console.log('Using default static content (Backend offline or reachable?)');
    }
}

fetchContent(); // Initial Load


if (typingElement) {
    const words = ["Indonesia", "Gamers", "Nongkrong", "Chill", "Mabar"];
    let wordIndex = 0;
    let charIndex = words[0].length; // Start full
    let isDeleting = false;
    let typeSpeed = 200;

    function type() {
        const currentWord = words[wordIndex];
        
        if (isDeleting) {
            typingElement.textContent = currentWord.substring(0, charIndex - 1);
            charIndex--;
            typeSpeed = 100; // Faster deleting
        } else {
            typingElement.textContent = currentWord.substring(0, charIndex + 1);
            charIndex++;
            typeSpeed = 200; // Normal typing
        }

        if (!isDeleting && charIndex === currentWord.length) {
            // Finished typing word
            isDeleting = true;
            typeSpeed = 2000; // Pause before delete
        } else if (isDeleting && charIndex === 0) {
            // Finished deleting
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            typeSpeed = 500; // Pause before new word
        }

        setTimeout(type, typeSpeed);
    }
    
    // Start typing loop
    setTimeout(type, 1000);
}

/* Discord Widget Functionality */
// Auto-fetch data for the static section
// Auto-fetch data
const SERVER_ID = '1426635201542623314'; 
const INVITE_CODE = 'mnxmn';
const BACKEND_URL = '/api/discord-stats';

async function fetchDiscordData() {
  try {
    // 1. Try Local Backend (for Advanced Stats)
    const backendRes = await fetch(BACKEND_URL).catch(() => null);
    
    if (backendRes && backendRes.ok) {
      const data = await backendRes.json();
      updateStatsUI(data);
      // Use members from backend if available
      if (data.members && data.members.length > 0) {
        updateMembersList(data.members);
      } else {
         // Fallback if backend didn't return members (e.g. widget disabled)
         fetchWidgetMembers();
      }
    } else {
      throw new Error('Backend unavailable');
    }
  } catch (error) {
    console.log('Backend unreachable, falling back to Widget API...');
    // Fallback: Use Widget API
    fallbackToWidget();
  }
}

async function fetchWidgetMembers() {
    // Specifically to get the members list for avatars
    try {
        const response = await fetch(`https://discord.com/api/guilds/${SERVER_ID}/widget.json?t=${Date.now()}`);
        if(response.ok) {
            const data = await response.json();
            updateMembersList(data.members);
        }
    } catch(e) { console.error(e); }
}

async function fallbackToWidget() {
  try {
    const response = await fetch(`https://discord.com/api/guilds/${SERVER_ID}/widget.json?t=${Date.now()}`);
    if (response.ok) {
        const data = await response.json();
        // Manually map widget data to our new UI
        updateStatsUI({
            name: data.name,
            totalMembers: '?', // Widget doesn't give total
            onlineMembers: data.presence_count,
            premiumTier: '?',
            premiumSubscriptionCount: '?',
            roles: [] // Widget doesn't give roles
        });
        updateMembersList(data.members);
    } else {
        // Invite API Fallback
        const inviteRes = await fetch(`https://discord.com/api/v9/invites/${INVITE_CODE}?with_counts=true`);
        const inviteData = await inviteRes.json();
        updateStatsUI({
            name: inviteData.guild.name,
            totalMembers: inviteData.approximate_member_count,
            onlineMembers: inviteData.approximate_presence_count,
            premiumTier: '?',
            premiumSubscriptionCount: '?',
            roles: []
        });
    }
  } catch (err) {
          console.error('All APIs failed', err);
          const promoText = document.querySelector('.promo-text');
          if (promoText) {
            promoText.classList.add('api-error');
            
            // Create a simplified "Online" label if missing
            let fallbackOnline = document.getElementById('fallback-online');
            if (!fallbackOnline) {
                fallbackOnline = document.createElement('div');
                fallbackOnline.id = 'fallback-online';
                fallbackOnline.className = 'online-count'; // Reuse styling
                fallbackOnline.style.marginBottom = '1rem';
                // Try to get online count from existing element or default to ?
                const existingVal = document.getElementById('discord-online-count').innerText;
                fallbackOnline.innerHTML = `<span class="status-dot"></span> ${existingVal !== '-' ? existingVal : '?'} Members Online`;
                
                // Insert after header
                const header = document.querySelector('.server-header');
                if (header) header.insertAdjacentElement('afterend', fallbackOnline);
            }
          }
      }
}

function updateStatsUI(data) {
    // Remove error class and fallback if exists
    const promoText = document.querySelector('.promo-text');
    if (promoText) promoText.classList.remove('api-error');
    const fallback = document.getElementById('fallback-online');
    if(fallback) fallback.remove();

    // 1. Online Count
    const onlineEl = document.getElementById('discord-online-count');
    if (onlineEl) onlineEl.innerText = data.onlineMembers;

    // 2. Total Members
    const totalEl = document.getElementById('discord-total-count');
    if (totalEl) totalEl.innerText = data.totalMembers !== '?' ? data.totalMembers : 'Hidden';

    // 3. Server Name
    const nameEl = document.getElementById('discord-server-name');
    if (nameEl) {
        nameEl.innerText = data.name;
        nameEl.setAttribute('data-text', data.name); // Update glitch text
    }

    // 4. Boosts
    if (data.premiumSubscriptionCount !== undefined) {
      const boostCount = data.premiumSubscriptionCount;
      document.getElementById('discord-boosts').innerText = boostCount;
      document.getElementById('discord-boost-level').innerText = data.premiumTier;
  }
  
  if (data.roles) {
      const rolesContainer = document.getElementById('discord-roles-list');
    if (rolesContainer && data.roles && data.roles.length > 0) {
        rolesContainer.innerHTML = '';
        data.roles.forEach(role => {
            const pill = document.createElement('div');
            pill.className = 'role-pill';
            // pill.style.borderColor = role.color; // Optional: border matches role color
            pill.innerHTML = `<span class="role-dot" style="background-color: ${role.color}"></span> ${role.name}`;
            rolesContainer.appendChild(pill);
        });
    } else if (rolesContainer) {
        rolesContainer.innerHTML = ''; // Clear if no data
    }
}
}


// --- 3D Tilt Effect ---
const promoCard = document.querySelector('.discord-promo');
if (promoCard) {
    promoCard.addEventListener('mousemove', (e) => {
        const rect = promoCard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Calculate rotation (max 15deg)
        const xRotation = -((y - rect.height/2) / rect.height * 10); 
        const yRotation = (x - rect.width/2) / rect.width * 10;
        
        promoCard.style.transform = `perspective(1000px) rotateX(${xRotation}deg) rotateY(${yRotation}deg) scale(1.02)`;
    });
    
    promoCard.addEventListener('mouseleave', () => {
        promoCard.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
    });
}


function updateMembersList(members) {
    const membersElement = document.getElementById('discord-members');
    if (!membersElement) return;
    
    if (members && members.length > 0) {
      membersElement.innerHTML = ''; 
      members.forEach(member => {
        const memberItem = document.createElement('div');
        memberItem.className = 'member-item';

        const img = document.createElement('img');
        img.src = member.avatar_url;
        img.alt = member.username;
        img.className = 'discord-avatar';
        
        const statusDot = document.createElement('div');
        statusDot.className = `status-dot ${member.status}`;
        
        const tooltip = document.createElement('div');
        tooltip.className = 'member-tooltip';
        
        let tooltipContent = `<strong>${member.username}</strong>`;
        if (member.game && member.game.name) {
          tooltipContent += `<span class="member-game">Playing ${member.game.name}</span>`;
        }
        tooltip.innerHTML = tooltipContent;

        memberItem.appendChild(img);
        memberItem.appendChild(statusDot);
        memberItem.appendChild(tooltip);
        membersElement.appendChild(memberItem);
      });
    }
}

// Initial fetch
fetchDiscordData();

// Refresh every 30 seconds
setInterval(fetchDiscordData, 30000);

  // Parallax Effect (3D Tilt & Move)
  document.addEventListener('mousemove', (e) => {
    // Disable on mobile/tablet (width < 768px)
    if (window.innerWidth < 768) return;

    const hero = document.querySelector('.hero');
    if (!hero) return;

    // Calculate mouse position relative to center (-1 to 1)
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;

    // Elements to move
    const logo = document.querySelector('.hero-logo');
    
    if (logo) {
      // 3D TILT EFFECT
      const tiltX = y * 20; // Rotate around X axis (looks up/down)
      const tiltY = -x * 20; // Rotate around Y axis (looks left/right)
      const moveX = x * -20; // Reduced movement 
      const moveY = y * -20;
      
      logo.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translate(${moveX}px, ${moveY}px)`;
    }
    // Text parallax removed as requested
  });

  // --- CARDS SPOTLIGHT & TILT ---
  const cards = document.querySelectorAll('.feature-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Spotlight
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
      
      // Tilt
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -5; // Subtle 5deg tilt
      const rotateY = ((x - centerX) / centerX) * 5;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = ''; // Reset
    });
  });



// --- Matrix Rain Trigger (Logo Long Press) ---
const heroLogo = document.querySelector('.hero-logo');
if (heroLogo) {
    let pressTimer;

    const startPress = (e) => {
        // Prevent default only on touch to avoid context menu
        if(e.type === 'touchstart') e.preventDefault();
        
        pressTimer = setTimeout(() => {
            // Trigger Matrix Mode
            isMatrixMode = !isMatrixMode;
            if (isMatrixMode) {
                initMatrix();
                // Vibration feedback if supported (Mobile)
                if (navigator.vibrate) navigator.vibrate(50);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height); 
            }
        }, 2000); // 2 seconds
    };

    const cancelPress = () => {
        clearTimeout(pressTimer);
    };

    // Mouse Events
    heroLogo.addEventListener('mousedown', startPress);
    heroLogo.addEventListener('mouseup', cancelPress);
    heroLogo.addEventListener('mouseleave', cancelPress);

    // Touch Events (Mobile)
    heroLogo.addEventListener('touchstart', startPress);
    heroLogo.addEventListener('touchend', cancelPress);
}

  // --- MAGNETIC BUTTONS ---
  const magnets = document.querySelectorAll('.btn-primary');
  magnets.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
    });
  });

// --- Scroll Reveal Animation ---
function initScrollReveal() {
  const observerOptions = {
    threshold: 0.1, // Trigger when 10% of the element is visible
    rootMargin: "0px 0px -50px 0px" // Trigger slightly before the element enters the viewport fully
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Optional: Stop observing once revealed
        observer.unobserve(entry.target); 
      }
    });
  }, observerOptions);

  // Target elements with .scroll-reveal class
  document.querySelectorAll('.scroll-reveal').forEach((el) => {
    observer.observe(el);
  });
}

// --- Back to Top Logic ---
const backToTopBtn = document.getElementById('back-to-top');

window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    if(backToTopBtn) backToTopBtn.classList.add('visible');
  } else {
    if(backToTopBtn) backToTopBtn.classList.remove('visible');
  }
});

if (backToTopBtn) {
backToTopBtn.addEventListener('click', () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});
}

/* --- RESTORED HOLOGRAPHIC CARD LOGIC --- */

function initHoloCard() {
    const card = document.getElementById('holo-card');
    const container = document.querySelector('.holo-container');
    
    if (!card || !container) return;

    // 3D TILT EFFECT
    container.addEventListener('mousemove', (e) => {
        if(card.classList.contains('capturing')) return; // Stop tilt during capture

        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -10; // Max 10deg rotation
        const rotateY = ((x - centerX) / centerX) * 10;
        
        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        
        // Glare & Shimmer Position
        const glare = document.querySelector('.holo-glare');
        const shimmer = document.querySelector('.holo-shimmer');
        if (glare) glare.style.transform = `translate(${x}px, ${y}px)`;
        if (shimmer) shimmer.style.backgroundPosition = `${x/5}% ${y/5}%`; // Parallax feel
        
        card.classList.add('active');
    });

    container.addEventListener('mouseleave', () => {
        if(card.classList.contains('capturing')) return;
        card.style.transform = 'rotateX(0) rotateY(0)';
        card.classList.remove('active');
    });

    // Theme Picker Logic
    const swatches = document.querySelectorAll('.holo-swatch');
    swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
             // Visual Active State
             swatches.forEach(s => s.classList.remove('active'));
             swatch.classList.add('active');
             
             // Apply Theme Class
             const color = swatch.dataset.color;
             card.classList.remove('theme-green', 'theme-gold', 'theme-red', 'theme-blue'); // Clear previous
             if (color !== 'purple') { // Default has no class
                 card.classList.add(`theme-${color}`);
             }
        });
    });

    // Download Handler
    const downloadBtn = document.getElementById('btn-download-holo');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadHoloCard);
    }
}

function downloadHoloCard() {
    const card = document.getElementById('holo-card');
    if (!card) return;

    // Load html2canvas if needed
    if (typeof html2canvas === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = () => captureCard(card);
        document.head.appendChild(script);
    } else {
        captureCard(card);
    }

    function captureCard(element) {
         element.classList.add('capturing'); // Remove 3D transforms
         
         // Force solid background for capture
         const originalRadius = element.style.borderRadius;
         element.style.borderRadius = '0'; // Sharp corners specifically for image? Or keep rounded. Let's keep rounded.
         element.style.borderRadius = originalRadius;

         html2canvas(element, {
             backgroundColor: '#050505', // FORCE DARK BACKGROUND
             scale: 3, // Higher resolution
             useCORS: true, 
             logging: false,
             allowTaint: true
         }).then(canvas => {
             const link = document.createElement('a');
             link.download = `MNXMN-Member-Card-${Date.now()}.png`;
             link.href = canvas.toDataURL('image/png', 1.0); // Max quality
             link.click();
             
             // CLEANUP
             element.classList.remove('capturing');
         }).catch(err => {
             console.error('Capture failed:', err);
             element.classList.remove('capturing');
         });
    }
}

function updateHoloCard(user) {
    const section = document.querySelector('.holo-section');
    const card = document.getElementById('holo-card');
    const downloadBtn = document.getElementById('btn-download-holo');
    
    if (!section || !card) return;

    // Show section
    section.style.display = 'block';

    if (!user || (!user.isMember && !user.roles?.includes('MNXMN'))) { // Robust check
        // Locked State
        card.classList.add('locked');
        if(downloadBtn) downloadBtn.style.display = 'none'; 
        
        const isGuest = !user;
        const lockBtn = document.getElementById('holo-lock-action');
        
        // 1. GUEST STATE (Not Logged In)
        if (isGuest) {
            if(lockBtn) {
                lockBtn.innerText = "LOGIN TO CREATE";
                lockBtn.href = "/api/auth/login";
                lockBtn.target = "_self";
            }
            document.getElementById('holo-username').innerText = 'GUEST USER';
            document.getElementById('holo-id').innerText = '0000-0000';
            document.getElementById('holo-role').innerText = 'NOT VERIFIED';
            document.getElementById('holo-role').style.color = '#888';
            document.querySelector('.holo-avatar-ring').style.background = '#333';
             if(document.getElementById('holo-avatar-img')) {
                document.getElementById('holo-avatar-img').src = 'https://cdn.discordapp.com/embed/avatars/0.png';
             }
        } 
        // 2. LOGGED IN BUT NOT MEMBER (Preview Mode)
        else {
            if(lockBtn) {
                lockBtn.innerText = "JOIN TO UNLOCK";
                lockBtn.href = "https://discord.gg/mnxmn";
                lockBtn.target = "_blank";
            }
             document.getElementById('holo-username').innerText = user.username.toUpperCase();
             document.getElementById('holo-id').innerText = (user.id.slice(0,4) + '-' + user.id.slice(-4));
             document.getElementById('holo-role').innerText = 'FUTURE MEMBER';
             document.getElementById('holo-role').style.color = '#8b5cf6'; // Purple hint
             
             document.querySelector('.holo-avatar-ring').style.background = '#333';
             if(document.getElementById('holo-avatar-img')) {
                document.getElementById('holo-avatar-img').src = user.avatar ? `${user.avatar}?not-cache` : 'https://cdn.discordapp.com/embed/avatars/0.png';
             }
        }

        // Common for both locked states
        const batchEl = document.querySelector('.holo-batch');
        if(batchEl) batchEl.innerText = 'BATCH ' + new Date().getFullYear();
            
        return;
    }

    // Unlocked State (Member)
    card.classList.remove('locked');
    if(downloadBtn) downloadBtn.style.display = 'flex';

    try {
        if(document.getElementById('holo-username')) {
            document.getElementById('holo-username').innerText = user.username.toUpperCase();
            
            // Format ID: first 4 - last 4 (e.g., 6140-2242)
            const shortId = user.id.slice(0,4) + '-' + user.id.slice(-4);
            document.getElementById('holo-id').innerText = shortId;

            // Role
            const topRole = user.topRole;
            const roleEl = document.getElementById('holo-role');
            roleEl.innerText = topRole ? topRole.name.toUpperCase() : 'MEMBER';
            roleEl.style.color = topRole ? topRole.color : 'white';
            
            // Avatar Ring Color
            document.querySelector('.holo-avatar-ring').style.background = `linear-gradient(45deg, ${topRole ? topRole.color : '#8b5cf6'}, #ffffff)`;

            // Batch Year
            const batchEl = document.querySelector('.holo-batch');
            if (batchEl) {
                if (user.joined_at) {
                    const year = new Date(user.joined_at).getFullYear();
                    batchEl.innerText = `BATCH ${year}`;
                } else {
                    // Fallback if data missing (e.g. old cache)
                    batchEl.innerText = `BATCH ${new Date().getFullYear()}`; 
                }
            }

            // Avatar
            const avatarEl = document.getElementById('holo-avatar-img');
            if (user.avatar) {
                avatarEl.src = user.avatar;
            } else {
                avatarEl.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
            }
        }
    } catch(e) { console.error('Holo update error', e); }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initHoloCard);
// Global reference for auth callback
window.updateHoloCard = updateHoloCard;
