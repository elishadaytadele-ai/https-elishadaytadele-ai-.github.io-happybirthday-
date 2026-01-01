// Guided cinematic birthday experience
(() => {
	const pages = Array.from(document.querySelectorAll('.page'));
	const backBtn = document.getElementById('backBtn');
	const openGift = document.getElementById('openGift');
	const bgMusic = document.getElementById('bgMusic');
	let current = 0;
	let engaged = false;

	function hideAllHearts(){
		document.querySelectorAll('.heart-btn').forEach(b=>b.classList.remove('show','pulse'));
	}

	function showHeartForPage(index){
		// deterministic: always hide all first, then explicitly enable the one allowed for this index
		hideAllHearts();
		const page = pages[index];
		if(!page) return;
		const btn = page.querySelector('.heart-btn');
		if(!btn) return;
		switch(index){
			case 0: // locked gift: always visible
				btn.classList.add('show');
				break;
			case 1: // photo cards: shown only after user interacts (card click)
				btn.classList.add('show');
				break;
			case 2: // edit video: shown only after video 'ended'
				btn.classList.add('show');
				break;
			case 3: // cinematic video: shown after video engagement (play)
				btn.classList.add('show');
				break;
			case 4: // future: visible immediately
				btn.classList.add('show');
				break;
			case 5: // letter typing: shown after typing finishes
				btn.classList.add('show');
				break;
			case 6: // final: never visible
				break;
			default:
				break;
		}
	}

	function showPage(index){
		// blur any focused element before hiding pages to avoid focus leakage
		try{ if(document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); }catch(e){}

		pages.forEach((p,i)=>{
			const visible = i===index;
			p.setAttribute('aria-hidden', visible? 'false':'true');
			// use inert to block interaction on inactive pages; fallback to attribute if property unsupported
			try{ p.inert = !visible; }catch(e){ if(!visible) p.setAttribute('inert',''); else p.removeAttribute('inert'); }
		});

		current = index;
		// back button hidden on page 1
		backBtn.style.display = index===0 ? 'none' : 'block';
		// deterministic heart control
		showHeartForPage(index);

		// set focus to the active page or its visible heart button
		const active = pages[index];
		if(active){
			const heart = active.querySelector('.heart-btn.show');
			if(heart){ try{ heart.focus({preventScroll:true}); }catch(e){ heart.focus(); } }
			else { active.setAttribute('tabindex','-1'); try{ active.focus({preventScroll:true}); }catch(e){ active.focus(); } }
		}
	}

	function nextPage(){
		if(current < pages.length -1){
			showPage(current+1);
		}
	}
	function prevPage(){
		if(current > 0){
			showPage(current-1);
		}
	}

	// Page 1 open gift
	openGift.addEventListener('click', async (e)=>{
		e.stopPropagation();
		e.preventDefault();
		if(!engaged){
			engaged = true;
			try{ await bgMusic.play(); }catch(e){}
			openGift.classList.add('scale');
			openGift.style.transform = 'scale(1.03)';
			setTimeout(()=>{
				openGift.style.transform = '';
				showPage(1);
			},600);
		}
	});

	// Global back
	backBtn.addEventListener('click', ()=>{
		prevPage();
	});

	// Photo cards interactions (page 2)
	const cardsWrap = document.getElementById('cards');
	if(cardsWrap){
		cardsWrap.addEventListener('click', (e)=>{
			const card = e.target.closest('.card');
			if(!card) return;
			card.classList.toggle('flipped');
			// user interaction -> enable heart for page index 1
			const pageIndex = 1; if(pages[pageIndex]) showHeartForPage(pageIndex);
		});
		// hover flip for desktop
		cardsWrap.querySelectorAll('.card').forEach(c=>{
			c.addEventListener('mouseenter', ()=>{ if(window.matchMedia('(hover: hover)').matches) c.classList.add('flipped'); });
			c.addEventListener('mouseleave', ()=>{ if(window.matchMedia('(hover: hover)').matches) c.classList.remove('flipped'); });
		});
	}

	// Page 3 video: show heart after ends
	const page3Video = document.getElementById('page3Video');
	if(page3Video){
		// try autoplay but muted
		page3Video.addEventListener('loadeddata', ()=>{
			try{ page3Video.play(); }catch(e){}
		});
		page3Video.addEventListener('ended', ()=>{
			// deterministic: show heart for page index 2 when video fully ended
			showHeartForPage(2);
		});
	}

	// Page 4 video: pause bg music, show heart on end or 75%
	const page4Video = document.getElementById('page4Video');
	if(page4Video){
		page4Video.addEventListener('play', ()=>{
			try{ bgMusic.pause(); }catch(e){}
		});
		page4Video.addEventListener('ended', ()=>{
			try{ bgMusic.play(); }catch(e){}
			showHeartForPage(3);
		});
		// show heart for page 3 when user engages (plays) the video
		page4Video.addEventListener('play', ()=>{
			showHeartForPage(3);
		});
	}

	// Heart buttons advance single step only
	document.addEventListener('click', (e)=>{
		const hb = e.target.closest('.heart-btn');
		if(!hb) return;
		// prevent on final page
		if(current === pages.length-1) return;
		const parent = hb.closest('.page');
		if(parent){
			const idx = parseInt(parent.dataset.index,10);
			// only allow advancing when the heart belongs to the active page
			if(!isNaN(idx) && idx === current){
				nextPage();
			}
		} 
	});

	// Page 5 fade in content when shown
	const observer = new MutationObserver((mut)=>{
		mut.forEach(m=>{
			if(m.attributeName === 'aria-hidden'){
				const target = m.target;
				if(target.id === 'page5' && target.getAttribute('aria-hidden')==='false'){
					// animate list items (timing is for animation only, not heart visibility)
					target.querySelectorAll('.future-list li').forEach((li,i)=>{
						li.style.opacity=0; li.style.transform='translateY(8px)';
						setTimeout(()=>{ li.style.transition='opacity 400ms ease,transform 400ms'; li.style.opacity=1; li.style.transform='none'; }, 300 + i*180);
					});
					// heart for page index 4 should be visible immediately when this page is shown
					showHeartForPage(4);
				}
			}
		});
	});
	pages.forEach(p=>observer.observe(p,{attributes:true}));

	// Page 6 typing letter
	const letterEl = document.getElementById('letter');
	const letterText = "I love the way you make small things important. I love your courage, the warmth you bring, the way you make me feel seen. Today I celebrate you — every little and huge thing that is you."
	function typeLetter(text, el, speed=28){
		let i=0; el.textContent='';
		const t = setInterval(()=>{
			el.textContent += text[i]||''; i++;
			if(i>text.length){
				clearInterval(t);
				// when typing finishes, deterministically show heart for page 5
				showHeartForPage(5);
			}
		}, speed);
	}

	// Start typing when page shown
	const mo = new MutationObserver((mut)=>{
		mut.forEach(m=>{
			if(m.attributeName==='aria-hidden' && m.target.id==='page6' && m.target.getAttribute('aria-hidden')==='false'){
				// lower bg music volume
				if(bgMusic) bgMusic.volume = 0.3;
				setTimeout(()=>typeLetter(letterText, letterEl, 26), 600);
			}
		});
	});
	const p6 = document.getElementById('page6'); if(p6) mo.observe(p6,{attributes:true});

	// Initialize: no scroll
	document.documentElement.style.overflow='hidden';
	showPage(0);

	// keyboard accessibility: right/left
	window.addEventListener('keydown', (e)=>{
		if(e.key === 'ArrowRight' || e.key==='Enter') nextPage();
		if(e.key === 'ArrowLeft') prevPage();
	});

	// ensure back button initial visibility
	backBtn.style.display = 'none';

})();

