// ==========================
// 👤 Identificación de usuario
// ==========================
const nombreUsuario = prompt("Ingresa tu nombre de entrenador:");
const ably = new Ably.Realtime('uPeIQg.Vz7bow:8XwMy65DS1CXEyx7PKqm3MzKmHieUgPuEZ02RVFYb8g'); // ← API KEY de Norbelys
const canal = ably.channels.get('intercambio-pokemon');

// Funciones para LocalStorage
function getUnlockedPokemonFromStorage() {
    const data = localStorage.getItem('unlockedPokemon');
    return data ? JSON.parse(data) : [];
}

// ==========================
// 🌐 Estado de la aplicación
// ==========================
let usuarioRemoto = 'Desconocido';
let cartaSeleccionadaPropia = null;
let cartaSeleccionadaRemota = null;

// ==========================
// 🧩 Cargar cartas desbloqueadas del localStorage
// ==========================
const cartasDesbloqueadas = JSON.parse(localStorage.getItem('unlockedPokemon')) || [];
const contenedor = document.querySelectorAll('.home-actions')[0]; // Sección "Tus Cartas"

// Rellenar visualmente tus cartas reales
contenedor.innerHTML = '';
cartasDesbloqueadas.forEach(id => {
  const div = document.createElement('div');
  div.className = 'carta';
  div.dataset.id = id;
  div.innerHTML = `
    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png" alt="Carta ${id}">
    <div class="name">#${String(id).padStart(3, '0')}</div>
  `;
  div.addEventListener('click', () => seleccionarCartaPropia(id, div));
  contenedor.appendChild(div);
});

// ==========================
// 📤 Función para seleccionar tu carta
// ==========================
function seleccionarCartaPropia(id, elemento) {
  document.querySelectorAll('.home-actions .carta').forEach(c => c.classList.remove('seleccionada'));
  elemento.classList.add('seleccionada');
  cartaSeleccionadaPropia = { id, nombre: nombreUsuario };
  canal.publish('seleccion', cartaSeleccionadaPropia);
  verificarIntercambioListo();
}

// ==========================
// 📥 Recibir cartas del otro usuario
// ==========================
canal.subscribe('seleccion', (mensaje) => {
  if (mensaje.data.nombre !== nombreUsuario) {
    usuarioRemoto = mensaje.data.nombre;
    cartaSeleccionadaRemota = mensaje.data;
    renderCartaRemota();
    verificarIntercambioListo();
  }
});

canal.subscribe('intercambio-completo', (msg) => {
  mostrarExito(msg.data);
});

// ==========================
// 📦 Mostrar carta del otro usuario
// ==========================
function renderCartaRemota() {
  const seccionRemota = document.querySelectorAll('.home-actions')[1];
  seccionRemota.innerHTML = `
    <div class="carta seleccionada">
      <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${cartaSeleccionadaRemota.id}.png" alt="Carta Remota">
      <div class="name">#${String(cartaSeleccionadaRemota.id).padStart(3, '0')}</div>
    </div>
  `;
  document.querySelectorAll('.subtitle')[1].textContent = `Carta de ${usuarioRemoto}`;
}

// ==========================
// ⚙️ Botón de intercambio
// ==========================
const boton = document.querySelector('.boton');
boton.disabled = true;

function verificarIntercambioListo() {
  if (cartaSeleccionadaPropia && cartaSeleccionadaRemota) {
    boton.disabled = false;
  }
}

boton.addEventListener('click', () => {

  // Obtener el array actual del localStorage
  const unlockedPokemon = getUnlockedPokemonFromStorage();
  
  // Eliminar la carta entregada (por ID) y agregar la carta recibida (por ID)
  const updatedPokemon = unlockedPokemon.filter(id => id !== cartaSeleccionadaPropia.id);
  updatedPokemon.push(cartaSeleccionadaRemota.id);
  
  // Guardar el array actualizado en el localStorage
  localStorage.setItem('unlockedPokemon', JSON.stringify(updatedPokemon));

  const mensaje = `${nombreUsuario} intercambió la carta #${cartaSeleccionadaPropia.id} por la carta #${cartaSeleccionadaRemota.id} de ${usuarioRemoto}. ¡Intercambio exitoso! 🔄`;
  canal.publish('intercambio-completo', mensaje);
  mostrarExito(mensaje);
});

// ==========================
// ✅ Mostrar mensaje de éxito
// ==========================
function mostrarExito(texto) {
  const mensaje = document.createElement('div');
  mensaje.style.position = 'fixed';
  mensaje.style.bottom = '40%';
  mensaje.style.left = '50%';
  mensaje.style.transform = 'translate(-50%, 0)';
  mensaje.style.background = '#8c52ff';
  mensaje.style.color = 'white';
  mensaje.style.padding = '1.5rem 2rem';
  mensaje.style.borderRadius = '12px';
  mensaje.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
  mensaje.style.fontSize = '1.1rem';
  mensaje.style.zIndex = 9999;
  mensaje.textContent = texto;
  document.body.appendChild(mensaje);
  setTimeout(() => mensaje.remove(), 6000);
}





fetch('components/Footer.html')
  .then(res => res.text())
  .then(data => {
    document.getElementById('footer').innerHTML = data;
  });