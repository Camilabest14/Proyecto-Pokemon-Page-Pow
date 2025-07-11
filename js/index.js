// Esperar a que el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", function() {
    // Cargar dinámicamente el footer desde el archivo externo
    fetch('components/Footer.html')
        .then(response => response.text()) // Convertir la respuesta a texto HTML
        .then(data => {
            // Insertar el contenido del footer en el elemento con id="footer"
            document.getElementById('footer').innerHTML = data;
        })
        .catch(e => {
            // Manejar errores si la carga del footer falla
            console.error('Error cargando el footer:', e);
        });
});
