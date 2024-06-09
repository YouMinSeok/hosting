document.addEventListener("DOMContentLoaded", function() {
    var tabButtons = document.querySelectorAll(".tab-btn");
    var tabContents = document.querySelectorAll(".tab-content");
    var consoleInput = document.getElementById('consoleInput');

    tabButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            tabButtons.forEach(function(btn) {
                btn.classList.remove("active");
            });
            tabContents.forEach(function(content) {
                content.classList.remove("active");
            });

            button.classList.add("active");
            var tabId = button.getAttribute("onclick").split("'")[1];
            document.getElementById(tabId).classList.add("active");
        });
    });

    // 아바타 변경
    document.getElementById("avatarInput").addEventListener("change", function(event) {
        var reader = new FileReader();
        reader.onload = function() {
            var avatarImage = document.getElementById("avatarImage");
            avatarImage.src = reader.result;
        };
        reader.readAsDataURL(event.target.files[0]);
    });

    // 초기 상태 설정
    const nicknameInput = document.getElementById('nicknameInput');
    const nicknameDisplay = document.getElementById('nicknameDisplayText');
    if (nicknameInput && nicknameDisplay) {
        nicknameInput.value = nicknameDisplay.textContent;
    }

    // 페이지 로드 시 로컬 스토리지에서 테마를 불러와 적용
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme) {
        applyTheme(savedTheme);
    }

    // 콘솔 입력 감지
    if (consoleInput) {
        consoleInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                handleConsoleCommand(consoleInput.value);
                consoleInput.value = '';
            }
        });
    }
});

async function handleConsoleCommand(command) {
    if (command === '/clear all') {
        try {
            const response = await fetch('/clear-activity-log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const activityLog = document.querySelector('.activity-log');
                while (activityLog.firstChild) {
                    activityLog.removeChild(activityLog.firstChild);
                }
                displayActivityNotification('모든 활동 내역이 삭제되었습니다.');
            } else {
                displayActivityNotification('활동 내역 삭제 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('Error clearing activity log:', error);
            displayActivityNotification('활동 내역 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    }
}

function displayActivityNotification(message) {
    const activityLog = document.querySelector('.activity-log');
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    activityLog.appendChild(notification);

    // 알림 메시지를 서서히 보이게 함
    setTimeout(() => {
        notification.style.opacity = 1;
    }, 10);

    // 2초 후에 알림 메시지를 서서히 사라지게 함
    setTimeout(() => {
        notification.style.opacity = 0;
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 2000);
}

function showNicknameInput() {
    const nicknameDisplay = document.getElementById('nicknameDisplayText');
    const nicknameInputGroup = document.getElementById('nicknameInputGroup');
    const initialNickname = document.getElementById('initialNickname');

    // 기존 닉네임 텍스트 숨기기
    if (nicknameDisplay) nicknameDisplay.style.display = 'none';
    if (initialNickname) initialNickname.style.display = 'none';

    // 닉네임 입력 필드 보이기
    if (nicknameInputGroup) nicknameInputGroup.style.display = 'flex';

    // 닉네임 변경 버튼 숨기기
    document.querySelector('.change-nickname-btn').style.display = 'none';

    // 중복 확인 버튼 보이기
    document.querySelector('.check-nickname-btn').style.display = 'inline-block';
}

async function checkNickname() {
    const newNickname = document.getElementById('nicknameInput').value;
    const currentNickname = document.getElementById('nicknameDisplayText').textContent;

    try {
        const response = await fetch('/check-nickname', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nickname: newNickname, currentNickname })
        });

        const data = await response.json();

        if (response.ok) {
            alert('사용 가능한 닉네임입니다.');
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error checking nickname:', error);
        alert('닉네임 중복 확인 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

async function saveProfile() {
    const formData = new FormData();
    const avatarFile = document.getElementById('avatarInput').files[0];
    const userId = document.getElementById('userId').value;
    const newNickname = document.getElementById('nicknameInput').value;
    const selectedTheme = localStorage.getItem('selectedTheme'); // 로컬 스토리지에서 선택된 테마 가져오기

    if (avatarFile) {
        formData.append('avatar', avatarFile);
    }

    formData.append('userId', userId);
    formData.append('nickname', newNickname);
    formData.append('selectedTheme', selectedTheme);  // 선택된 테마 추가

    try {
        const response = await fetch('/update', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('nicknameDisplayText').textContent = data.nickname;
            document.getElementById('nicknameInput').value = data.nickname;
            document.getElementById('navbarNickname').textContent = data.nickname;
            document.getElementById('welcomeMessage').textContent = `${data.nickname}님, 환영합니다!`;
            if (data.avatar) {
                document.getElementById('avatarImage').src = data.avatar;
                const navbarAvatar = document.querySelector('.navbar-avatar');
                if (navbarAvatar) {
                    navbarAvatar.src = data.avatar;
                }
                // 프로필 업데이트 시 이벤트 발생
                const updateUserNavEvent = new CustomEvent('updateUserNav', {
                    detail: {
                        nickname: data.nickname,
                        avatarUrl: data.avatar
                    }
                });
                window.dispatchEvent(updateUserNavEvent);

                // Socket.io를 사용하여 프로필 업데이트 이벤트 전송
                if (window.socket) { // socket이 정의되어 있는지 확인
                    window.socket.emit('profileUpdated', { userId: userId, avatarUrl: data.avatar });
                } else {
                    console.error('Socket is not defined');
                }
            }
            sessionStorage.setItem('nickname', data.nickname);
            sessionStorage.setItem('avatarUrl', data.avatar);

            // 닉네임 필드 숨기고 텍스트로 다시 표시
            document.getElementById('nicknameInputGroup').style.display = 'none';
            document.getElementById('nicknameDisplayText').style.display = 'inline';
            document.querySelector('.change-nickname-btn').style.display = 'inline-block';
            document.querySelector('.check-nickname-btn').style.display = 'none';

            alert('프로필이 성공적으로 저장되었습니다.');
        } else {
            // 닉네임 변경에 실패한 경우, 입력 필드를 초기 상태로 되돌림
            const currentNickname = document.getElementById('nicknameDisplayText').textContent;
            document.getElementById('nicknameInput').value = currentNickname;
            document.getElementById('nicknameInputGroup').style.display = 'none';
            document.getElementById('nicknameDisplayText').style.display = 'inline';
            document.querySelector('.change-nickname-btn').style.display = 'inline-block';
            document.querySelector('.check-nickname-btn').style.display = 'none';

            alert(data.message);
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('프로필 업데이트 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

function openTab(evt, tabName) {
    var i, tabcontent, tabbtn;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tabbtn = document.getElementsByClassName("tab-btn");
    for (i = 0; i < tabbtn.length; i++) {
        tabbtn[i].className = tabbtn[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

// Default open tab
document.getElementById("basic-info").style.display = "block";
document.querySelector(".tab-btn").classList.add("active");

// 테마 설정
function setTheme(themeName) {
    document.body.className = 'profile-page ' + themeName;
    applyTheme(themeName);
}

function applyTheme(themeName) {
    document.body.className = 'profile-page ' + themeName;
    localStorage.setItem('selectedTheme', themeName);
}

// 클립보드에 복사하는 함수 추가
function copyToClipboard(text, button) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    button.textContent = '복사되었습니다';
    setTimeout(() => {
        button.textContent = '복사하기';
    }, 2000);
}
