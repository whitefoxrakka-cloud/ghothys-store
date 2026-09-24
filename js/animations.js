/* UI animations (falling stars) */
window.startFallingStars = function(){
  const j=document.querySelector('.jumbotron-custom');if(!j)return;setInterval(()=>{const s=document.createElement('div');s.className='falling-star';s.textContent='⭐';s.style.left=Math.random()*100+'%';s.style.animationDuration=(3+Math.random()*2)+'s';j.appendChild(s);setTimeout(()=>s.remove(),5000);},500);
};
