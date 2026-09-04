const chatContainer = document.getElementById('chat-container');

const pastelColors = [
    { bg: '#E2D9F3', border: '#C7B4F0', nameBg: '#F3EFFF', nameBorder: '#D8C7FF' }, // Lavender
    { bg: '#D9ECF3', border: '#B4E0F0', nameBg: '#EFF8FF', nameBorder: '#C7E8FF' }, // Sky Blue
    { bg: '#F9D9EC', border: '#F2B6DC', nameBg: '#FFF2FA', nameBorder: '#FFD1ED' }, // Pink
    { bg: '#FCF6BD', border: '#F7EC85', nameBg: '#FFFAEA', nameBorder: '#F9F1A5' }  // Butter Yellow
];
let colorIndex = 0;

const standardAnimals = [
    'bear.png', 'cat.png', 'deer.png', 'dog.png', 
    'duck.png', 'mouse.png', 'squirrel.png', 'turtle.png'
];
let animalIndex = 0;
let sideCounter = 0;

let extensionEmotes = {};

// Load 7TV and BetterTTV channel emotes dynamically
async function loadExtensionEmotes() {
    try {
        let res7tv = await fetch('https://7tv.io/v3/users/twitch/mcdemil');
        let data7tv = await res7tv.json();
        if (data7tv && data7tv.emote_set && data7tv.emote_set.emotes) {
            data7tv.emote_set.emotes.forEach(e => {
                extensionEmotes[e.name] = `https://cdn.7tv.app/emote/${e.id}/2x.webp`;
            });
        }
        let resBttv = await fetch('https://api.betterttv.net/3/cached/users/twitch/mcdemil');
        let dataBttv = await resBttv.json();
        if (dataBttv) {
            if (dataBttv.channelEmotes) {
                dataBttv.channelEmotes.forEach(e => {
                    extensionEmotes[e.code] = `https://cdn.betterttv.net/emote/${e.id}/2x.png`;
                });
            }
            if (dataBttv.sharedEmotes) {
                dataBttv.sharedEmotes.forEach(e => {
                    extensionEmotes[e.code] = `https://cdn.betterttv.net/emote/${e.id}/2x.png`;
                });
            }
        }
    } catch (e) {
        console.log("Extension emotes loader active fallback");
    }
}

loadExtensionEmotes();

function addMessage(username, message, extra) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');

    // Alternates sides cleanly per message
    if (sideCounter % 2 === 0) {
        messageElement.classList.add('right');
    } else {
        messageElement.classList.add('left');
    }
    sideCounter++;

    const avatarImg = document.createElement('img');
    avatarImg.classList.add('avatar');
    
    const lowerUser = username ? username.toLowerCase() : '';
    if (lowerUser === 'binxycat_') {
        avatarImg.src = 'binxycat_.png';
    } else if (lowerUser === 'mcdemil' || lowerUser.includes('mcdemil')) {
        avatarImg.src = 'mcdemil.png';
    } else {
        avatarImg.src = standardAnimals[animalIndex];
        animalIndex = (animalIndex + 1) % standardAnimals.length;
    }

    avatarImg.onerror = function() {
        avatarImg.style.display = 'none';
    };

    const contentWrap = document.createElement('div');
    contentWrap.classList.add('message-content-wrap');

    const themeColors = pastelColors[colorIndex];
    colorIndex = (colorIndex + 1) % pastelColors.length;

    const namebox = document.createElement('div');
    namebox.classList.add('namebox');
    namebox.style.background = themeColors.nameBg;
    namebox.style.borderColor = themeColors.nameBorder;
    namebox.textContent = username;

    const messagebox = document.createElement('div');
    messagebox.classList.add('messagebox');
    messagebox.style.background = themeColors.bg;
    messagebox.style.borderColor = themeColors.border;

    let parsedResult = parseMessageEmotes(message, extra);
    messagebox.innerHTML = parsedResult.html;

    // Handle large / standalone emote scaling
    if (parsedResult.isOnlyEmotes) {
        messagebox.querySelectorAll('img').forEach(img => {
            img.className = 'large-emote';
        });
    }

    contentWrap.appendChild(namebox);
    contentWrap.appendChild(messagebox);

    messageElement.appendChild(avatarImg);
    messageElement.appendChild(contentWrap);
    
    chatContainer.appendChild(messageElement);

    if (chatContainer.children.length > 6) {
        chatContainer.removeChild(chatContainer.children[0]);
    }

    // Message auto-disappear timer
    setTimeout(() => {
        messageElement.classList.add('fade-out');
        setTimeout(() => {
            messageElement.remove();
        }, 500);
    }, 45000); 
}

function parseMessageEmotes(message, extra) {
    let messageChars = Array.from(message);
    let replacements = [];

    // 1. Native Twitch Emotes (Supports animated WebM/GIF formats seamlessly)
    if (extra && extra.emotes) {
        for (let id in extra.emotes) {
            let ranges = extra.emotes[id];
            let url = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/animated/dark/3.0`;
            for (let r of ranges) {
                let parts = r.split("-");
                let start = parseInt(parts[0], 10);
                let end = parseInt(parts[1], 10);
                replacements.push({
                    start: start,
                    end: end,
                    html: `<img class="emote" src="${url}" alt="">`
                });
            }
        }
    }

    replacements.sort((a, b) => b.start - a.start);
    for (let rep of replacements) {
        messageChars.splice(rep.start, (rep.end - rep.start + 1), rep.html);
    }

    let reconstructed = messageChars.join("");

    // 2. BetterTTV & 7TV Text-to-Image Emote Conversion
    let tokens = reconstructed.split(" ");
    let emoteCount = 0;
    let wordCount = 0;

    let parsedTokens = tokens.map(token => {
        if (token.includes("<img")) {
            emoteCount++;
            return token;
        }
        let cleanToken = token.trim();
        if (cleanToken === "") return "";

        wordCount++;
        if (extensionEmotes[cleanToken]) {
            emoteCount++;
            return `<img class="emote" src="${extensionEmotes[cleanToken]}" alt="${escapeHtml(cleanToken)}">`;
        }
        return escapeHtml(token);
    });

    let finalHtml = parsedTokens.join(" ");
    let isOnlyEmotes = (emoteCount > 0 && wordCount === 0);

    return {
        html: finalHtml,
        isOnlyEmotes: isOnlyEmotes
    };
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

ComfyJS.onChat = (user, message, flags, self, extra) => {
    addMessage(user, message, extra);
};

ComfyJS.Init("mcdemil");