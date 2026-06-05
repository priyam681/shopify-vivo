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

document.addEventListener('click', function(e){

  if(!e.target.classList.contains('compare-btn')) return;

  e.preventDefault();

  const handle = e.target.dataset.productHandle;

  let compareProducts =
    JSON.parse(localStorage.getItem('compare_products')) || [];

  if(compareProducts.includes(handle)){
    compareProducts = compareProducts.filter(item => item !== handle);
    e.target.classList.remove('is-added');
    e.target.innerText = 'Compare';
  }else{
    compareProducts.push(handle);
    e.target.classList.add('is-added');
    e.target.innerText = 'Added';
  }

  localStorage.setItem(
    'compare_products',
    JSON.stringify(compareProducts)
  );
});