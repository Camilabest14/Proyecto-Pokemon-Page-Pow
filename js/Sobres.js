// Cargar dinámicamente el footer desde un componente externo
fetch('../components/Footer.html')
    .then(response => response.text())
    .then(data => {
        document.getElementById('footer').innerHTML = data;
    })
    .catch(e => {
        console.error('Error cargando el footer:', e);
    });

// --- Funciones para gestionar Pokémon desbloqueados en LocalStorage ---

// Obtener los Pokémon desbloqueados desde LocalStorage
function getUnlockedPokemonFromStorage() {
    try {
        const data = localStorage.getItem('unlockedPokemon');
        return data ? JSON.parse(data) : [];
    } catch (e) {
        alert('Error accediendo a tus cartas guardadas.');
        console.error('Error localStorage:', e);
        return [];
    }
}

// Guardar los Pokémon desbloqueados en LocalStorage
function setUnlockedPokemonToStorage(ids) {
    try {
        localStorage.setItem('unlockedPokemon', JSON.stringify(ids));
    } catch (e) {
        alert('Error guardando tus cartas.');
        console.error('Error localStorage:', e);
    }
}

// Actualizar la lista de Pokémon desbloqueados
function updateUnlockedPokemon(newUnlockedIds) {
    setUnlockedPokemonToStorage(newUnlockedIds);
}

// Desbloquear un Pokémon si aún no está en la lista
function unlockPokemon(pokemonId) {
    let unlocked = getUnlockedPokemonFromStorage();
    if (!unlocked.includes(pokemonId)) {
        unlocked.push(pokemonId);
        updateUnlockedPokemon(unlocked);
        return true;
    }
    return false;
}

// --- Utilidades para manejar sobres y cartas ---

// Lista de IDs válidos (1 al 150)
const VALID_POKEMON_IDS = Array.from({ length: 150 }, (_, i) => i + 1);

// Obtener 6 IDs aleatorios para un sobre (pueden repetirse)
function getRandomPackIds() {
    const pack = [];
    for (let i = 0; i < 6; i++) {
        const idx = Math.floor(Math.random() * VALID_POKEMON_IDS.length);
        pack.push(VALID_POKEMON_IDS[idx]);
    }
    return pack;
}

// Mostrar las cartas del sobre y permitir voltearlas
function showPackCards(ids) {
    const row = document.getElementById('cards-row');
    row.innerHTML = ''; // Limpiar las cartas anteriores

    ids.forEach(id => {
        const card = document.createElement('div');
        card.className = 'poke-card';
        card.innerHTML = `<span class="card-back">🃏</span>`; // Mostrar carta boca abajo

        // Evento para voltear la carta
        card.addEventListener('click', async function handleFlip() {
            if (card.classList.contains('flipped')) return; // Evitar doble click
            card.classList.add('flipped');

            try {
                // Obtener datos del Pokémon desde la API
                const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
                if (!res.ok) throw new Error('No se pudo obtener el Pokémon');
                const poke = await res.json();

                // Mostrar la imagen y nombre del Pokémon
                card.innerHTML = `
                    <img class="poke-img" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png" alt="${poke.name}">
                    <div class="poke-name">${poke.name}</div>
                `;
            } catch (e) {
                // Error al cargar la carta
                card.innerHTML = `<div class="poke-name" style="color:red;">Error</div>`;
                alert('Error cargando la carta. Intenta de nuevo.');
                console.error('Error cargando Pokémon:', e);
            }

            // Quitar el evento de click para evitar más flips
            card.removeEventListener('click', handleFlip);
        });

        row.appendChild(card);
    });
}

// --- Evento principal: abrir un sobre ---
document.addEventListener('DOMContentLoaded', function () {
    const openBtn = document.getElementById('open-pack-btn');

    openBtn.addEventListener('click', function () {
        try {
            const packIds = getRandomPackIds();

            if (packIds.length === 0) {
                document.getElementById('cards-row').innerHTML = `
                    <div style="color:#8c52ff;font-weight:bold;">
                        ¡Ya tienes todos los Pokémon desbloqueados!
                    </div>`;
                return;
            }

            // Desbloquear los Pokémon obtenidos en el sobre
            const unlocked = getUnlockedPokemonFromStorage();
            const nuevos = [...unlocked, ...packIds];
            updateUnlockedPokemon([...new Set(nuevos)]); // Evitar duplicados

            // Mostrar las cartas del sobre
            showPackCards(packIds);
        } catch (e) {
            alert('Error abriendo el sobre.');
            console.error('Error al abrir sobre:', e);
        }
    });
});

function showPackCards(ids) {
    const row = document.getElementById('cards-row');
    row.innerHTML = ''; // Limpiar anteriores

    ids.forEach((id, index) => {
        const card = document.createElement('div');
        card.className = 'poke-card';
        card.style.animationDelay = `${index * 0.1}s`; // Retraso progresivo
        card.innerHTML = `<span class="card-back">🃏</span>`;

        card.addEventListener('click', async function handleFlip() {
            if (card.classList.contains('flipped')) return; // Evitar doble click
            card.classList.add('flipped');

            try {
                const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
                if (!res.ok) throw new Error('No se pudo obtener el Pokémon');
                const poke = await res.json();
                card.innerHTML = `
                    <img class="poke-img" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png" alt="${poke.name}">
                    <div class="poke-name">${poke.name}</div>
                `;
            } catch (e) {
                card.innerHTML = `<div class="poke-name" style="color:red;">Error</div>`;
                alert('Error cargando la carta. Intenta de nuevo.');
                console.error('Error cargando Pokémon:', e);
            }

            card.removeEventListener('click', handleFlip);
        });

        row.appendChild(card);
    });
}
