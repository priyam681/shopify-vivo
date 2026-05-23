document.addEventListener("DOMContentLoaded", function () {

    const bannerLayout = document.querySelector(".hero-banner-layout");

    if (!bannerLayout) return;

    window.addEventListener("scroll", function () {

        if (window.scrollY > 200) {
            bannerLayout.classList.add("page-width");
        } else {
            bannerLayout.classList.remove("page-width");
        }

    });

});