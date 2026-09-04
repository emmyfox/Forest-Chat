const chatContainer = document.getElementById('chat-container');

const pastelColors = [
    '#E2D9F3', // Soft Lavender
    '#D9ECF3', // Soft Sky Blue
    '#F9D9EC', // Soft Pink
    '#FCF6BD'  // Soft Butter Yellow
];
let colorIndex = 0;

const flowerIcons = ['🌸', '🌺', '🌼', '🌷', '🌻', '🌹'];
let flowerIndex = 0;

const standardAnimals = [
    'bear.png',
    'cat.png',
    'deer.png',
    'dog.png',
    'duck.png',
    'mouse.png',
    'squirrel.png',
    'turtle.png'
];
let animalIndex = 0;
let sideCounter = 0;

let extensionEmotes = {};

// Preload 7TV and BetterTTV emotes for your channel instantly
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
        console.log("Extension emotes loading error (will use native chat)");
    }
}

loadExtensionEmotes();

function addMessage(username, message, nativeEmotes) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');

    // Alternates sides correctly every message
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

    const bubbleDiv = document.createElement('div');
    bubbleDiv.classList.add('bubble');
    bubbleDiv.style.backgroundColor = pastelColors[colorIndex];
    colorIndex = (colorIndex + 1) % pastelColors.length;

    const headerDiv = document.createElement('div');
    headerDiv.classList.add('username-header');

    const iconSpan = document.createElement('span');
    iconSpan.classList.add('username-icon');
    iconSpan.textContent = flowerIcons[flowerIndex];
    flowerIndex = (flowerIndex + 1) % flowerIcons.length;

    const userSpan = document.createElement('span');
    userSpan.textContent = username;

    headerDiv.appendChild(iconSpan);
    headerDiv.appendChild(userSpan);

    const textDiv = document.createElement('div');
    textDiv.classList.add('message-text');
    
    let parsedResult = parseMessageEmotes(message, nativeEmotes);
    textDiv.innerHTML = parsedResult.html;

    // If message is purely emotes, make them larger and center them nicely
    if (parsedResult.isOnlyEmotes) {
        textDiv.querySelectorAll('img').forEach(img => {
            img.style.height = '48px';
            img.style.margin = '0 4px';
            img.style.verticalAlign = 'middle';
        });
    }

    bubbleDiv.appendChild(headerDiv);
    bubbleDiv.appendChild(textDiv);

    messageElement.appendChild(avatarImg);
    messageElement.appendChild(bubbleDiv);
    
    chatContainer.appendChild(messageElement);

    if (chatContainer.children.length > 5) {
        chatContainer.removeChild(chatContainer.children[0]);
    }

    setTimeout(() => {
        messageElement.classList.add('fade-out');
        setTimeout(() => {
            messageElement.remove();
        }, 500);
    }, 75000); 
}

function parseMessageEmotes(message, emotes) {
    let emoteMap = [];

    // Parse native Twitch emotes using reliable CDN v2 endpoints
    if (emotes) {
        for (let id in emotes) {
            let ranges = emotes[id];
            let url = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0`;
            for (let r of ranges) {
                let parts = r.split("-");
                emoteMap.push({
                    start: parseInt(parts[0], 10),
                    end: parseInt(parts[1], 10),
                    html: `<img class="twitch-emote" src="${url}" alt="" style="height:28px; vertical-align:middle; display:inline-block; margin:0 2px;">`
                });
            }
        }
    }

    if (emoteMap.length > 0) {
        emoteMap.sort((a, b) => b.start - a.start);
        let result = message;
        for (let item of emoteMap) {
            result = result.substring(0, item.start) + item.html + result.substring(item.end + 1);
        }
        message = result;
    }

    // Parse words to catch BetterTTV and 7TV emotes
    let words = message.split(" ");
    let emoteCount = 0;
    let wordCount = 0;

    let parsed = words.map(word => {
        if (word.includes("<img")) {
            emoteCount++;
            return word;
        }
        let cleanWord = word.trim();
        if (cleanWord === "") return "";
        
        wordCount++;
        if (extensionEmotes[cleanWord]) {
            emoteCount++;
            return `<img class="twitch-emote" src="${extensionEmotes[cleanWord]}" alt="${escapeHtml(cleanWord)}" style="height:28px; vertical-align:middle; display:inline-block; margin:0 2px;">`;
        }
        return escapeHtml(word);
    });

    let finalHtml = parsed.join(" ");
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
    addMessage(user, message, extra.emotes);
};

ComfyJS.Init("mcdemil");