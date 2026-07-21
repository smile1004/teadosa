document.querySelectorAll('.faq-q').forEach(function(btn){btn.addEventListener('click',function(){btn.parentElement.classList.toggle('open')})});
    var topBtn=document.getElementById('topBtn');
    window.addEventListener('scroll',function(){topBtn.classList.toggle('show',window.scrollY>500)});
    topBtn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'})});
    var partnerBanner=document.getElementById('partnerBanner');
    var partnerLightbox=document.getElementById('partnerLightbox');
    var lightboxClose=document.getElementById('lightboxClose');
    if(partnerBanner&&partnerLightbox&&lightboxClose){
      partnerBanner.addEventListener('click',function(){partnerLightbox.classList.add('show');partnerLightbox.setAttribute('aria-hidden','false')});
      lightboxClose.addEventListener('click',function(){partnerLightbox.classList.remove('show');partnerLightbox.setAttribute('aria-hidden','true')});
      partnerLightbox.addEventListener('click',function(e){if(e.target===partnerLightbox){partnerLightbox.classList.remove('show');partnerLightbox.setAttribute('aria-hidden','true')}});
      document.addEventListener('keydown',function(e){if(e.key==='Escape'){partnerLightbox.classList.remove('show');partnerLightbox.setAttribute('aria-hidden','true')}});
    }
