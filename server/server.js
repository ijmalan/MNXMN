const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); // Enable JSON body parsing

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const SERVER_ID = '1426635201542623314'; // Configurable

if (!DISCORD_BOT_TOKEN) {
  console.error('ERROR: DISCORD_BOT_TOKEN is missing in .env file');
}

// File-based Cache
const CACHE_FILE = path.join(__dirname, 'discord-cache.json');
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading cache file:', err);
  }
  return { data: null, lastFetch: 0 };
}

function saveCache(data) {
  try {
    const cacheObj = {
      data: data,
      lastFetch: Date.now()
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheObj, null, 2));
  } catch (err) {
    console.error('Error writing cache file:', err);
  }
}

// Endpoint to get detailed stats
app.get('/api/discord-stats', async (req, res) => {
  if (!DISCORD_BOT_TOKEN) {
    return res.status(500).json({ error: 'Server misconfiguration: No Bot Token' });
  }

  const cache = getCache();

  // Check Cache
  if (cache.data && (Date.now() - cache.lastFetch < CACHE_DURATION)) {
    console.log('Serving from cache');
    return res.json(cache.data);
  }

  console.log('Fetching fresh data from Discord...');

  try {
    // 1. Fetch Guild Info (Member count, Boosts, etc.)
    const guildRes = await axios.get(`https://discord.com/api/v10/guilds/${SERVER_ID}?with_counts=true`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
    });

    const guild = guildRes.data;

    // 2. Fetch Roles
    const rolesRes = await axios.get(`https://discord.com/api/v10/guilds/${SERVER_ID}/roles`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
    });
    
    // Sort roles by position (descending) and filter mostly cosmetic ones if needed
    // We'll just return top meaningful roles
    const roles = rolesRes.data
      .filter(r => r.hoist && !r.managed && r.name !== '@everyone') // Only hoisted (displayed separately) roles
      .sort((a, b) => b.position - a.position)
      .map(r => ({
        name: r.name,
        color: r.color !== 0 ? `#${r.color.toString(16).padStart(6, '0')}` : '#99aab5',
        id: r.id
      }));

    // 3. Fetch Widget Data (for Members List)
    let widgetMembers = [];
    try {
      const widgetRes = await axios.get(`https://discord.com/api/guilds/${SERVER_ID}/widget.json`);
      widgetMembers = widgetRes.data.members || [];
    } catch (widgetErr) {
      console.warn('Widget Fetch Error:', widgetErr.message);
      // Non-critical, continue without members
    }

    const responseData = {
      name: guild.name,
      totalMembers: guild.approximate_member_count,
      onlineMembers: guild.approximate_presence_count,
      premiumTier: guild.premium_tier, // Boost Level (0, 1, 2, 3)
      premiumSubscriptionCount: guild.premium_subscription_count, // Number of Boosts
      roles: roles.slice(0, 8), // Limit to top 8 roles to avoid clutter
      members: widgetMembers // Include proxy members
    };

    // Update Cache
    saveCache(responseData);

    res.json(responseData);

  } catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error('Discord API Error:', errorMsg);
    
    // If we have stale cache, serve it on error
    if (cache.data) {
        console.log('Serving stale cache due to API error');
        return res.json(cache.data);
    }
    
    res.status(500).json({ error: 'Failed to fetch Discord data', details: errorMsg });
  }
});

// --- Admin API ---
const CONTENT_FILE = path.join(__dirname, 'content.json');

// Login
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'; // Default fallback
  
  if (password === adminPassword) {
    // Generate a simple token (in real app use JWT)
    res.json({ success: true, token: 'mnxmn-admin-token-secret' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid password' });
  }
});

// Get Content
app.get('/api/content', (req, res) => {
  fs.readFile(CONTENT_FILE, 'utf8', (err, data) => {
    if (err) {
      // If file doesn't exist, return empty content
      if (err.code === 'ENOENT') {
        return res.json({});
      }
      return res.status(500).json({ error: 'Failed to read content' });
    }
    res.json(JSON.parse(data));
  });
});

// Update Content (Protected)
const multer = require('multer');

// Configure Multer for Image Upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save directly to public/gallery or uploads folder served by frontend
    // Assumption: Server is in /server and frontend public is in / (root) or /public
    // Let's modify to save to a relative path that static files can serve, e.g., ../gallery-uploads
    // Or simpler: save to __dirname/uploads and serve it statically
    const uploadPath = path.join(__dirname, '../gallery-uploads');
    if (!fs.existsSync(uploadPath)){
        fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'moment-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images are allowed'));
  }
});

// Update Content (Protected)
app.post('/api/content', (req, res) => {
  const token = req.headers.authorization;
  if (token !== 'Bearer mnxmn-admin-token-secret') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const newContent = req.body;
  
  // Read existing file to preserve other fields if needed, or overwrite strictly
  fs.readFile(CONTENT_FILE, 'utf8', (err, data) => {
      let existingContent = {};
      if(!err) existingContent = JSON.parse(data);
      
      const mergedContent = { ...existingContent, ...newContent };
      
      fs.writeFile(CONTENT_FILE, JSON.stringify(mergedContent, null, 2), (err) => {
        if (err) return res.status(500).json({ error: 'Failed to save content' });
        res.json({ success: true });
      });
  });
});

// Upload Endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  const token = req.headers.authorization;
  // Note: Multer middleware runs before body parsing for auth check if separate, 
  // but header check is sync. We can check here.
  if (token !== 'Bearer mnxmn-admin-token-secret') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Return the path relative to web root
  // Since we save to ../gallery-uploads, we need to serve this folder
  // We'll calculate the public URL
  const publicUrl = '/gallery-uploads/' + req.file.filename;
  res.json({ 
    success: true, 
    filePath: publicUrl 
  });
});

// Serve static files for uploads
app.use('/gallery-uploads', express.static(path.join(__dirname, '../gallery-uploads')));


// --- Events API ---
const EVENTS_FILE = path.join(__dirname, 'events.json');

// Get Events
app.get('/api/events', (req, res) => {
  fs.readFile(EVENTS_FILE, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.json([]);
      }
      return res.status(500).json({ error: 'Failed to read events' });
    }
    // Parse and maybe sort by date?
    try {
        const events = JSON.parse(data);
        // Sort by date ascending
        events.sort((a, b) => new Date(a.date) - new Date(b.date));
        res.json(events);
    } catch(e) {
        res.json([]);
    }
  });
});

// Add/Update Event (Protected)
app.post('/api/events', (req, res) => {
  const token = req.headers.authorization;
  if (token !== 'Bearer mnxmn-admin-token-secret') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const newEvent = req.body;
  if(!newEvent.id) newEvent.id = Date.now().toString(); // Simple ID generation

  fs.readFile(EVENTS_FILE, 'utf8', (err, data) => {
      let events = [];
      if(!err && data) {
          try { events = JSON.parse(data); } catch(e){}
      }
      
      // If it has an ID that exists, update it, else push new
      const index = events.findIndex(e => e.id === newEvent.id);
      if(index >= 0) {
          events[index] = newEvent;
      } else {
          events.push(newEvent);
      }
      
      fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2), (err) => {
        if (err) return res.status(500).json({ error: 'Failed to save events' });
        res.json({ success: true, event: newEvent });
      });
  });
});

// Delete Event (Protected)
app.delete('/api/events/:id', (req, res) => {
  const token = req.headers.authorization;
  if (token !== 'Bearer mnxmn-admin-token-secret') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const eventId = req.params.id;

  fs.readFile(EVENTS_FILE, 'utf8', (err, data) => {
      let events = [];
      if(!err && data) {
          try { events = JSON.parse(data); } catch(e){}
      }
      
      const newEvents = events.filter(e => e.id !== eventId);
      
      fs.writeFile(EVENTS_FILE, JSON.stringify(newEvents, null, 2), (err) => {
        if (err) return res.status(500).json({ error: 'Failed to save events' });
        res.json({ success: true });
      });
  });
});


// --- Discord OAuth2 ---
const CLIENT_ID = process.env.DISCORD_CLIENT_ID ? process.env.DISCORD_CLIENT_ID.trim() : '';
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET ? process.env.DISCORD_CLIENT_SECRET.trim() : '';

// Dynamic Redirect URI based on Environment
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'; // Default to backend port if not set, or 5173 if using Vite proxy. 
// Better default for local dev with Vite:
// If NODE_ENV is production, use process.env.FRONTEND_URL. 
// If dev, default to localhost:3000 (direct) or 5173 (proxy). 
// Let's rely on FRONTEND_URL being set correctly in .env for prod.
// For updated server.js let's verify where FRONTEND_URL is defined. It was defined further down. I'll move it up.

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173'; // Matches Vite default
const REDIRECT_URI = `${BASE_URL}/api/auth/callback`;

console.log('--- OAuth Debug ---');
console.log('CLIENT_ID loaded:', CLIENT_ID ? 'Yes (' + CLIENT_ID.substring(0,4) + '...)' : 'NO');
console.log('CLIENT_SECRET loaded:', CLIENT_SECRET ? 'Yes (Length: ' + CLIENT_SECRET.length + ')' : 'NO');
console.log('REDIRECT_URI:', REDIRECT_URI);
console.log('-------------------');

app.get('/api/auth/login', (req, res) => {
  if (!CLIENT_ID) return res.status(500).send('Server missing DISCORD_CLIENT_ID');
  
  const scope = 'identify guilds';
  const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}`;
  res.redirect(url);
});

app.get('/api/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('No code provided');

  try {
    // 1. Exchange code for token
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token } = tokenRes.data;

    // 2. Get User Info
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    // 3. Get User Membership & Roles in the specific Guild
    // We use Bot Token for this because User Token via OAuth might not have permission to view roles/members
    let topRole = null;
    let isMember = false;
    let joinedAt = null; // New variable

    if (DISCORD_BOT_TOKEN) {
        try {
            console.log(`[Auth] Fetching member ${userRes.data.id} from guild ${SERVER_ID}`);
            
            // Fetch Member Data
            const memberRes = await axios.get(`https://discord.com/api/v10/guilds/${SERVER_ID}/members/${userRes.data.id}`, {
                 headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
            });
            
            isMember = true;
            joinedAt = memberRes.data.joined_at; // Capture date
            
            const memberRoles = memberRes.data.roles; 
            console.log(`[Auth] Member found. Roles: ${memberRoles.length}`);

            // Fetch All Guild Roles
            const rolesRes = await axios.get(`https://discord.com/api/v10/guilds/${SERVER_ID}/roles`, {
                 headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
            });
            const allRoles = rolesRes.data;

            // Filter
            const userRoleObjects = allRoles.filter(r => memberRoles.includes(r.id));
            console.log(`[Auth] Matched ${userRoleObjects.length} role objects.`);
            
            // Sort
            userRoleObjects.sort((a, b) => b.position - a.position);

            if (userRoleObjects.length > 0) {
                const r = userRoleObjects[0];
                topRole = {
                    name: r.name,
                    color: r.color !== 0 ? `#${r.color.toString(16).padStart(6, '0')}` : '#b9bbbe'
                };
                console.log(`[Auth] Top Role determined: ${topRole.name}`);
            } else {
                console.log('[Auth] User has no roles (or only @everyone).');
            }

        } catch(e) { 
             console.error('[Auth] Role Fetch Error:', e.response ? e.response.status : e.message);
             if(e.response && e.response.data) console.error(JSON.stringify(e.response.data));
             
             if(e.response && e.response.status === 404) {
                 isMember = false;
             }
        }
    } else {
        console.log('[Auth] No Bot Token available for role fetch.');
    }

    const userData = {
      id: userRes.data.id,
      username: userRes.data.username,
      avatar: userRes.data.avatar ? `https://cdn.discordapp.com/avatars/${userRes.data.id}/${userRes.data.avatar}.png` : null,
      isMember: isMember,
      joined_at: joinedAt, // Include in payload
      topRole: topRole
    };

    // 4. Redirect to Frontend with Data
    const dataStr = Buffer.from(JSON.stringify(userData)).toString('base64');
    res.redirect(`${BASE_URL}/?auth=${dataStr}`);

  } catch (error) {
    const errorData = error.response ? error.response.data : error.message;
    console.error('OAuth Error Detailed:', JSON.stringify(errorData, null, 2));
    
    // Safely encode error to show on frontend
    const errorMsg = encodeURIComponent(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
    res.redirect(`${BASE_URL}/?auth_error=${errorMsg}`);
  }
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
