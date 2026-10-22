let popUp = null;

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    popUp = document.getElementById('popUp');
    const openPop = document.getElementById('openPop');

    if (openPop) {
        openPop.addEventListener('click', (e) => {
            e.preventDefault();
            openLoginPopup();
        });
    }

    // Fechar popup ao clicar no overlay
    if (popUp) {
        popUp.addEventListener('click', (e) => {
            if (e.target === popUp) {
                closePopup();
            }
        });
    }

    // Fechar popup com a tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && popUp && popUp.classList.contains('open')) {
            closePopup();
        }
    });

    // Verificar se deve abrir o popup via URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'login') {
        openLoginPopup();
    }
});

function openLoginPopup() {
    if (popUp) {
        popUp.classList.add("open");
        renderLoginForm();
    }
}

function closePopup() {
    if (popUp) {
        popUp.classList.remove("open");
    }
}


function renderLoginForm() {  
    document.querySelector('.login-popup').innerHTML = `
        <form action="/login" method="POST" class="login-popup-content" id="login-form">
                <h1 class="TextoLogin">Entrar</h1>
                <button class="close-popup" id="closePop">X</button>
                <div class="email">
                    <input type="text" placeholder="Tag" name="tag" pattern="[a-zA-Z _.@]+" maxlength="20" required>    
                </div>
                <div class="password">
                    <input type="password" placeholder="Senha" name="password" pattern=".{6,128}" maxlength="40" required>
                </div>
                <div id="login-message" style="color:red;margin-top:8px;"></div>
                <button class="submit" type="submit">Entrar</button>
                <button class="cadastro" id="cadastro-button" type="button">Cadastro</button>

        </form>
    `;
    
    const closeBtn = document.getElementById('closePop');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closePopup();
        });
    }
    
    const cadastroBtn = document.getElementById('cadastro-button');
    if (cadastroBtn) {
        cadastroBtn.addEventListener('click', (e) => {
            e.preventDefault();
            renderCadastroForm();
        });
    }

    document.getElementById('login-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const messageDiv = document.getElementById('login-message');
        messageDiv.textContent = '';
        try {
            const response = await fetch('/login', {
                method: 'POST',
                body: formData
            });
            const text = await response.text();
            if (response.ok) {
                messageDiv.style.color = 'green';
                messageDiv.textContent = 'Login realizado com sucesso!';
             
                setTimeout(() => {
                    window.location.href = '/home';
                }, 1000);
            } else {
                messageDiv.style.color = 'red';
                messageDiv.textContent = text;
            }
        } catch (err) {
            messageDiv.style.color = 'red';
            messageDiv.textContent = 'Erro ao fazer login. Tente novamente.';
        }
    });
}

function renderCadastroForm() {
    document.querySelector('.login-popup').innerHTML = `
        <form action="/cadastro" method="POST" class="login-popup-content" id="cadastro-form">
                <h1 class="TextoLogin">Cadastre-se</h1>
                <button class="close-popup" id="closePop">X</button>
                <div class="tag">
                    <input type="text" placeholder="Tag" name="tag" pattern="[a-zA-Z _.@]+" maxlength="20" required>    
                </div>
                <div class="name">
                    <input type="name" placeholder="Nome" name="name" pattern="[a-zA-Z _.@]+" maxlength="64" required>    
                </div>
                <div class="email">
                    <input type="email" placeholder="Email" name="email" pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$" maxlength="254" required>                </div>
                <div class="password">
                    <input type="password" placeholder="Senha" name="password" pattern=".{6,128}" maxlength="40" required>
                </div>
                <button class="submit" type="submit">Cadastrar</button>
                <div id="cadastro-message" style="color:red;margin-top:8px;"></div>
        </form>
    `;
    
    const closeBtn = document.getElementById('closePop');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closePopup();
        });
    }
    document.getElementById('cadastro-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const messageDiv = document.getElementById('cadastro-message');
        messageDiv.textContent = '';
        try {
            const response = await fetch('/cadastro', {
                method: 'POST',
                body: formData
            });
            const text = await response.text();
            if (response.ok) {
                messageDiv.style.color = 'green';
                messageDiv.textContent = 'Cadastro realizado com sucesso!';
                setTimeout(() => {
                    window.location.href = '/home';
                }, 1000);
            } else {
                messageDiv.style.color = 'red';
                messageDiv.textContent = text;
            }
        } catch (err) {
            messageDiv.style.color = 'red';
            messageDiv.textContent = 'Erro ao cadastrar. Tente novamente.';
        }
    });
}

