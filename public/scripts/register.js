document.getElementById('registerForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const nickname = document.getElementById('nickname').value;

    if (password !== confirmPassword) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
    }

    if (password.length < 8 || password.length > 12 || !/^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-zA-Z]).{8,12}$/.test(password)) {
        alert('비밀번호는 8자 이상 12자 이내이어야 하며, 영문자, 숫자, 특수문자를 포함해야 합니다.');
        return;
    }

    const isUsernameValid = await checkUsername();
    const isEmailValid = await checkEmail();
    const isNicknameValid = await checkNickname();

    if (isUsernameValid && isEmailValid && isNicknameValid) {
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.style.display = 'flex';

        setTimeout(async () => {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password, nickname })
            });

            if (response.ok) {
                const responseData = await response.json();
                sessionStorage.setItem('nickname', responseData.nickname);
                sessionStorage.setItem('avatarUrl', responseData.avatarUrl || '/uploads/default-avatar.png');
                document.getElementById('registrationMessage').innerText = responseData.message;

                showUserNav(responseData.nickname, responseData.avatarUrl || '/uploads/default-avatar.png');

                window.location.href = '/';
            } else {
                const errorData = await response.json();
                alert(errorData.message);
            }
        }, 5000);
    } else {
        alert('사용자 이름, 이메일 또는 닉네임이 이미 존재합니다.');
    }
});

async function checkEmail() {
    const email = document.getElementById('email').value;
    const response = await fetch('/check-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
    });
    return response.ok;
}

async function checkUsername() {
    const username = document.getElementById('username').value;
    const response = await fetch('/check-username', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
    });
    return response.ok;
}

async function checkNickname() {
    const nickname = document.getElementById('nickname').value;
    const response = await fetch('/check-nickname', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nickname })
    });
    return response.ok;
}

function showUserNav(nickname, avatarUrl) {
    const navbarNickname = document.getElementById('navbarNickname');
    const navbarAvatar = document.getElementById('navbarAvatar');

    if (navbarNickname && navbarAvatar) {
        navbarNickname.textContent = nickname;
        navbarAvatar.src = avatarUrl;
    }
    if (document.getElementById('loginButton')) {
        document.getElementById('loginButton').style.display = 'none';
    }
    if (document.getElementById('registerButton')) {
        document.getElementById('registerButton').style.display = 'none';
    }
    if (document.querySelector('.profile-info')) {
        document.querySelector('.profile-info').style.display = 'block';
    }
    if (document.getElementById('logoutButton')) {
        document.getElementById('logoutButton').style.display = 'block';
    }
}
