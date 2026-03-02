'use strict';

/**
 * Video Presentation Logic
 * Handles slider, video player controls, playlist and transitions
 */
document.addEventListener('DOMContentLoaded', () => {
    // Dynamic list - to be fetched from backend
    let videos = [];

    let currentIndex = 0;
    let videoElements = [];
    let isMuted = true; // Auto-play policies require mute by default
    let isTransitioning = false;

    // DOM Elements Cache
    const DOM = {
        sliderContainer: document.getElementById('slider'),
        playlistContainer: document.getElementById('playlist-container'),
        titleEl: document.getElementById('video-title'),
        currentIndexEl: document.getElementById('current-index'),
        totalBadge: document.querySelector('.total-badge'),
        playBtn: document.getElementById('play-btn'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        muteBtn: document.getElementById('mute-btn'),
        iconPlay: document.getElementById('icon-play'),
        iconPause: document.getElementById('icon-pause'),
        iconSound: document.getElementById('icon-sound'),
        iconMute: document.getElementById('icon-mute'),
        progressFill: document.getElementById('progress-fill'),
        progressContainer: document.getElementById('progress-container'),
        glassOverlay: document.querySelector('.glass-overlay'),
        sidebarToggle: document.getElementById('sidebar-toggle'),
        transitionCurtain: document.getElementById('transition-curtain'),
        preloader: document.getElementById('preloader'),
        introCta: document.getElementById('intro-cta'),
        mainPlayCta: document.getElementById('main-play-cta'),
        contactBtn: document.getElementById('contact-btn'),
        contactModal: document.getElementById('contact-modal'),
        closeModal: document.getElementById('close-modal')
    };

    /**
     * Initializes the entire application after fetching videos
     */
    async function initApp() {
        try {
            const response = await fetch('videos.json');
            if (!response.ok) throw new Error('Network response was not ok');

            videos = await response.json();

            if (videos.length === 0) {
                console.warn("No se encontraron vídeos en la carpeta.");
                if (DOM.titleEl) DOM.titleEl.textContent = "Sin vídeos disponibles";
                return;
            }

            init();
        } catch (error) {
            console.error("Error cargando la playlist dinámica:", error);
            // Fallback content if everything fails
            if (DOM.titleEl) DOM.titleEl.textContent = "Error de conexión";
        }
    }

    /**
     * Initializes the UI components
     */
    function init() {
        if (DOM.totalBadge) {
            DOM.totalBadge.textContent = `/ ${String(videos.length).padStart(2, '0')}`;
        }

        setupVideosAndPlaylist();
        setupControls();
        setupPreloaderAndIntro();
        setupSidebarInteractions();
        setupContactModal();
        updateInfo();

        // Initial Playback UI State
        DOM.iconPause.style.display = 'none';
        DOM.iconPlay.style.display = 'block';
    }

    /**
     * Handles opening and closing of the contact modal
     */
    function setupContactModal() {
        if (!DOM.contactBtn || !DOM.contactModal) return;

        const openModal = () => {
            DOM.contactModal.classList.add('active');
            DOM.contactModal.setAttribute('aria-hidden', 'false');
        };

        const closeModal = () => {
            DOM.contactModal.classList.remove('active');
            DOM.contactModal.setAttribute('aria-hidden', 'true');
        };

        DOM.contactBtn.addEventListener('click', openModal);
        if (DOM.closeModal) DOM.closeModal.addEventListener('click', closeModal);

        // Close on clicking outside the card (on the overlay)
        DOM.contactModal.addEventListener('click', (e) => {
            if (e.target === DOM.contactModal) closeModal();
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && DOM.contactModal.classList.contains('active')) {
                closeModal();
            }
        });
    }

    /**
     * Creates DOM elements for videos, canvasses, and playlist
     */
    function setupVideosAndPlaylist() {
        videos.forEach((video, index) => {
            // Slide Container
            const slide = document.createElement('div');
            slide.className = 'slide'; // Hidden by default (no 'active' class)

            // Ambient Canvas
            const canvas = document.createElement('canvas');
            canvas.className = 'ambient-canvas';
            const ctx = canvas.getContext('2d', { alpha: false });

            // Video Element
            const vidEl = document.createElement('video');
            vidEl.className = 'video-main';
            vidEl.src = video.src;
            vidEl.loop = false;
            vidEl.muted = isMuted;
            vidEl.playsInline = true;
            vidEl.preload = index < 2 ? 'auto' : 'metadata';

            slide.appendChild(canvas);
            slide.appendChild(vidEl);
            DOM.sliderContainer.appendChild(slide);
            videoElements.push(vidEl);

            setupVideoCanvasOptimization(vidEl, canvas, ctx);
            setupVideoEvents(vidEl, index);
            createPlaylistItem(video, index);
        });

        if (DOM.playlistContainer) {
            DOM.playlistContainer.classList.add('active');
        }
    }

    /**
     * Handles canvas redrawing strictly when video is playing for max performance
     */
    function setupVideoCanvasOptimization(vidEl, canvas, ctx) {
        let animationId;
        const updateCanvas = () => {
            if (vidEl.paused || vidEl.ended) return;
            // Draw at low res for maximum performance and blur effect
            ctx.drawImage(vidEl, 0, 0, canvas.width, canvas.height);
            animationId = requestAnimationFrame(updateCanvas);
        };

        vidEl.addEventListener('play', () => {
            canvas.width = 32;
            canvas.height = 32;
            updateCanvas();
        });
        vidEl.addEventListener('pause', () => cancelAnimationFrame(animationId));
        vidEl.addEventListener('seeked', () => ctx.drawImage(vidEl, 0, 0, canvas.width, canvas.height));
    }

    /**
     * Attaches necessary events to individual video elements
     */
    function setupVideoEvents(vidEl, index) {
        // Progress bar updates
        vidEl.addEventListener('timeupdate', () => {
            if (index === currentIndex && DOM.progressFill) {
                const progress = (vidEl.currentTime / vidEl.duration) * 100;
                DOM.progressFill.style.width = `${progress}%`;
            }
        });

        // Hide overlay sidebar while playing (only for current video)
        vidEl.addEventListener('play', () => {
            if (index === currentIndex) DOM.glassOverlay.classList.add('playing');
        });

        // Show overlay sidebar on pause
        vidEl.addEventListener('pause', () => {
            if (index === currentIndex) DOM.glassOverlay.classList.remove('playing');
        });

        // Auto advance
        vidEl.addEventListener('ended', () => {
            if (index === currentIndex) {
                goToVideo((currentIndex + 1) % videos.length);
            }
        });
    }

    /**
     * Generates an item in the playlist
     */
    function createPlaylistItem(video, index) {
        if (!DOM.playlistContainer) return;

        const plItem = document.createElement('div');
        plItem.className = `playlist-item ${index === 0 ? 'active' : ''}`;
        plItem.innerHTML = `<span class="playlist-item-index">${String(index + 1).padStart(2, '0')}</span> ${video.title}`;

        plItem.addEventListener('click', () => {
            if (!isTransitioning) {
                startExperience(); // Ensure intro is removed
                DOM.glassOverlay.classList.add('playing');
                goToVideo(index);
            }
        });
        DOM.playlistContainer.appendChild(plItem);
    }

    /**
     * Manages preloader hide delays and intro screen
     */
    function setupPreloaderAndIntro() {
        const minTime = 2000;
        const startTime = Date.now();

        const finishLoading = () => {
            if (!DOM.preloader || DOM.preloader.classList.contains('fade-out')) return;

            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, minTime - elapsed);

            setTimeout(() => {
                DOM.preloader.classList.add('fade-out');
                if (DOM.introCta) DOM.introCta.classList.add('show');
            }, remaining);
        };

        // Safety timeout
        setTimeout(finishLoading, 5000);

        // Preload checks using first video
        const firstVid = videoElements[0];
        if (firstVid) {
            if (firstVid.readyState >= 3) {
                finishLoading();
            } else {
                firstVid.addEventListener('canplay', finishLoading, { once: true });
                firstVid.addEventListener('loadedmetadata', finishLoading, { once: true });
                firstVid.addEventListener('canplaythrough', finishLoading, { once: true });
            }
        }

        window.addEventListener('load', finishLoading);

        // Main CTA Click to begin experience
        if (DOM.mainPlayCta) {
            DOM.mainPlayCta.addEventListener('click', () => {
                startExperience();
                const currentVid = videoElements[currentIndex];
                if (currentVid) {
                    safePlay(currentVid);
                }
            });
        }
    }

    /**
     * Unified logic for user beginning the experience, ensuring unmuting
     */
    function startExperience() {
        if (DOM.introCta && DOM.introCta.classList.contains('show')) {
            DOM.introCta.classList.remove('show');
            setTimeout(() => DOM.introCta.style.display = 'none', 1000);
        }

        // Activate first slide visibility now that we are starting
        const initialSlide = DOM.sliderContainer.querySelectorAll('.slide')[currentIndex];
        if (initialSlide) {
            initialSlide.classList.add('active');
        }

        isMuted = false;
        videoElements.forEach(v => v.muted = false);

        if (DOM.iconSound && DOM.iconMute) {
            DOM.iconMute.style.display = 'none';
            DOM.iconSound.style.display = 'block';
        }
    }

    /**
     * Safely attempts to play video and catches PlayPolicy promises
     */
    function safePlay(videoElement) {
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                DOM.iconPlay.style.display = 'none';
                DOM.iconPause.style.display = 'block';
            }).catch(e => {
                console.warn("Autoplay prevented:", e.message);
                // Revert to paused UI state if interrupted
                DOM.iconPause.style.display = 'none';
                DOM.iconPlay.style.display = 'block';
                DOM.glassOverlay.classList.remove('playing');
            });
        }
    }

    /**
     * Crossfade and Curtain Navigation
     */
    function goToVideo(index) {
        if (index === currentIndex || isTransitioning) return;
        isTransitioning = true;

        const currentVideoEl = videoElements[currentIndex];
        const nextVideoEl = videoElements[index];
        const oldIndex = currentIndex;
        currentIndex = index;

        // Show curtain
        if (DOM.transitionCurtain) DOM.transitionCurtain.classList.add('active');

        setTimeout(() => {
            // Prep next video
            nextVideoEl.currentTime = 0;
            nextVideoEl.muted = isMuted;
            safePlay(nextVideoEl);

            // Update slide visibility
            const slides = document.querySelectorAll('.slide');
            if (slides[oldIndex]) slides[oldIndex].classList.remove('active');
            if (slides[index]) slides[index].classList.add('active');

            // Update playlist styles
            const items = document.querySelectorAll('.playlist-item');
            if (items[oldIndex]) items[oldIndex].classList.remove('active');
            if (items[index]) {
                items[index].classList.add('active');
                items[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            updateInfo();
            if (DOM.progressFill) DOM.progressFill.style.width = `0%`;
            if (DOM.glassOverlay) DOM.glassOverlay.classList.add('playing');

            // Hide curtain
            setTimeout(() => {
                if (DOM.transitionCurtain) DOM.transitionCurtain.classList.remove('active');
                if (currentVideoEl) {
                    currentVideoEl.pause();
                    currentVideoEl.currentTime = 0;
                }
                isTransitioning = false;
            }, 600);

        }, 500);
    }

    /**
     * Updates textual player info (Title and Index)
     */
    function updateInfo() {
        if (DOM.titleEl) {
            DOM.titleEl.style.opacity = 0;
            setTimeout(() => {
                DOM.titleEl.textContent = videos[currentIndex].title;
                DOM.titleEl.style.opacity = 1;
            }, 300);
        }
        if (DOM.currentIndexEl) {
            DOM.currentIndexEl.textContent = String(currentIndex + 1).padStart(2, '0');
        }
    }

    /**
     * Setup Main Control Events (Play/Next/Mute/Progress)
     */
    function setupControls() {
        if (DOM.playBtn) {
            DOM.playBtn.addEventListener('click', () => {
                // Ensure intro is dismissed if player play button is clicked
                startExperience();

                const vid = videoElements[currentIndex];
                if (vid.paused) {
                    safePlay(vid);
                    DOM.glassOverlay.classList.add('playing');
                } else {
                    vid.pause();
                    DOM.glassOverlay.classList.remove('playing');
                    DOM.iconPause.style.display = 'none';
                    DOM.iconPlay.style.display = 'block';
                }
            });
        }

        if (DOM.muteBtn) {
            DOM.muteBtn.addEventListener('click', () => {
                isMuted = !isMuted;
                videoElements.forEach(v => v.muted = isMuted);
                if (isMuted) {
                    DOM.iconSound.style.display = 'none';
                    DOM.iconMute.style.display = 'block';
                } else {
                    DOM.iconMute.style.display = 'none';
                    DOM.iconSound.style.display = 'block';
                }
            });
        }

        if (DOM.nextBtn) {
            DOM.nextBtn.addEventListener('click', () => {
                if (!isTransitioning) goToVideo((currentIndex + 1) % videos.length);
            });
        }

        if (DOM.prevBtn) {
            DOM.prevBtn.addEventListener('click', () => {
                if (!isTransitioning) goToVideo((currentIndex - 1 + videos.length) % videos.length);
            });
        }

        if (DOM.progressContainer) {
            DOM.progressContainer.addEventListener('click', (e) => {
                const rect = DOM.progressContainer.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                const vid = videoElements[currentIndex];
                if (vid) vid.currentTime = pos * vid.duration;
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (DOM.playBtn) DOM.playBtn.click();
            } else if (e.code === 'ArrowRight') {
                if (DOM.nextBtn) DOM.nextBtn.click();
            } else if (e.code === 'ArrowLeft') {
                if (DOM.prevBtn) DOM.prevBtn.click();
            }
        });

        if (DOM.titleEl) {
            DOM.titleEl.style.transition = 'opacity 0.3s ease';
        }
    }

    /**
     * Handlers for Mobile Swipe & Toggle of Sidebar Overlay
     */
    function setupSidebarInteractions() {
        if (!DOM.sidebarToggle || !DOM.glassOverlay) return;

        const handleToggle = (e) => {
            if (e) {
                e.stopPropagation();
                if (e.type === 'touchstart') e.preventDefault();
            }
            DOM.glassOverlay.classList.toggle('playing');
            DOM.glassOverlay.style.transform = '';
        };

        DOM.sidebarToggle.addEventListener('click', handleToggle);
        DOM.sidebarToggle.addEventListener('touchstart', handleToggle, { passive: false });

        let touchStartX = 0;
        let touchStartY = 0;
        let isDragging = false;
        let startTranslate = 0;

        DOM.glassOverlay.addEventListener('touchstart', (e) => {
            if (e.target.closest('#sidebar-toggle')) {
                isDragging = false;
                return;
            }

            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isDragging = true;

            DOM.glassOverlay.style.transition = 'none';

            const style = window.getComputedStyle(DOM.glassOverlay);
            let matrix;
            if (window.WebKitCSSMatrix) {
                matrix = new window.WebKitCSSMatrix(style.transform);
            } else {
                const transform = style.transform || style.webkitTransform;
                const match = transform.match(/matrix\((.+)\)/);
                const values = match ? match[1].split(', ') : [0, 0, 0, 0, 0, 0];
                matrix = { m41: parseFloat(values[4]) || 0 };
            }
            startTranslate = matrix.m41 || 0;
        }, { passive: true });

        DOM.glassOverlay.addEventListener('touchmove', (e) => {
            if (!isDragging) return;

            const deltaX = e.touches[0].clientX - touchStartX;
            const deltaY = e.touches[0].clientY - touchStartY;

            if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) return;

            let newTranslate = startTranslate + deltaX;

            if (newTranslate > 0) newTranslate = newTranslate * 0.2;

            DOM.glassOverlay.style.transform = `translateX(${newTranslate}px)`;
        }, { passive: true });

        DOM.glassOverlay.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;

            const touchEndX = e.changedTouches[0].clientX;
            const deltaX = touchEndX - touchStartX;

            DOM.glassOverlay.style.transition = '';

            if (Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    DOM.glassOverlay.classList.remove('playing');
                    DOM.glassOverlay.style.transform = '';
                } else {
                    DOM.glassOverlay.classList.add('playing');
                    DOM.glassOverlay.style.transform = '';
                }
            } else {
                DOM.glassOverlay.style.transform = '';
            }
        });
    }

    // Execute dynamic app init
    initApp();
});
