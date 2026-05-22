document.addEventListener("DOMContentLoaded", function () {

    const bannerLayout = document.querySelector(".hero-banner-layout");

    if (!bannerLayout) return;

    window.addEventListener("scroll", function () {

        if (window.scrollY > 200) {
            bannerLayout.classList.add("banner-active-layout");
        } else {
            bannerLayout.classList.remove("banner-active-layout");
        }

    });

});