document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN Y ESTADO ---
    const ABLY_API_KEY = 'wYro_w.Fh6czw:uQK_OF4aoqD4zmEd60jSXVJBrSHGXr6irLsleUwgHxM';
    let userId = '';
    try {
        // Obtener nombre del usuario o asignar uno por defecto
        userId = prompt("Ingresa tu nombre de entrenador:") || `Entrenador_${Math.floor(Math.random() * 1000)}`;
    } catch (e) {
        userId = `Entrenador_${Math.floor(Math.random() * 1000)}`;
        alert('No se pudo obtener el nombre de usuario. Se asignará uno por defecto.');
    }

    // Inicializar Ably y canal de intercambio
    let ably, channel;
    try {
        ably = new Ably.Realtime(ABLY_API_KEY);
        channel = ably.channels.get('pokemon-trade-channel');
    } catch (e) {
        alert('Error conectando con el servidor de intercambio. Intenta recargar la página.');
        console.error('Error Ably:', e);
        return;
    }

    // Estado de las ofertas
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
    const remoteCardsContainer = document.getElementById('cartas-remotas');
    const remoteUserLabel = document.getElementById('remote-user-label');

    // --- FUNCIONES PRINCIPALES ---

    // Cargar cartas desbloqueadas del usuario
    function loadUserCards() {
        let unlockedIds = [];
        try {
            unlockedIds = JSON.parse(localStorage.getItem('unlockedPokemon')) || [];
        } catch (e) {
            alert('Error leyendo tus cartas desbloqueadas.');
            console.error('Error localStorage:', e);
            unlockedIds = [];
        }
        ownCardsContainer.innerHTML = '';
        if (unlockedIds.length === 0) {
            ownCardsContainer.innerHTML = '<p>No tienes cartas para intercambiar. ¡Ve a abrir sobres!</p>';
            return;
        }
        unlockedIds.forEach(id => {
            const cardElement = createCardElement(id, false);
            cardElement.addEventListener('click', () => selectCard(id, cardElement));
            ownCardsContainer.appendChild(cardElement);
        });
    }

    // Crear elemento HTML para una carta
    function createCardElement(id, isConfirmationCard) {
        const div = document.createElement('div');
        div.className = 'carta';
        div.dataset.id = id;
        div.innerHTML = `
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png" alt="Pokémon ${id}">
            <div class="name">#${id}</div>`;
        if (isConfirmationCard) {
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                openPokemonModal(id);
            });
        }
        return div;
    }

    // Seleccionar o quitar selección de una carta
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

        // Enviar selección actual al canal
        try {
            channel.publish('selecting', { userId, cardIds: localOffer.cardIds });
        } catch (e) {
            console.error('Error enviando selección:', e);
        }
    }

    // Proponer un intercambio al otro jugador
    function proposeTrade() {
        if (localOffer.cardIds.length === 0) return;
        localOffer.hasProposed = true;
        try {
            channel.publish('propose', { userId, cardIds: localOffer.cardIds });
        } catch (e) {
            alert('Error enviando la propuesta de intercambio.');
            console.error('Error publicando en Ably:', e);
            return;
        }
        statusSubtitle.textContent = '¡Propuesta enviada! Esperando al otro jugador...';
        tradeEventsContainer.innerHTML = `<p><strong>Tú:</strong> Propusiste ${localOffer.cardIds.length} carta(s).</p>`;
        proposeBtn.disabled = true;

        // Si ambos han propuesto, iniciar confirmación
        if (remoteOffer.hasProposed) {
            try {
                channel.publish('start-confirmation', {});
            } catch (e) {
                alert('Error iniciando la confirmación de intercambio.');
                console.error('Error publicando en Ably:', e);
            }
        }
    }

    // Mostrar la vista de confirmación de intercambio
    function showConfirmationView() {
        selectionView.classList.add('hidden');
        confirmationView.classList.remove('hidden');
        statusTitle.textContent = 'Confirmar Intercambio';
        statusSubtitle.textContent = 'Ambos jugadores deben aceptar para completar el intercambio.';

        // Mostrar cartas propias y del otro jugador
        document.getElementById('local-user-name').textContent = `Tu Oferta (${userId})`;
        const localCardContainer = document.getElementById('local-offer-card');
        localCardContainer.innerHTML = '';
        localOffer.cardIds.forEach(id => localCardContainer.appendChild(createCardElement(id, true)));

        document.getElementById('remote-user-name').textContent = `Oferta de ${remoteOffer.userId}`;
        const remoteCardContainer = document.getElementById('remote-offer-card');
        remoteCardContainer.innerHTML = '';
        remoteOffer.cardIds.forEach(id => remoteCardContainer.appendChild(createCardElement(id, true)));
    }

    // Ejecutar el intercambio y actualizar almacenamiento
    function executeTrade() {
        if (tradeInProgress) return; // Evita la ejecución doble
        tradeInProgress = true;

        let unlockedIds = [];
        try {
            unlockedIds = JSON.parse(localStorage.getItem('unlockedPokemon')) || [];
        } catch (e) {
            alert('Error accediendo a tus cartas para el intercambio.');
            console.error('Error localStorage:', e);
            unlockedIds = [];
        }

        // Quitar cartas ofrecidas y agregar las recibidas
        unlockedIds = unlockedIds.filter(id => !localOffer.cardIds.includes(id));
        remoteOffer.cardIds.forEach(receivedId => {
            if (!unlockedIds.includes(receivedId)) unlockedIds.push(receivedId);
        });

        try {
            localStorage.setItem('unlockedPokemon', JSON.stringify(unlockedIds));
        } catch (e) {
            alert('Error guardando tus cartas después del intercambio.');
            console.error('Error localStorage:', e);
        }

        alert(`¡Intercambio exitoso!`);
        resetTrade();
    }

    // Resetear el estado del intercambio
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
            if (!response.ok) throw new Error('No se pudo obtener el Pokémon');
            const pokemon = await response.json();
            modalBody.innerHTML = `
                <div class="pokemon-detail">
                    <img src="${pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}" alt="${pokemon.name}">
                    <h2>${pokemon.name}</h2>
                    <div class="pokemon-types">
                        ${pokemon.types.map(type => `<span class="type-badge type-${type.type.name}">${type.type.name}</span>`).join('')}
                    </div>
                    <p><strong>Altura:</strong> ${pokemon.height / 10} m</p>
                    <p><strong>Peso:</strong> ${pokemon.weight / 10} kg</p>
                </div>`;
        } catch (error) {
            modalBody.innerHTML = '<div class="error">Error cargando detalles</div>';
            console.error('Error cargando detalles del Pokémon:', error);
        }
    }
    function closeModal() { modal.classList.add('hidden'); }

    // --- SUBSCRIPCIONES A EVENTOS WEBSOCKET ---
    channel.subscribe('propose', (msg) => {
        try {
            if (msg.data.userId === userId) return;
            remoteOffer.userId = msg.data.userId;
            remoteOffer.cardIds = msg.data.cardIds;
            remoteOffer.hasProposed = true;
            tradeEventsContainer.innerHTML += `<p><strong>${remoteOffer.userId}:</strong> Propuso ${remoteOffer.cardIds.length} carta(s).</p>`;
            statusSubtitle.textContent = `${remoteOffer.userId} ha hecho una propuesta. ¡Haz tu oferta!`;
            if (localOffer.hasProposed) {
                channel.publish('start-confirmation', {});
            }
        } catch (e) {
            alert('Error recibiendo la propuesta de intercambio.');
            console.error('Error en evento propose:', e);
        }
    });

    channel.subscribe('start-confirmation', () => {
        try {
            showConfirmationView();
        } catch (e) {
            alert('Error mostrando la confirmación de intercambio.');
            console.error('Error en start-confirmation:', e);
        }
    });

    channel.subscribe('accept', (msg) => {
        try {
            if (msg.data.userId === userId) return;
            remoteOffer.hasAccepted = true;
            statusSubtitle.textContent = `${remoteOffer.userId} ha aceptado. Esperando tu confirmación...`;
        } catch (e) {
            alert('Error recibiendo la aceptación.');
            console.error('Error en evento accept:', e);
        }
    });

    channel.subscribe('decline', () => {
        try {
            alert('El otro jugador ha rechazado el intercambio.');
            resetTrade();
        } catch (e) {
            alert('Error al procesar el rechazo del intercambio.');
            console.error('Error en evento decline:', e);
        }
    });

    channel.subscribe('execute', () => {
        try {
            executeTrade();
        } catch (e) {
            alert('Error ejecutando el intercambio.');
            console.error('Error en evento execute:', e);
        }
    });

    channel.subscribe('selecting', (msg) => {
        try {
            if (msg.data.userId === userId) return;
            remoteOffer.userId = msg.data.userId;
            remoteOffer.cardIds = msg.data.cardIds;
            renderRemoteSelection();
        } catch (e) {
            console.error('Error recibiendo selección:', e);
        }
    });

    // Mostrar selección actual del otro jugador
    function renderRemoteSelection() {
        if (!remoteCardsContainer) return;
        remoteCardsContainer.innerHTML = '';
        remoteUserLabel.textContent = remoteOffer.userId
            ? `Cartas de ${remoteOffer.userId} seleccionadas`
            : 'Cartas del otro usuario';
        if (remoteOffer.cardIds.length === 0) {
            remoteCardsContainer.innerHTML = '<p>No ha seleccionado cartas.</p>';
            return;
        }
        remoteOffer.cardIds.forEach(id => {
            const card = createCardElement(id, false);
            remoteCardsContainer.appendChild(card);
        });
    }

    // --- EVENT LISTENERS DEL DOM ---
    proposeBtn.addEventListener('click', proposeTrade);
    acceptBtn.addEventListener('click', () => {
        localOffer.hasAccepted = true;
        acceptBtn.disabled = true;
        acceptBtn.textContent = 'Esperando...';
        try {
            if (remoteOffer.hasAccepted) {
                channel.publish('execute', {});
            } else {
                channel.publish('accept', { userId });
            }
        } catch (e) {
            alert('Error enviando la aceptación.');
            console.error('Error publicando en Ably:', e);
        }
    });
    declineBtn.addEventListener('click', () => {
        try {
            channel.publish('decline', {});
            resetTrade();
        } catch (e) {
            alert('Error enviando el rechazo.');
            console.error('Error publicando en Ably:', e);
        }
    });
    closeModalBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // --- INICIALIZACIÓN ---
    try {
        loadUserCards();
    } catch (e) {
        alert('Error cargando tus cartas.');
        console.error('Error inicializando cartas:', e);
    }
    fetch('../components/Footer.html')
        .then(res => res.text())
        .then(data => { document.getElementById('footer').innerHTML = data; })
        .catch(e => {
            console.error('Error cargando el footer:', e);
        });
});
