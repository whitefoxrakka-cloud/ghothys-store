/* Slider behavior */
(function(){
  window.currentSlide = 0;
  window.totalSlides = 3;
  window.autoSlideTimer = null;

  window.updateSlider = function(){
    const s=document.querySelectorAll('.slider-slide'),d=document.querySelectorAll('.slider-dot');
    s.forEach((el,i)=>el.style.opacity=i===window.currentSlide?'1':'0');
    d.forEach((el,i)=>el.style.opacity=i===window.currentSlide?'1':'0.4');
  };
  window.nextSlide = function(){window.currentSlide=(window.currentSlide+1)%window.totalSlides;window.updateSlider();window.resetAutoSlide();};
  window.prevSlide = function(){window.currentSlide=(window.currentSlide-1+window.totalSlides)%window.totalSlides;window.updateSlider();window.resetAutoSlide();};
  window.goToSlide = function(i){window.currentSlide=i;window.updateSlider();window.resetAutoSlide();};
  window.resetAutoSlide = function(){clearInterval(window.autoSlideTimer);window.autoSlideTimer=setInterval(window.nextSlide,5000);};
})();
