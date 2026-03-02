/**
 * Video Presentation Logic
 * Handles slider, video player controls, playlist and transitions
 */
document.addEventListener('DOMContentLoaded', () => {
    // List of videos found in directory
    const videos = [
        { src: 'Vídeos/Circo Romano MAM.mp4', title: 'Circo Romano MAM' },
        { src: 'Vídeos/Mila Presentacion.mp4', title: 'Mila Presentacion' },
        { src: 'Vídeos/Synapse Tours 01.mp4', title: 'Synapse Tours 01' },
        { src: 'Vídeos/Templo de Diana - ES.mp4', title: 'Templo de Diana - ES' },
        { src: 'Vídeos/Video Tours RRSS.mp4', title: 'Video Tours RRSS' },
        { src: 'Vídeos/Viprés La Calzada.mp4', title: 'Viprés La Calzada' }
    ];

    let currentIndex = 0;
    const sliderContainer = document.getElementById('slider');
    const playlistContainer = document.getElementById('playlist-container');
    const titleEl = document.getElementById('video-title');
    const currentIndexEl = document.getElementById('current-index');
    document.querySelector('.total-badge').textContent = `/ ${String(videos.length).padStart(2, '0')}`;

    const playBtn = document.getElementById('play-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const muteBtn = document.getElementById('mute-btn');

    const iconPlay = document.getElementById('icon-play');
    const iconPause = document.getElementById('icon-pause');
    const iconSound = document.getElementById('icon-sound');
    const iconMute = document.getElementById('icon-mute');

    const progressFill = document.getElementById('progress-fill');
    const progressContainer = document.getElementById('progress-container');
    const glassOverlay = document.querySelector('.glass-overlay');

    let videoElements = [];
    let isMuted = true; // Auto-play policies require mute by default
    let isTransitioning = false;

    // Initialize UI
    function init() {
        videos.forEach((video, index) => {
            // Create full-screen slide
            const slide = document.createElement('div');
            slide.className = `slide ${index === 0 ? 'active' : ''}`;

            // Canvas for Ambient background (blurred)
            const canvas = document.createElement('canvas');
            canvas.className = 'ambient-canvas';
            const ctx = canvas.getContext('2d', { alpha: false });

            // Main video
            const vidEl = document.createElement('video');
            vidEl.className = 'video-main';
            vidEl.src = video.src;
            vidEl.loop = false;
            vidEl.muted = isMuted;
            vidEl.playsInline = true;
            vidEl.preload = index < 2 ? 'auto' : 'metadata';

            slide.appendChild(canvas);
            slide.appendChild(vidEl);
            sliderContainer.appendChild(slide);
            videoElements.push(vidEl);

            // Optimization: Update canvas only when playing
            let animationId;
            const updateCanvas = () => {
                if (vidEl.paused || vidEl.ended) return;
                // Draw at very low res for maximum performance
                ctx.drawImage(vidEl, 0, 0, canvas.width, canvas.height);
                animationId = requestAnimationFrame(updateCanvas);
            };

            vidEl.addEventListener('play', () => {
                canvas.width = 32; canvas.height = 32; // Small size = fast draw
                updateCanvas();
            });
            vidEl.addEventListener('pause', () => cancelAnimationFrame(animationId));
            vidEl.addEventListener('seeked', () => ctx.drawImage(vidEl, 0, 0, canvas.width, canvas.height));

            // Create playlist item
            const plItem = document.createElement('div');
            plItem.className = `playlist-item ${index === 0 ? 'active' : ''}`;
            plItem.innerHTML = `<span class="playlist-item-index">${String(index + 1).padStart(2, '0')}</span> ${video.title}`;
            plItem.addEventListener('click', () => {
                if (!isTransitioning) {
                    glassOverlay.classList.add('playing'); // Ocultar lengüeta al elegir vídeo
                    goToVideo(index);
                }
            });
            playlistContainer.appendChild(plItem);

            // Ensure playlist is visible by default
            playlistContainer.classList.add('active');

            // Update Progress bar based on current video
            vidEl.addEventListener('timeupdate', () => {
                if (index === currentIndex) {
                    const progress = (vidEl.currentTime / vidEl.duration) * 100;
                    progressFill.style.width = `${progress}%`;
                }
            });

            // Toggle 'playing' class on overlay
            vidEl.addEventListener('play', () => {
                if (index === currentIndex) glassOverlay.classList.add('playing');
            });

            vidEl.addEventListener('pause', () => {
                if (index === currentIndex) glassOverlay.classList.remove('playing');
            });

            // Automatically go to next video when ended
            vidEl.addEventListener('ended', () => {
                if (index === currentIndex) {
                    goToVideo((currentIndex + 1) % videos.length);
                }
            });
        });

        updateInfo();

        // --- Preloader Logic (Min 2s + video load) ---
        const preloader = document.getElementById('preloader');
        const introCta = document.getElementById('intro-cta');
        const mainPlayCta = document.getElementById('main-play-cta');
        const minTime = 2000;
        const startTime = Date.now();

        const finishLoading = () => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, minTime - elapsed);

            setTimeout(() => {
                if (preloader) preloader.classList.add('fade-out');
                // Revelar Intro CTA (Play Inicial)
                if (introCta) introCta.classList.add('show');
            }, remaining);
        };

        // Handle Intro CTA Click
        if (mainPlayCta) {
            mainPlayCta.addEventListener('click', () => {
                // Ocultar CTA
                if (introCta) {
                    introCta.classList.remove('show');
                    setTimeout(() => introCta.style.display = 'none', 1000);
                }

                // Activar Audio (Unmute)
                isMuted = false;
                videoElements.forEach(v => v.muted = false);

                // Actualizar iconos de sonido en el panel
                if (iconSound && iconMute) {
                    iconMute.style.display = 'none';
                    iconSound.style.display = 'block';
                }

                // Iniciar vídeo y plegar sidebar (el listener del video se encarga)
                const firstVideo = videoElements[currentIndex];
                if (firstVideo) {
                    firstVideo.play().then(() => {
                        iconPlay.style.display = 'none';
                        iconPause.style.display = 'block';
                    }).catch(e => console.log("Play failed on intro click:", e));
                }
            });
        }

        // Check if first video is ready
        const firstVid = videoElements[0];
        if (firstVid) {
            if (firstVid.readyState >= 3) {
                finishLoading();
            } else {
                firstVid.addEventListener('canplay', finishLoading, { once: true });
            }
        } else {
            // Fallback if no videos
            window.addEventListener('load', finishLoading);
        }

        // Initial State
        iconPause.style.display = 'none';
        iconPlay.style.display = 'block';
    }

    // Main navigation function with crossfade and curtain
    function goToVideo(index) {
        if (index === currentIndex || isTransitioning) return;
        isTransitioning = true;

        const curtain = document.getElementById('transition-curtain');
        const currentVideoEl = videoElements[currentIndex];
        const nextVideoEl = videoElements[index];
        const oldIndex = currentIndex;
        currentIndex = index;

        // 1. Mostrar cortinilla
        if (curtain) curtain.classList.add('active');

        // 2. Esperar a que la cortinilla cubra (0.5s)
        setTimeout(() => {
            // 3. Preparar y reproducir siguiente vídeo
            nextVideoEl.currentTime = 0;
            nextVideoEl.muted = isMuted;
            const playPromise = nextVideoEl.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    iconPlay.style.display = 'none';
                    iconPause.style.display = 'block';
                }).catch(e => console.log('Autoplay prevented on next video', e));
            }

            // 4. Actualizar visualización slides
            const slides = document.querySelectorAll('.slide');
            slides[oldIndex].classList.remove('active');
            slides[index].classList.add('active');

            // 5. Actualizar Playlist
            const items = document.querySelectorAll('.playlist-item');
            if (items[oldIndex]) items[oldIndex].classList.remove('active');
            if (items[index]) {
                items[index].classList.add('active');
                items[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            updateInfo();
            progressFill.style.width = `0%`;
            glassOverlay.classList.add('playing');

            // 6. Ocultar cortinilla después de un breve momento de logo (total 1s aprox)
            setTimeout(() => {
                if (curtain) curtain.classList.remove('active');

                // Limpieza video viejo
                currentVideoEl.pause();
                currentVideoEl.currentTime = 0;
                isTransitioning = false;
            }, 600);

        }, 500);
    }

    function updateInfo() {
        titleEl.textContent = videos[currentIndex].title;
        // animate text swap
        titleEl.style.opacity = 0;
        setTimeout(() => {
            titleEl.textContent = videos[currentIndex].title;
            titleEl.style.opacity = 1;
        }, 300);

        currentIndexEl.textContent = String(currentIndex + 1).padStart(2, '0');
    }

    // --- Controls Events ---

    // Toggle Play / Pause
    playBtn.addEventListener('click', () => {
        const vid = videoElements[currentIndex];
        if (vid.paused) {
            vid.play();
            glassOverlay.classList.add('playing');
            iconPlay.style.display = 'none';
            iconPause.style.display = 'block';
        } else {
            vid.pause();
            glassOverlay.classList.remove('playing');
            iconPause.style.display = 'none';
            iconPlay.style.display = 'block';
        }
    });

    // Toggle Mute
    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        videoElements.forEach(v => v.muted = isMuted);

        if (isMuted) {
            iconSound.style.display = 'none';
            iconMute.style.display = 'block';
        } else {
            iconMute.style.display = 'none';
            iconSound.style.display = 'block';
        }
    });

    // Next / Prev buttons
    nextBtn.addEventListener('click', () => {
        if (!isTransitioning) goToVideo((currentIndex + 1) % videos.length);
    });

    prevBtn.addEventListener('click', () => {
        if (!isTransitioning) goToVideo((currentIndex - 1 + videos.length) % videos.length);
    });

    // Progress bar seek
    progressContainer.addEventListener('click', (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const vid = videoElements[currentIndex];
        vid.currentTime = pos * vid.duration;
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault(); // prevent scroll
            playBtn.click();
        } else if (e.code === 'ArrowRight') {
            nextBtn.click();
        } else if (e.code === 'ArrowLeft') {
            prevBtn.click();
        }
    });

    // Start everything
    init();

    // Toggle Sidebar via Handle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    sidebarToggle.addEventListener('click', (e) => {
        e.stopPropagation(); // Evitar que el click se propague al panel
        glassOverlay.classList.toggle('playing');
        glassOverlay.style.transform = ''; // Reset transform si venía de un arrastre
    });

    // --- Touch & Swipe Interactions for Sidebar UX ---
    let touchStartX = 0;
    let touchStartY = 0;
    let isDragging = false;
    let startTranslate = 0;

    glassOverlay.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isDragging = true;

        // Desactivar transiciones durante el arrastre para respuesta inmediata
        glassOverlay.style.transition = 'none';

        // Obtener la posición actual
        const style = window.getComputedStyle(glassOverlay);
        const matrix = new WebKitCSSMatrix(style.transform);
        startTranslate = matrix.m41; // Valor de translateX
    }, { passive: true });

    glassOverlay.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        const deltaX = e.touches[0].clientX - touchStartX;
        const deltaY = e.touches[0].clientY - touchStartY;

        // Priorizar scroll vertical sobre horizontal si es muy pronunciado
        if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) return;

        let newTranslate = startTranslate + deltaX;

        // Limitar el arrastre para que no se salga de los bordes
        if (newTranslate > 0) newTranslate = newTranslate * 0.2; // Efecto goma

        glassOverlay.style.transform = `translateX(${newTranslate}px)`;
    }, { passive: true });

    glassOverlay.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;

        const touchEndX = e.changedTouches[0].clientX;
        const deltaX = touchEndX - touchStartX;

        // Restaurar transiciones
        glassOverlay.style.transition = '';

        // Lógica de "Snap" profesional
        const isLandscape = window.matchMedia("(orientation: landscape)").matches;

        if (Math.abs(deltaX) > 50) { // Si el swipe es significativo
            if (deltaX > 0) {
                // Hacia la derecha: Abrir
                glassOverlay.classList.remove('playing');
                glassOverlay.style.transform = '';
            } else {
                // Hacia la izquierda: Cerrar
                glassOverlay.classList.add('playing');
                glassOverlay.style.transform = '';
            }
        } else {
            // Si el movimiento es pequeño, volver al estado original según la clase actual
            glassOverlay.style.transform = '';
        }
    });

    // Fade-in animation for title on update
    titleEl.style.transition = 'opacity 0.3s ease';
});
