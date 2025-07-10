// Cargar el footer
fetch('../components/Footer.html')
    .then(response => response.text())
    .then(data => {
        document.getElementById('footer').innerHTML = data;
    });

// Funciones para LocalStorage
function getUnlockedPokemonFromStorage() {
    const data = localStorage.getItem('unlockedPokemon');
    return data ? JSON.parse(data) : [];
}
function setUnlockedPokemonToStorage(ids) {
    localStorage.setItem('unlockedPokemon', JSON.stringify(ids));
}
function updateUnlockedPokemon(newUnlockedIds) {
    setUnlockedPokemonToStorage(newUnlockedIds);
}
function unlockPokemon(pokemonId) {
    let unlocked = getUnlockedPokemonFromStorage();
    if (!unlocked.includes(pokemonId)) {
        unlocked.push(pokemonId);
        updateUnlockedPokemon(unlocked);
        return true;
    }
    return false;
}

// Evento del botón
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('unlock-btn').addEventListener('click', function() {
        const resultDiv = document.getElementById('result');
        //por ahora, id del pokemon a desbloquear
        if (unlockPokemon(1)) {
            resultDiv.textContent = "¡Bulbasaur desbloqueado!";
        } else {
            resultDiv.textContent = "Bulbasaur ya estaba desbloqueado.";
        }
    });
});

// Bloquear un Pokémon por su ID
function blockPokemon(pokemonId) {
    let unlocked = getUnlockedPokemonFromStorage();
    if (unlocked.includes(pokemonId)) {
        unlocked = unlocked.filter(id => id !== pokemonId);
        updateUnlockedPokemon(unlocked);
        return true;
    }
    return false;
}

// Bloquear todos los Pokémon
function blockAllPokemon() {
    updateUnlockedPokemon([]);
}

// Evento de los botones
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('unlock-btn').addEventListener('click', function() {
        const resultDiv = document.getElementById('result');
        if (unlockPokemon(1)) {
            resultDiv.textContent = "¡Bulbasaur desbloqueado!";
        } else {
            resultDiv.textContent = "Bulbasaur ya estaba desbloqueado.";
        }
    });

    document.getElementById('block-btn').addEventListener('click', function() {
        const resultDiv = document.getElementById('result');
        //por ahora, id del pokemon a bloquear
        if (blockPokemon(1)) {
            resultDiv.textContent = "Bulbasaur ha sido bloqueado.";
        } else {
            resultDiv.textContent = "Bulbasaur ya estaba bloqueado.";
        }
    });

    document.getElementById('block-all-btn').addEventListener('click', function() {
        blockAllPokemon();
        const resultDiv = document.getElementById('result');
        resultDiv.textContent = "¡Todos los Pokémon han sido bloqueados!";
    });
});

// array de IDs válidos (1-150)
const VALID_POKEMON_IDS = Array.from({length: 150}, (_, i) => i + 1);

// Función para obtener 5 IDs aleatorios (pueden ser repetidos)
function getRandomPackIds() {
    const pack = [];
    for (let i = 0; i < 5; i++) {
        const idx = Math.floor(Math.random() * VALID_POKEMON_IDS.length);
        pack.push(VALID_POKEMON_IDS[idx]);
    }
    return pack;
}

// Mostrar cartas boca abajo y manejar el flip
function showPackCards(ids) {
    const row = document.getElementById('cards-row');
    row.innerHTML = '';
    ids.forEach(id => {
        const card = document.createElement('div');
        card.className = 'poke-card';
        card.innerHTML = `<span class="card-back">🃏</span>`;
        card.addEventListener('click', async function handleFlip() {
            // Evitar doble click
            if (card.classList.contains('flipped')) return;
            card.classList.add('flipped');
            // Obtener datos del Pokémon
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
            const poke = await res.json();
            card.innerHTML = `
                <img class="poke-img" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png" alt="${poke.name}">
                <div class="poke-name">${poke.name}</div>
            `;
            card.removeEventListener('click', handleFlip);
        });
        row.appendChild(card);
    });
}

// Evento para abrir el sobre
document.addEventListener('DOMContentLoaded', function() {
    const openBtn = document.getElementById('open-pack-btn');
    openBtn.addEventListener('click', function() {
        const packIds = getRandomPackIds();
        if (packIds.length === 0) {
            document.getElementById('cards-row').innerHTML = '<div style="color:#8c52ff;font-weight:bold;">¡Ya tienes todos los Pokémon desbloqueados!</div>';
            return;
        }
        // Desbloquear los Pokémon del sobre
        const unlocked = getUnlockedPokemonFromStorage();
        const nuevos = [...unlocked, ...packIds];
        updateUnlockedPokemon([...new Set(nuevos)]);
        showPackCards(packIds);
    });
});