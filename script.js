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
    const playlistBtn = document.getElementById('playlist-btn');
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

            const vidEl = document.createElement('video');
            vidEl.src = video.src;
            vidEl.loop = false; // We move to next on end
            vidEl.muted = isMuted;
            vidEl.playsInline = true;
            // Preload only first two for bandwidth mapping, others on demand
            vidEl.preload = index < 2 ? 'auto' : 'metadata';

            slide.appendChild(vidEl);
            sliderContainer.appendChild(slide);
            videoElements.push(vidEl);

            // Create playlist item
            const plItem = document.createElement('div');
            plItem.className = `playlist-item ${index === 0 ? 'active' : ''}`;
            plItem.innerHTML = `<span class="playlist-item-index">${String(index + 1).padStart(2, '0')}</span> ${video.title}`;
            plItem.addEventListener('click', () => {
                if (!isTransitioning) goToVideo(index);
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

        // Autoplay main video
        const firstVideo = videoElements[0];
        const playPromise = firstVideo.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                iconPlay.style.display = 'none';
                iconPause.style.display = 'block';
            }).catch(e => {
                // Autoplay was prevented by browser
                console.log("Autoplay prevented:", e.message);
                iconPause.style.display = 'none';
                iconPlay.style.display = 'block';
            });
        }
    }

    // Main navigation function with crossfade
    function goToVideo(index) {
        if (index === currentIndex || isTransitioning) return;
        isTransitioning = true;

        const currentVideoEl = videoElements[currentIndex];
        const nextVideoEl = videoElements[index];

        // 1. Play next video immediately but in background (z-index handle via CSS)
        nextVideoEl.currentTime = 0;
        nextVideoEl.muted = isMuted;
        const playPromise = nextVideoEl.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => console.log('Autoplay prevented on next video', e));
        }

        // 2. CSS Animations for slides
        const slides = document.querySelectorAll('.slide');
        slides[currentIndex].classList.remove('active');
        slides[index].classList.add('active');

        // 3. Update Playlist active state
        const items = document.querySelectorAll('.playlist-item');
        items[currentIndex].classList.remove('active');
        items[index].classList.add('active');

        // Scroll playlist to bring item into view
        items[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Update state
        currentIndex = index;
        updateInfo();
        progressFill.style.width = `0%`; // Reset progress visually

        // 4. Cleanup old video after transition completes (wait 1.2s approx)
        setTimeout(() => {
            currentVideoEl.pause();
            currentVideoEl.currentTime = 0;
            isTransitioning = false;
        }, 1200);

        // Ensure button states match
        iconPlay.style.display = 'none';
        iconPause.style.display = 'block';
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
            iconPlay.style.display = 'none';
            iconPause.style.display = 'block';
        } else {
            vid.pause();
            iconPause.style.display = 'none';
            iconPlay.style.display = 'block';
        }
    });

    // Playlist button now scrolls to current video if clicked
    playlistBtn.addEventListener('click', () => {
        const activeItem = document.querySelector('.playlist-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

    // Fade-in animation for title on update
    titleEl.style.transition = 'opacity 0.3s ease';
});
