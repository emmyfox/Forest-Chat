const chatContainer = document.getElementById('chat-container');

const pastelColors = [
    { bg: '#E2D9F3', border: '#C7B4F0', nameBg: '#F3EFFF', nameBorder: '#D8C7FF' },
    { bg: '#D9ECF3', border: '#B4E0F0', nameBg: '#EFF8FF', nameBorder: '#C7E8FF' },
    { bg: '#F9D9EC', border: '#F2B6DC', nameBg: '#FFF2FA', nameBorder: '#FFD1ED' },
    { bg: '#FCF6BD', border: '#F7EC85', nameBg: '#FFFAEA', nameBorder: '#F9F1A5' }
];
let colorIndex = 0;

const standardAnimals = [
    'bear.png', 'cat.png', 'deer.png', 'dog.png', 
    'duck.png', 'mouse.png', 'squirrel.png', 'turtle.png'
];
let animalIndex = 0;
let sideCounter = 0;

let extensionEmotes = {};

// Fetch 7TV and BetterTTV emotes using your numeric Twitch User ID
async function loadExtensionEmotes() {
    try {
        // Step 1: Get your numeric Twitch user ID for 'mcdemil' via Decapi
        let idRes = await fetch('https://decapi.me/twitch/id/mcdemil');
        let twitchId = await idRes.text();
        
        if (!twitchId || twitchId.includes("not found")) return;

        // Step 2: Fetch 7TV emotes using the numeric ID
        let res7tv = await fetch(`https://7tv.io/v3/users/twitch/${twitchId}`);
        let data7tv = await res7tv.json();
        if (data7tv && data7tv.emote_set && data7tv.emote_set.emotes) {
            data7tv.emote_set.emotes.forEach(e => {
                extensionEmotes[e.name] = `https://cdn.7tv.app/emote/${e.id}/2x.webp`;
            });
        }

        // Step 3: Fetch BetterTTV emotes using the numeric ID
        let resBttv = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${twitchId}`);
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
        console.log("Extension emote loader active fallback");
    }
}

loadExtensionEmotes();

function addMessage(username, message, extra) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');

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

    setTimeout(() => {
        messageElement.classList.add('fade-out');
        setTimeout(() => {
            messageElement.remove();
        }, 500);
    }, 45000); 
}

function parseMessageEmotes(message, extra) {
    // ComfyJS provides structured parts in extra.messageParts containing native Twitch emotes and text
    if (extra && extra.messageParts && extra.messageParts.length > 0) {
        let emoteCount = 0;
        let wordCount = 0;

        let partsHtml = extra.messageParts.map(part => {
            if (part.type === 'emote') {
                emoteCount++;
                // Use Twitch's reliable static/animated CDN endpoint
                let url = `https://static-cdn.jtvnw.net/emoticons/v2/${part.value}/animated/dark/3.0`;
                return `<img class="emote" src="${url}" alt="">`;
            } else if (part.type === 'text') {
                // Check words inside text parts for BetterTTV / 7TV codes
                let words = part.value.split(" ");
                let parsedWords = words.map(word => {
                    let cleanWord = word.trim();
                    if (cleanWord === "") return "";
                    
                    if (extensionEmotes[cleanWord]) {
                        emoteCount++;
                        return `<img class="emote" src="${extensionEmotes[cleanWord]}" alt="${escapeHtml(cleanWord)}">`;
                    }
                    wordCount++;
                    return escapeHtml(word);
                });
                return parsedWords.join(" ");
            }
            return "";
        });

        let finalHtml = partsHtml.join("");
        let isOnlyEmotes = (emoteCount > 0 && wordCount === 0);

        return {
            html: finalHtml,
            isOnlyEmotes: isOnlyEmotes
        };
    }

    // Fallback parser if messageParts aren't present
    let tokens = message.split(" ");
    let emoteCount = 0;
    let wordCount = 0;

    let parsedTokens = tokens.map(token => {
        let cleanToken = token.trim();
        if (cleanToken === "") return "";

        wordCount++;
        if (extensionEmotes[cleanToken]) {
            emoteCount++;
            return `<img class="emote" src="${extensionEmotes[cleanToken]}" alt="${escapeHtml(cleanToken)}">`;
        }
        return escapeHtml(token);
    });

    return {
        html: parsedTokens.join(" "),
        isOnlyEmotes: (emoteCount > 0 && wordCount === 0)
    };
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

ComfyJS.onChat = (user, message, flags, self, extra) => {
    addMessage(user, message, extra);
};

ComfyJS.Init("mcdemil");