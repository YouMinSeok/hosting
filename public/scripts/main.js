document.addEventListener('DOMContentLoaded', function() {
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

    function hideUserNav() {
        if (document.getElementById('loginButton')) {
            document.getElementById('loginButton').style.display = 'block';
        }
        if (document.getElementById('registerButton')) {
            document.getElementById('registerButton').style.display = 'block';
        }
        if (document.querySelector('.profile-info')) {
            document.querySelector('.profile-info').style.display = 'none';
        }
        if (document.getElementById('logoutButton')) {
            document.getElementById('logoutButton').style.display = 'none';
        }
    }

    const params = new URLSearchParams(window.location.search);
    const nickname = params.get('nickname');
    const avatarUrl = params.get('avatarUrl');

    if (nickname && avatarUrl) {
        sessionStorage.setItem('nickname', nickname);
        sessionStorage.setItem('avatarUrl', avatarUrl);
        window.location.search = ''; // Remove query params from URL
    }

    const sessionNickname = sessionStorage.getItem('nickname');
    const sessionAvatarUrl = sessionStorage.getItem('avatarUrl');

    if (sessionNickname && sessionAvatarUrl) {
        showUserNav(sessionNickname, sessionAvatarUrl);
    } else {
        const accessToken = getCookie('accessToken');
        if (accessToken) {
            updateUserNavbarFromToken(accessToken);
        } else {
            hideUserNav();
        }
    }

    if (document.getElementById('logoutButton')) {
        document.getElementById('logoutButton').addEventListener('click', function(event) {
            event.preventDefault();
            fetch('/logout', { method: 'GET' })
                .then(() => {
                    sessionStorage.clear(); // Clear session storage
                    hideUserNav(); // Reset user info
                    window.location.href = '/login'; // Redirect to login page
                })
                .catch(error => console.error('Logout error:', error));
        });
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    async function updateUserNavbarFromToken(token) {
        try {
            const response = await fetch('/verify-token', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const user = data.payload;
                sessionStorage.setItem('nickname', user.nickname);
                sessionStorage.setItem('avatarUrl', user.avatarUrl || '/uploads/default-avatar.png');
                showUserNav(user.nickname, user.avatarUrl || '/uploads/default-avatar.png');
            } else {
                console.error('Token validation failed:', response.statusText);
            }
        } catch (error) {
            console.error('Token validation error:', error);
        }
    }

    // Listen for custom event to update user nav
    window.addEventListener('updateUserNav', (event) => {
        const { nickname, avatarUrl } = event.detail;
        sessionStorage.setItem('nickname', nickname);
        sessionStorage.setItem('avatarUrl', avatarUrl);
        showUserNav(nickname, avatarUrl);
    });

    let slideIndex = 0;

    function showSlides() {
        const slides = document.querySelectorAll('.hero-slide');
        slides.forEach(slide => slide.style.display = 'none');
        slideIndex++;
        if (slideIndex > slides.length) {slideIndex = 1}
        slides[slideIndex-1].style.display = 'block';
        setTimeout(showSlides, 4000); // 4초마다 슬라이드 변경
    }

    function plusSlides(n) {
        const slides = document.querySelectorAll('.hero-slide');
        slides[slideIndex-1].style.display = 'none';
        slideIndex += n;
        if (slideIndex > slides.length) {slideIndex = 1}
        if (slideIndex < 1) {slideIndex = slides.length}
        slides[slideIndex-1].style.display = 'block';
    }

    showSlides();

    document.querySelector('.slide-btn.left').addEventListener('click', () => plusSlides(-1));
    document.querySelector('.slide-btn.right').addEventListener('click', () => plusSlides(1));
});
