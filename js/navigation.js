document.addEventListener("DOMContentLoaded", function () {
    const userAgent = navigator.userAgent.toLowerCase();
    const isSmartTV =
        userAgent.includes("tizen") ||
        userAgent.includes("webos") ||
        userAgent.includes("smart-tv") ||
        userAgent.includes("smarttv") ||
        userAgent.includes("netcast") ||
        userAgent.includes("appletv") ||
        userAgent.includes("android tv");

    if (isSmartTV) {
        document.body.classList.add("tv-mode");
        initSmartTVMode();
    }
});

function initSmartTVMode() {
    console.log("SMART TV MODE ACTIVE");

    // Fare ve touch devre dışı
    document.body.style.cursor = "none";
    ["mousemove", "mousedown", "mouseup", "touchstart", "touchmove", "wheel"].forEach(evt =>
        document.addEventListener(evt, e => e.preventDefault(), { passive: false })
    );

    // Odaklanabilir elemanları belirle
    let focusable = getFocusableElements();
    let currentIndex = 0;

    // İlk odak
    if (focusable.length > 0) focusable[0].focus();

    // Kumanda tuşları dinleyici
    document.addEventListener("keydown", handleTVKey);
    
    // Tizen özel tuşlar (geri, menü, exit)
    if (typeof tizen !== "undefined" && tizen.tvinputdevice) {
        tizen.tvinputdevice.registerKey("MediaPlayPause");
        tizen.tvinputdevice.registerKey("ColorF0Red");
        tizen.tvinputdevice.registerKey("ColorF1Green");
        tizen.tvinputdevice.registerKey("ColorF2Yellow");
        tizen.tvinputdevice.registerKey("ColorF3Blue");
        tizen.tvinputdevice.registerKey("Return");
        tizen.tvinputdevice.registerKey("Exit");
    }

    function handleTVKey(e) {
        const key = e.key || e.keyCode;
        switch (key) {
            case "ArrowUp":
            case 38:
                e.preventDefault();
                moveFocus("up");
                break;
            case "ArrowDown":
            case 40:
                e.preventDefault();
                moveFocus("down");
                break;
            case "ArrowLeft":
            case 37:
                e.preventDefault();
                moveFocus("left");
                break;
            case "ArrowRight":
            case 39:
                e.preventDefault();
                moveFocus("right");
                break;
            case "Enter":
            case 13:
                e.preventDefault();
                const el = document.activeElement;
                if (el) el.click();
                break;
            case "Backspace":
            case "Return":
            case 10009: // Tizen RETURN keycode
                e.preventDefault();
                window.history.back();
                break;
            case "Exit":
            case 10182:
                e.preventDefault();
                tizen.application.getCurrentApplication().exit();
                break;
        }
    }

    function getFocusableElements() {
        return Array.from(document.querySelectorAll(
            '.nav-btn, .quick-btn, .content-item, .search-btn, .back-btn, button, input, [tabindex]'
        ));
    }

    function moveFocus(direction) {
        focusable = getFocusableElements();
        if (focusable.length === 0) return;

        const current = document.activeElement;
        const currentRect = current.getBoundingClientRect();

        let next = null;
        let minDistance = Infinity;

        focusable.forEach(el => {
            if (el === current) return;
            const rect = el.getBoundingClientRect();
            const dx = rect.left - currentRect.left;
            const dy = rect.top - currentRect.top;

            if (direction === "up" && dy < 0 && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) < minDistance) {
                minDistance = Math.abs(dy);
                next = el;
            }
            if (direction === "down" && dy > 0 && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) < minDistance) {
                minDistance = Math.abs(dy);
                next = el;
            }
            if (direction === "left" && dx < 0 && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) < minDistance) {
                minDistance = Math.abs(dx);
                next = el;
            }
            if (direction === "right" && dx > 0 && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) < minDistance) {
                minDistance = Math.abs(dx);
                next = el;
            }
        });

        if (next) {
            next.focus();
            next.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        }
    }
}
