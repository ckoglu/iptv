document.addEventListener("DOMContentLoaded", function () {

    // --- SMART TV ALGILAMA ---
    const userAgent = navigator.userAgent.toLowerCase();
    const isSmartTV = userAgent.includes("tizen") || userAgent.includes("webos") ||
                      userAgent.includes("smart-tv") || userAgent.includes("smarttv") ||
                      userAgent.includes("netcast") || userAgent.includes("appletv") ||
                      userAgent.includes("android tv");

    if (isSmartTV) {
        document.body.classList.add("tv-mode");
        enableTVNavigation();
    }

});

function enableTVNavigation() {
    console.log("TV Mode Active");

    // Fare tamamen devre dışı
    document.body.style.cursor = "none";
    document.addEventListener("mousemove", e => e.preventDefault(), true);
    document.addEventListener("mousedown", e => e.preventDefault(), true);
    document.addEventListener("mouseup", e => e.preventDefault(), true);

    // Focuslanabilir elemanları al
    let focusable = getFocusableElements();
    let focusIndex = 0;
    focusable[focusIndex]?.focus();

    // Kumanda yön tuşları
    document.addEventListener("keydown", (e) => {
        switch (e.key) {
            case "ArrowUp":
            case "ArrowLeft":
                e.preventDefault();
                moveFocus(-1);
                break;
            case "ArrowDown":
            case "ArrowRight":
                e.preventDefault();
                moveFocus(1);
                break;
            case "Enter":
                e.preventDefault();
                const el = document.activeElement;
                if (el) el.click();
                break;
        }
    });

    function getFocusableElements() {
        return Array.from(document.querySelectorAll(
            '.nav-btn, .quick-btn, .content-item, .search-btn, .back-btn, input, button, [tabindex]'
        ));
    }

    function moveFocus(direction) {
        focusable = getFocusableElements();
        focusIndex = (focusIndex + direction + focusable.length) % focusable.length;
        focusable[focusIndex].focus();
        focusable[focusIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}
