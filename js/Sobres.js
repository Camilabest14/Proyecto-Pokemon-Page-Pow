// Cargar el footer
fetch('components/Footer.html')
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