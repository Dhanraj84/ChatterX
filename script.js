// public/script.js
document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    let currentUsername = '';
    let isTyping = false;
    let typingTimeout;
    
    // DOM elements
    const messages = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const userList = document.getElementById('userList');
    const userCount = document.getElementById('userCount');
    const typingIndicator = document.getElementById('typingIndicator');
    const usernameModal = document.getElementById('usernameModal');
    const usernameInput = document.getElementById('usernameInput');
    const joinButton = document.getElementById('joinButton');
    const usernameError = document.getElementById('usernameError');
    const themeToggle = document.getElementById('themeToggle');
    const emojiButton = document.getElementById('emojiButton');
    const messageType = document.getElementById('messageType');
    const recipientSelect = document.getElementById('recipientSelect');
    
    // Show username modal
    usernameModal.style.display = 'flex';
    
    // Load messages from localStorage
    loadMessages();
    
    // Theme toggle
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        document.body.classList.toggle('dark-theme');
        
        const icon = themeToggle.querySelector('i');
        if (document.body.classList.contains('light-theme')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    });
    
    // Message type change
    messageType.addEventListener('change', () => {
        recipientSelect.disabled = messageType.value !== 'private';
    });
    
    // Join chat
    joinButton.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        if (username) {
            socket.emit('set username', username);
        }
    });
    
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const username = usernameInput.value.trim();
            if (username) {
                socket.emit('set username', username);
            }
        }
    });
    
    // Handle username acceptance
    socket.on('username accepted', (username) => {
        currentUsername = username;
        usernameModal.style.display = 'none';
    });
    
    // Handle username exists
    socket.on('username exists', () => {
        usernameError.textContent = 'Username already taken. Please choose another.';
    });
    
    // Handle user list update
    socket.on('user list', (users) => {
        userList.innerHTML = '';
        users.forEach(user => {
            if (user !== currentUsername) {
                const li = document.createElement('li');
                li.textContent = user;
                li.addEventListener('click', () => {
                    messageType.value = 'private';
                    recipientSelect.value = user;
                    recipientSelect.disabled = false;
                    messageInput.focus();
                });
                userList.appendChild(li);
            }
        });
        
        // Update recipient select
        recipientSelect.innerHTML = '<option value="">Select user</option>';
        users.forEach(user => {
            if (user !== currentUsername) {
                const option = document.createElement('option');
                option.value = user;
                option.textContent = user;
                recipientSelect.appendChild(option);
            }
        });
    });
    
    // Handle user joined notification
    socket.on('user joined', (data) => {
        userCount.textContent = data.userCount;
        addNotification(`${data.username} joined the chat`, data.timestamp);
    });
    
    // Handle user left notification
    socket.on('user left', (data) => {
        userCount.textContent = data.userCount;
        addNotification(`${data.username} left the chat`, data.timestamp);
    });
    
    // Handle chat messages
    socket.on('chat message', (data) => {
        addMessage(data.username, data.message, data.timestamp, data.isPrivate, data.recipient);
        saveMessage(data);
    });
    
    // Handle typing indicator
    socket.on('user typing', (username) => {
        typingIndicator.textContent = `${username} is typing...`;
    });
    
    socket.on('user stopped typing', (username) => {
        if (typingIndicator.textContent.includes(username)) {
            typingIndicator.textContent = '';
        }
    });
    
    // Send message
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Typing detection
    messageInput.addEventListener('input', () => {
        if (!isTyping) {
            isTyping = true;
            socket.emit('typing');
        }
        
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            isTyping = false;
            socket.emit('stopped typing');
        }, 2000);
    });
    
    // Emoji picker (simplified)
    emojiButton.addEventListener('click', () => {
        const emoji = prompt('Enter an emoji');
        if (emoji) {
            messageInput.value += emoji;
            messageInput.focus();
        }
    });
    
    // Functions
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message && currentUsername) {
            const isPrivate = messageType.value === 'private';
            const recipient = isPrivate ? recipientSelect.value : null;
            
            if (isPrivate && !recipient) {
                alert('Please select a recipient for private messages');
                return;
            }
            
            const messageData = {
                text: twemoji.parse(message),
                isPrivate: isPrivate,
                recipient: recipient
            };
            
            socket.emit('chat message', messageData);
            messageInput.value = '';
            
            // Clear typing indicator
            if (isTyping) {
                isTyping = false;
                socket.emit('stopped typing');
                clearTimeout(typingTimeout);
            }
        }
    }
    
    function addMessage(username, message, timestamp, isPrivate = false, recipient = null) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        
        if (username === currentUsername) {
            messageDiv.classList.add('sent');
        } else {
            messageDiv.classList.add('received');
        }
        
        if (isPrivate) {
            messageDiv.classList.add('private');
        }
        
        const header = document.createElement('div');
        header.classList.add('message-header');
        
        const usernameSpan = document.createElement('span');
        usernameSpan.textContent = username;
        
        const timestampSpan = document.createElement('span');
        timestampSpan.textContent = timestamp;
        
        header.appendChild(usernameSpan);
        header.appendChild(timestampSpan);
        
        const content = document.createElement('div');
        content.classList.add('message-content');
        content.innerHTML = twemoji.parse(message);
        
        if (isPrivate) {
            const privateLabel = document.createElement('div');
            privateLabel.classList.add('private-label');
            if (username === currentUsername) {
                privateLabel.textContent = `Private to ${recipient}`;
            } else {
                privateLabel.textContent = `Private from ${username}`;
            }
            messageDiv.appendChild(privateLabel);
        }
        
        messageDiv.appendChild(header);
        messageDiv.appendChild(content);
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
    }
    
    function addNotification(text, timestamp) {
        const notificationDiv = document.createElement('div');
        notificationDiv.classList.add('message', 'notification');
        
        const content = document.createElement('div');
        content.classList.add('message-content');
        content.textContent = text;
        
        const timestampSpan = document.createElement('span');
        timestampSpan.textContent = timestamp;
        timestampSpan.style.display = 'block';
        timestampSpan.style.fontSize = '0.8rem';
        timestampSpan.style.textAlign = 'center';
        
        notificationDiv.appendChild(content);
        notificationDiv.appendChild(timestampSpan);
        messages.appendChild(notificationDiv);
        messages.scrollTop = messages.scrollHeight;
    }
    
    function saveMessage(data) {
        const messages = JSON.parse(localStorage.getItem('chatMessages') || []);
        messages.push(data);
        localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
    
    function loadMessages() {
        const savedMessages = JSON.parse(localStorage.getItem('chatMessages')) || [];
        savedMessages.forEach(msg => {
            addMessage(msg.username, msg.message, msg.timestamp, msg.isPrivate, msg.recipient);
        });
    }
});