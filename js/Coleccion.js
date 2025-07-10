// Datos globales
let allPokemon = [];
let filteredPokemon = [];

let unlockedPokemon = getUnlockedPokemonFromStorage();

function getUnlockedPokemonFromStorage() {
    try {
        const data = localStorage.getItem('unlockedPokemon');
        return data ? JSON.parse(data) : [];
    } catch (e) {
        showError('Error accediendo a tus cartas guardadas.');
        console.error('Error localStorage:', e);
        return [];
    }
}

function setUnlockedPokemonToStorage(ids) {
    try {
        localStorage.setItem('unlockedPokemon', JSON.stringify(ids));
    } catch (e) {
        showError('Error guardando tus cartas.');
        console.error('Error localStorage:', e);
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoading();
        await loadPokemonData();
        renderPokemonGrid();
        setupEventListeners();
        hideLoading();
        await populateTypeFilter();
    } catch (e) {
        showError('Error inicializando la colección.');
        console.error('Error inicialización:', e);
        hideLoading();
    }

    fetch('../components/Footer.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer').innerHTML = data;
        })
        .catch(e => {
            console.error('Error cargando el footer:', e);
        });
});

// Cargar datos de Pokémon (optimizado)
async function loadPokemonData() {
    try {
        // Cargar lista básica de 150 Pokémon
        const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=150');
        if (!response.ok) throw new Error('No se pudo obtener la lista de Pokémon');
        const data = await response.json();

        allPokemon = data.results.map((pokemon, index) => ({
            id: index + 1,
            name: pokemon.name,
            url: pokemon.url,
            isUnlocked: unlockedPokemon.includes(index + 1)
        }));

        filteredPokemon = [...allPokemon];
    } catch (error) {
        console.error('Error cargando Pokémon:', error);
        showError('Error cargando los datos. Verifica tu conexión.');
    }
}

// Renderizar grid
function renderPokemonGrid() {
    const grid = document.getElementById('pokemonGrid');
    if (!grid) {
        showError('No se encontró el grid de Pokémon.');
        return;
    }
    grid.innerHTML = '';

    filteredPokemon.forEach(pokemon => {
        const card = createPokemonCard(pokemon);
        grid.appendChild(card);
    });
}

// Crear carta individual
function createPokemonCard(pokemon) {
    const card = document.createElement('div');
    card.className = `pokemon-card ${pokemon.isUnlocked ? 'unlocked' : 'locked'}`;
    card.dataset.pokemonId = pokemon.id;

    if (pokemon.isUnlocked) {
        card.innerHTML = `
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png" 
                 alt="${pokemon.name}" loading="lazy">
            <div class="name">${pokemon.name}</div>
        `;
        card.addEventListener('click', () => openPokemonModal(pokemon.id));
    } else {
        card.innerHTML = `
            <div class="locked-icon">🔒</div>
            <div class="name">???</div>
        `;
    }

    return card;
}

// Abrir modal con detalles
async function openPokemonModal(pokemonId) {
    const modal = document.getElementById('pokemonModal');
    const modalBody = document.getElementById('modalBody');

    modal.classList.remove('hidden');
    modalBody.innerHTML = '<div class="loading">Cargando...</div>';

    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
        if (!response.ok) throw new Error('No se pudo obtener el Pokémon');
        const pokemon = await response.json();

        // stats en ES
        const statNamesES = {};
        await Promise.all(
            pokemon.stats.map(async statObj => {
                const statRes = await fetch(statObj.stat.url);
                if (!statRes.ok) throw new Error('No se pudo obtener la estadística');
                const statData = await statRes.json();
                const esNameObj = statData.names.find(n => n.language.name === "es");
                statNamesES[statObj.stat.name] = esNameObj ? esNameObj.name : statObj.stat.name;
            })
        );

        modalBody.innerHTML = `
            <div class="pokemon-detail">
                <img src="${pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}" 
                     alt="${pokemon.name}">
                <h2>${pokemon.name}</h2>
                
                <div class="pokemon-types">
                    ${pokemon.types.map(type => 
                        `<span class="type-badge type-${type.type.name}">${type.type.name}</span>`
                    ).join('')}
                </div>
                
                <div class="pokemon-stats">
                    <h3>Estadísticas Base:</h3>
                    ${pokemon.stats.map(stat => `
                        <div class="stat-item">
                            <span>${statNamesES[stat.stat.name]}:</span>
                            <strong>${stat.base_stat}</strong>
                        </div>
                    `).join('')}
                </div>
                
                <p><strong>Altura:</strong> ${pokemon.height / 10} m</p>
                <p><strong>Peso:</strong> ${pokemon.weight / 10} kg</p>
            </div>
        `;
    } catch (error) {
        modalBody.innerHTML = '<div class="error">Error cargando detalles</div>';
        showError('No se pudieron cargar los detalles del Pokémon.');
        console.error('Error cargando detalles del Pokémon:', error);
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Filtro por nombre
    document.getElementById('nameFilter').addEventListener('input', (e) => {
        filterPokemon(e.target.value, document.getElementById('typeFilter').value);
    });

    // Filtro por tipo
    document.getElementById('typeFilter').addEventListener('change', (e) => {
        filterPokemon(document.getElementById('nameFilter').value, e.target.value);
    });

    // Cerrar modal
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('pokemonModal').addEventListener('click', (e) => {
        if (e.target.id === 'pokemonModal') closeModal();
    });

    // Cerrar modal con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// Filtrar Pokémon (VERSIÓN MEJORADA)
async function filterPokemon(nameQuery, typeQuery) {
    showLoading();

    if (!typeQuery) {
        // Solo filtro por nombre
        filteredPokemon = allPokemon.filter(pokemon =>
            pokemon.name.toLowerCase().includes(nameQuery.toLowerCase())
        );
    } else {
        // Necesitamos cargar los tipos para cada Pokémon
        filteredPokemon = [];

        for (const pokemon of allPokemon) {
            if (!pokemon.name.toLowerCase().includes(nameQuery.toLowerCase())) {
                continue;
            }

            try {
                const response = await fetch(pokemon.url);
                if (!response.ok) throw new Error('No se pudo obtener el Pokémon');
                const data = await response.json();
                const types = data.types.map(t => t.type.name);

                if (types.includes(typeQuery)) {
                    filteredPokemon.push({
                        ...pokemon,
                        types: types // Guardamos los tipos para futuras consultas
                    });
                }
            } catch (error) {
                console.error(`Error cargando ${pokemon.name}:`, error);
            }
        }
    }

    renderPokemonGrid();
    hideLoading();
}

// Cerrar modal
function closeModal() {
    document.getElementById('pokemonModal').classList.add('hidden');
}

// Utilidades
function showLoading() {
    if (!document.getElementById('loading')) {
        document.body.insertAdjacentHTML('beforeend',
            '<div id="loading" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);color:white;display:flex;align-items:center;justify-content:center;z-index:9999;">Cargando Pokémon...</div>'
        );
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.remove();
}

function showError(message) {
    alert(message); // En producción usar algo más elegante
}

// Función para que el Integrante A pueda actualizar cartas desbloqueadas
function updateUnlockedPokemon(newUnlockedIds) {
    unlockedPokemon = newUnlockedIds;
    setUnlockedPokemonToStorage(unlockedPokemon);
    allPokemon.forEach(pokemon => {
        pokemon.isUnlocked = unlockedPokemon.includes(pokemon.id);
    });
    filterPokemon(
        document.getElementById('nameFilter').value,
        document.getElementById('typeFilter').value
    );
}

//fecth de tipos para filtro
async function populateTypeFilter() {
    const select = document.getElementById('typeFilter');
    try {
        const response = await fetch('https://pokeapi.co/api/v2/type');
        if (!response.ok) throw new Error('No se pudo obtener la lista de tipos');
        const data = await response.json();
        const typeResults = data.results;
        for (const type of typeResults) {
            try {
                const typeResponse = await fetch(type.url);
                if (!typeResponse.ok) throw new Error('No se pudo obtener el tipo');
                const typeData = await typeResponse.json();
                const spanishNameObj = typeData.names.find(n => n.language.name === "es");
                const spanishName = spanishNameObj ? spanishNameObj.name : capitalize(type.name);
                const option = document.createElement('option');
                option.value = type.name;
                option.textContent = spanishName;
                select.appendChild(option);
            } catch (error) {
                console.error('Error cargando tipo individual:', error);
            }
        }
    } catch (error) {
        showError('Error cargando los tipos de Pokémon.');
        console.error('Error cargando tipos:', error);
    }
}

// Exponer función globalmente para integración
window.updateUnlockedPokemon = updateUnlockedPokemon;

// Utilidad para capitalizar
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}