document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN Y ESTADO ---
    const ABLY_API_KEY = 'wYro_w.Fh6czw:uQK_OF4aoqD4zmEd60jSXVJBrSHGXr6irLsleUwgHxM';
    const userId = prompt("Ingresa tu nombre de entrenador:") || `Entrenador_${Math.floor(Math.random() * 1000)}`;
    const ably = new Ably.Realtime(ABLY_API_KEY);
    const channel = ably.channels.get('pokemon-trade-channel');

    let localOffer = { cardIds: [], hasAccepted: false, hasProposed: false };
    let remoteOffer = { cardIds: [], hasAccepted: false, userId: null, hasProposed: false };
    let tradeInProgress = false;

    // --- ELEMENTOS DEL DOM ---
    const ownCardsContainer = document.getElementById('cartas-propias');
    const proposeBtn = document.getElementById('propose-btn');
    const selectionView = document.getElementById('selection-view');
    const confirmationView = document.getElementById('confirmation-view');
    const statusTitle = document.getElementById('trade-status-title');
    const statusSubtitle = document.getElementById('trade-status-subtitle');
    const acceptBtn = document.getElementById('accept-btn');
    const declineBtn = document.getElementById('decline-btn');
    const tradeEventsContainer = document.getElementById('trade-events');
    const modal = document.getElementById('pokemonModal');
    const modalBody = document.getElementById('modalBody');
    const closeModalBtn = document.querySelector('.close');

    // --- FUNCIONES DE LÓGICA ---

    function loadUserCards() {
        const unlockedIds = JSON.parse(localStorage.getItem('unlockedPokemon')) || [];
        ownCardsContainer.innerHTML = '';
        if (unlockedIds.length === 0) {
            ownCardsContainer.innerHTML = '<p>No tienes cartas para intercambiar. ¡Ve a abrir sobres!</p>';
            return;
        }
        unlockedIds.forEach(id => {
            const cardElement = createCardElement(id, false); // Not in confirmation view
            cardElement.addEventListener('click', () => selectCard(id, cardElement));
            ownCardsContainer.appendChild(cardElement);
        });
    }

    function createCardElement(id, isConfirmationCard) {
        const div = document.createElement('div');
        div.className = 'carta';
        div.dataset.id = id;
        div.innerHTML = `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png" alt="Pokémon ${id}"><div class="name">#${id}</div>`;
        if (isConfirmationCard) {
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                openPokemonModal(id);
            });
        }
        return div;
    }

    function selectCard(id, element) {
        const isSelected = element.classList.contains('seleccionada');
        if (!isSelected && localOffer.cardIds.length >= 5) {
            alert('Puedes seleccionar un máximo de 5 cartas.');
            return;
        }
        element.classList.toggle('seleccionada');
        if (element.classList.contains('seleccionada')) {
            localOffer.cardIds.push(id);
        } else {
            localOffer.cardIds = localOffer.cardIds.filter(cardId => cardId !== id);
        }
        proposeBtn.disabled = localOffer.cardIds.length === 0;
    }

    function proposeTrade() {
        if (localOffer.cardIds.length === 0) return;
        localOffer.hasProposed = true;
        channel.publish('propose', { userId, cardIds: localOffer.cardIds });
        statusSubtitle.textContent = '¡Propuesta enviada! Esperando al otro jugador...';
        tradeEventsContainer.innerHTML = `<p><strong>Tú:</strong> Propusiste ${localOffer.cardIds.length} carta(s).</p>`;
        proposeBtn.disabled = true;
        if (remoteOffer.hasProposed) {
            channel.publish('start-confirmation', {});
        }
    }

    function showConfirmationView() {
        selectionView.classList.add('hidden');
        confirmationView.classList.remove('hidden');
        statusTitle.textContent = 'Confirmar Intercambio';
        statusSubtitle.textContent = 'Ambos jugadores deben aceptar para completar el intercambio.';

        document.getElementById('local-user-name').textContent = `Tu Oferta (${userId})`;
        const localCardContainer = document.getElementById('local-offer-card');
        localCardContainer.innerHTML = '';
        localOffer.cardIds.forEach(id => localCardContainer.appendChild(createCardElement(id, true)));

        document.getElementById('remote-user-name').textContent = `Oferta de ${remoteOffer.userId}`;
        const remoteCardContainer = document.getElementById('remote-offer-card');
        remoteCardContainer.innerHTML = '';
        remoteOffer.cardIds.forEach(id => remoteCardContainer.appendChild(createCardElement(id, true)));
    }

    function executeTrade() {
        if (tradeInProgress) return; // Evita la ejecución doble
        tradeInProgress = true;

        let unlockedIds = JSON.parse(localStorage.getItem('unlockedPokemon')) || [];
        unlockedIds = unlockedIds.filter(id => !localOffer.cardIds.includes(id));
        remoteOffer.cardIds.forEach(receivedId => {
            if (!unlockedIds.includes(receivedId)) unlockedIds.push(receivedId);
        });
        localStorage.setItem('unlockedPokemon', JSON.stringify(unlockedIds));
        alert(`¡Intercambio exitoso!`);
        resetTrade();
    }

    function resetTrade() {
        localOffer = { cardIds: [], hasAccepted: false, hasProposed: false };
        remoteOffer = { cardIds: [], hasAccepted: false, userId: null, hasProposed: false };
        tradeInProgress = false;
        selectionView.classList.remove('hidden');
        confirmationView.classList.add('hidden');
        statusTitle.textContent = 'Intercambio Pokémon';
        statusSubtitle.textContent = 'Selecciona hasta 5 cartas para ofrecer.';
        proposeBtn.disabled = true;
        acceptBtn.disabled = false;
        acceptBtn.textContent = 'Aceptar';
        tradeEventsContainer.innerHTML = '<p>Esperando jugadores...</p>';
        loadUserCards();
    }

    // --- LÓGICA DEL MODAL ---
    async function openPokemonModal(pokemonId) {
        modal.classList.remove('hidden');
        modalBody.innerHTML = '<div class="loading">Cargando...</div>';
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
            const pokemon = await response.json();
            const statNamesES = {};
            await Promise.all(
                pokemon.stats.map(async statObj => {
                    const statRes = await fetch(statObj.stat.url);
                    const statData = await statRes.json();
                    const esNameObj = statData.names.find(n => n.language.name === "es");
                    statNamesES[statObj.stat.name] = esNameObj ? esNameObj.name : statObj.stat.name;
                })
            );
            modalBody.innerHTML = `
                <div class="pokemon-detail">
                    <img src="${pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}" alt="${pokemon.name}">
                    <h2>${pokemon.name}</h2>
                    <div class="pokemon-types">${pokemon.types.map(type => `<span class="type-badge type-${type.type.name}">${type.type.name}</span>`).join('')}</div>
                    <div class="pokemon-stats"><h3>Estadísticas Base:</h3>${pokemon.stats.map(stat => `<div class="stat-item"><span>${statNamesES[stat.stat.name]}:</span><strong>${stat.base_stat}</strong></div>`).join('')}</div>
                    <p><strong>Altura:</strong> ${pokemon.height / 10} m</p><p><strong>Peso:</strong> ${pokemon.weight / 10} kg</p>
                </div>`;
        } catch (error) {
            modalBody.innerHTML = '<div class="error">Error cargando detalles</div>';
        }
    }
    function closeModal() { modal.classList.add('hidden'); }

    // --- MANEJO DE EVENTOS DE WEBSOCKET ---
    channel.subscribe('propose', (msg) => {
        if (msg.data.userId === userId) return;
        remoteOffer.userId = msg.data.userId;
        remoteOffer.cardIds = msg.data.cardIds;
        remoteOffer.hasProposed = true;
        tradeEventsContainer.innerHTML += `<p><strong>${remoteOffer.userId}:</strong> Propuso ${remoteOffer.cardIds.length} carta(s).</p>`;
        statusSubtitle.textContent = `${remoteOffer.userId} ha hecho una propuesta. ¡Haz tu oferta!`;
        if (localOffer.hasProposed) {
            channel.publish('start-confirmation', {});
        }
    });

    channel.subscribe('start-confirmation', () => { showConfirmationView(); });

    channel.subscribe('accept', (msg) => {
        if (msg.data.userId === userId) return;
        remoteOffer.hasAccepted = true;
        statusSubtitle.textContent = `${remoteOffer.userId} ha aceptado. Esperando tu confirmación...`;
    });

    channel.subscribe('decline', () => { alert('El otro jugador ha rechazado el intercambio.'); resetTrade(); });
    channel.subscribe('execute', () => { executeTrade(); });

    // --- EVENT LISTENERS DEL DOM ---
    proposeBtn.addEventListener('click', proposeTrade);
    acceptBtn.addEventListener('click', () => {
        localOffer.hasAccepted = true;
        acceptBtn.disabled = true;
        acceptBtn.textContent = 'Esperando...';
        // Only the player who accepts second will publish the 'execute' message.
        if (remoteOffer.hasAccepted) {
            channel.publish('execute', {});
        } else {
            // If the other player hasn't accepted yet, just publish your own acceptance.
            channel.publish('accept', { userId });
        }
    });
    declineBtn.addEventListener('click', () => { channel.publish('decline', {}); resetTrade(); });
    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // --- INICIALIZACIÓN ---
    loadUserCards();
    fetch('../components/Footer.html').then(res => res.text()).then(data => { document.getElementById('footer').innerHTML = data; });
});