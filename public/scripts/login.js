document.addEventListener('DOMContentLoaded', function() {
    const usernameField = document.getElementById('username');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const loadingScreen = document.getElementById('loadingScreen');

    const loginButton = document.getElementById('loginButton');
    const registerButton = document.getElementById('registerButton');
    const profileInfo = document.querySelector('.profile-info');
    const logoutButton = document.getElementById('logoutButton');

    function showUserNav(nickname, avatarUrl) {
        const navbarNickname = document.getElementById('navbarNickname');
        const navbarAvatar = document.querySelector('.navbar-avatar');
        
        if (navbarNickname && navbarAvatar) {
            navbarNickname.textContent = nickname;
            navbarAvatar.src = avatarUrl;
        }
        if (loginButton) loginButton.style.display = 'none';
        if (registerButton) registerButton.style.display = 'none';
        if (profileInfo) profileInfo.style.display = 'block';
        if (logoutButton) logoutButton.style.display = 'block';
    }

    function hideUserNav() {
        if (loginButton) loginButton.style.display = 'block';
        if (registerButton) registerButton.style.display = 'block';
        if (profileInfo) profileInfo.style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'none';
    }

    // 아이디 기억하기 기능
    if (localStorage.getItem('rememberMe') === 'true') {
        usernameField.value = localStorage.getItem('username');
        rememberMeCheckbox.checked = true;
    }

    // 로그인 페이지에 들어올 때 세션 초기화
    sessionStorage.clear();
    hideUserNav();

    document.getElementById('loginForm').addEventListener('submit', function(event) {
        event.preventDefault();

        const username = usernameField.value;
        const password = document.getElementById('password').value;

        loadingScreen.style.display = 'flex';

        setTimeout(async () => {
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText);
                }

                const data = await response.json();

                if (rememberMeCheckbox.checked) {
                    localStorage.setItem('username', username);
                    localStorage.setItem('rememberMe', 'true');
                } else {
                    localStorage.removeItem('username');
                    localStorage.removeItem('rememberMe');
                }

                sessionStorage.setItem('nickname', data.nickname);
                sessionStorage.setItem('avatarUrl', data.avatarUrl);

                showUserNav(data.nickname, data.avatarUrl);

                window.location.href = '/';
            } catch (error) {
                console.error('로그인 오류:', error);
                alert(error.message);
            } finally {
                loadingScreen.style.display = 'none';
            }
        }, 3000); // 3초 지연 후 서버 요청
    });

    // 간편 로그인 성공 후 리다이렉트 처리
    if (window.location.search.includes('code=')) {
        const params = new URLSearchParams(window.location.search);
        const nickname = params.get('nickname');
        const avatarUrl = params.get('avatarUrl');

        if (nickname && avatarUrl) {
            sessionStorage.setItem('nickname', nickname);
            sessionStorage.setItem('avatarUrl', avatarUrl);
            showUserNav(nickname, avatarUrl);
        }

        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.style.display = 'flex';

        setTimeout(() => {
            window.location.href = '/';
        }, 3000); // 3초 지연 후 메인 페이지로 리다이렉트
    }

    // 간편 로그인 버튼 클릭 시 로딩 스피너 표시
    document.getElementById('googleLoginButton').addEventListener('click', function() {
        loadingScreen.style.display = 'flex';
    });

    // 로그아웃 처리
    if(logoutButton) {
        logoutButton.addEventListener('click', function(event) {
            event.preventDefault();
            fetch('/logout', { method: 'GET' })
                .then(() => {
                    sessionStorage.clear(); // 세션 스토리지 초기화
                    hideUserNav();
                    window.location.href = '/login'; // 로그인 페이지로 리다이렉트
                })
                .catch(error => console.error('Logout error:', error));
        });
    }

    // 페이지 로드 시 사용자 상태 체크
    const nickname = sessionStorage.getItem('nickname');
    const avatarUrl = sessionStorage.getItem('avatarUrl');

    if (nickname && avatarUrl) {
        showUserNav(nickname, avatarUrl);
    } else {
        hideUserNav();
    }
});
