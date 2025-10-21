document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const video = document.getElementById('camera-stream');
    const canvas = document.getElementById('canvas');
    const uploadForm = document.getElementById('upload-form');
    const imageInput = document.getElementById('image-input');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // Contenedores y botones para el flujo de UI
    const cameraContainer = document.getElementById('camera-container');
    const actionButtons = document.querySelector('.action-buttons');
    const activateCameraBtn = document.getElementById('activate-camera-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const takePhotoBtn = document.getElementById('take-photo-btn');

    // --- LÓGICA PARA ACTIVAR LA CÁMARA ---
    // Solo se añade el listener si el botón existe en la página
    if (activateCameraBtn) {
        activateCameraBtn.addEventListener('click', () => {
            // Ocultar los botones de acción iniciales
            actionButtons.style.display = 'none';
            // Mostrar el contenedor de la cámara
            cameraContainer.style.display = 'block';

            // Iniciar el stream de la cámara
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                    .then(stream => {
                        video.srcObject = stream;
                        video.play();
                    })
                    .catch(err => {
                        console.error("Error al acceder a la cámara: ", err);
                        alert("No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios.");
                        // Si falla, volvemos al estado inicial
                        actionButtons.style.display = 'grid';
                        cameraContainer.style.display = 'none';
                    });
            } else {
                 alert("Tu navegador no soporta el acceso a la cámara.");
            }
        });
    }
    
    // --- LÓGICA PARA TOMAR LA FOTO ---
    // Solo se añade el listener si el botón existe
    if (takePhotoBtn) {
        takePhotoBtn.addEventListener('click', () => {
            loadingOverlay.classList.remove('hidden');
            takePhotoBtn.disabled = true;

            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(blob => {
                const file = new File([blob], 'ticket_capture.png', { type: 'image/png' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                imageInput.files = dataTransfer.files;
                uploadForm.submit();
            }, 'image/png');
        });
    }

    // --- LÓGICA PARA SUBIR UN ARCHIVO ---
    // Solo se añade el listener si el botón existe
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            imageInput.click();
        });

        imageInput.addEventListener('change', () => {
            if (imageInput.files.length > 0) {
                loadingOverlay.classList.remove('hidden');
                if (activateCameraBtn) activateCameraBtn.disabled = true;
                uploadBtn.disabled = true;
                uploadForm.submit();
            }
        });
    }
});