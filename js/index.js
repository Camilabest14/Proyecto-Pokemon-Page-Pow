document.addEventListener("DOMContentLoaded", function() {
    fetch('components/Footer.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer').innerHTML = data;
        });
});