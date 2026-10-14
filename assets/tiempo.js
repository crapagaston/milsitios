(() => {
  'use strict';
  const $ = id => document.getElementById(id), rules = window.TimeRules;
  const pad = $('time-pad'), ids = ['mode','target','difficulty','length','lives','variant'];
  const storage = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } }, set(k,v) { try { localStorage.setItem(k,JSON.stringify(v)); } catch (_) {} } };
  let config, state='setup', level=1, hits=0, lives=0, points=0, attempts=0, successes=0, started=0, frame, current, rows=[], best=0;
  const saved=storage.get('milsitios.time.settings.v1');
  if(saved && typeof saved==='object') ids.forEach(id=>{if([...$(id).options].some(o=>o.value===String(saved[id]))) $(id).value=String(saved[id]);});
  const readConfig=()=>({mode:$('mode').value,target:Number($('target').value),difficulty:$('difficulty').value,length:Number($('length').value),lives:Number($('lives').value),variant:Number($('variant').value)});
  const key=()=>`milsitios.time.record.v1.${config.mode}.${config.target}.${config.difficulty}.${config.mode==='adventure'?`${config.length}.${config.lives}`:config.variant}`;
  const fmt=v=>v.toFixed(2).replace('.',',');
  function options(){ const practice=$('mode').value==='practice'; $('adventure-options').hidden=practice;$('practice-options').hidden=!practice;$('start').textContent=practice?'Empezar práctica':'Empezar aventura';$('config-help').textContent=practice?'Sin vidas ni límite de intentos. Practicá a tu ritmo.':'Tres aciertos por nivel. Los errores gastan una vida.';$('goal').textContent=`Objetivo: ${$('target').value} segundos`;$('clock').textContent=Number($('target').value).toFixed(2); }
  ids.forEach(id=>$(id).addEventListener('change',options));options();
  function stats(){ const practice=config.mode==='practice';$('progress-label').textContent=practice?'Intentos':'Nivel';$('level').textContent=practice?attempts:`${level} / ${config.length}`;$('hits').textContent=practice?successes:`${hits} / 3`;$('remaining').textContent=practice?'∞':lives;$('points').textContent=points;$('record').textContent=practice?`Mejor precisión con esta configuración: ${best?fmt(best/1000)+' s de error':'—'}`:`Tu récord para esta configuración: ${best} puntos`; }
  function feedback(text,result=''){ $('feedback').textContent=text;$('feedback').dataset.result=result; }
  function prepare(){
    cancelAnimationFrame(frame);state='ready';pad.dataset.running='false';pad.disabled=false;
    current=rules.challenge(config,level,attempts);stats();
    $('variant-name').textContent=current.name;$('goal').textContent=`Objetivo: ${fmt(current.target)} s · Margen: ±${fmt(current.tolerance)} s`;
    const hints=[`El reloj se oculta a los ${fmt(current.visible)} s. Frená al llegar al objetivo.`,`No vas a ver el reloj. Contá mentalmente hasta ${fmt(current.target)} s.`,`La cuenta baja desde ${fmt(current.target)}. Frená cuando creas que llega a cero.`,`El reloj aparece brevemente cada 3 segundos, hasta la mitad del objetivo.`,`El objetivo cambia en cada intento. Esta vez: ${fmt(current.target)} segundos.`,`Solo tenés ${fmt(current.visible)} segundos de reloj visible. Después, a ciegas.`];
    $('instruction').textContent=hints[current.variant];$('pad-caption').textContent='El cronómetro empieza cuando tocás';$('clock').textContent=current.variant===2?current.target.toFixed(2):'0.00';$('pad-action').textContent='Tocá para empezar';
  }
  function start(){ config=readConfig();storage.set('milsitios.time.settings.v1',config);level=1;hits=0;lives=config.lives;points=0;attempts=0;successes=0;rows=[];
    const record=storage.get(key());best=typeof record==='number'&&Number.isFinite(record)&&record>0?record:0;
    $('settings').disabled=true;$('start').hidden=true;$('new-game').hidden=false;$('finish-actions').hidden=true;$('share-status').textContent='';$('history').replaceChildren();feedback('Todo listo. El tiempo no corre hasta que toques el recuadro.');prepare();pad.focus({preventScroll:true});
  }
  function tick(){
    if(state!=='running')return;
    const elapsed=(performance.now()-started)/1000;
    if(elapsed>=current.target+Math.max(10,current.target)){finishAttempt(elapsed,true);return;}
    const visible=current.variant===3 ? elapsed<current.target/2 && (elapsed<0.6 || elapsed%3<0.45) : elapsed<current.visible;
    $('clock').textContent=visible?(current.variant===2?Math.max(0,current.target-elapsed):elapsed).toFixed(2):'···';
    frame=requestAnimationFrame(tick);
  }
  function complete(won){ state='finished';pad.disabled=true;$('clock').textContent=won?'✓':'↺';$('pad-caption').textContent=won?'¡Completaste todos los niveles!':'Te quedaste sin vidas';$('pad-action').textContent=`${points} puntos · ${successes} aciertos en ${attempts} intentos`;$('finish-actions').hidden=false;feedback(`${won?'¡Aventura completa!':'Fin de la aventura.'} Llegaste al nivel ${level} de ${config.length} con ${points} puntos. Podés volver a jugar o cambiar la configuración.`,won?'success':'miss'); }
  function finishAttempt(elapsed,timeout=false){
    cancelAnimationFrame(frame);pad.dataset.running='false';state='result';
    const result=rules.score(elapsed,current);attempts++;if(result.success){successes++;hits++;points+=result.points;}else if(config.mode==='adventure')lives--;
    const errorMs=Math.max(1,Math.round(Math.abs(result.error)*1000));
    if(config.mode==='adventure'&&points>best){best=points;storage.set(key(),best);}else if(config.mode==='practice'&&(!best||errorMs<best)){best=errorMs;storage.set(key(),best);}
    const detail=`${fmt(elapsed)} s · ${fmt(Math.abs(result.error))} s ${result.error<0?'antes':'después'} del objetivo`;
    rows.unshift({level,detail,success:result.success});rows=rows.slice(0,10);$('history').replaceChildren(...rows.map(row=>{const li=document.createElement('li'),a=document.createElement('span'),b=document.createElement('span');a.textContent=`${config.mode==='adventure'?'Nivel '+row.level+' · ':''}${row.detail}`;b.textContent=row.success?'✓ Acierto':'✕ Fallo';li.append(a,b);return li;}));
    stats();$('clock').textContent=elapsed.toFixed(2);$('pad-caption').textContent=result.success?'¡Lo clavaste!':timeout?'Se terminó el intento':'Un poquito más de práctica';$('pad-action').textContent='Tocá para preparar el próximo intento';
    let message=`${result.success?'¡Dentro del margen!':'Fuera del margen.'} ${detail}. ${result.success?'+'+result.points+' puntos.':config.mode==='adventure'?'Perdés una vida.':'Seguís practicando sin penalización.'}`;
    if(config.mode==='adventure'&&lives===0){complete(false);return;}
    if(config.mode==='adventure'&&hits===3){if(level===config.length){complete(true);return;}level++;hits=0;message+=` ¡Pasaste al nivel ${level}! El próximo desafío tiene menos margen.`;$('pad-action').textContent=`Ver desafío del nivel ${level}`;}
    feedback(message,result.success?'success':'miss');
  }
  function activate(){
    if(document.hidden)return;
    if(state==='ready'){state='running';started=performance.now();pad.dataset.running='true';$('pad-caption').textContent=current.variant===2?'Frená cuando llegue a cero':'Confiá en tu reloj interno';$('pad-action').textContent='Tocá para frenar';feedback('Intento en curso.');tick();}
    else if(state==='running')finishAttempt((performance.now()-started)/1000);
    else if(state==='result')prepare();
  }
  pad.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0||pad.disabled)return;e.preventDefault();pad.focus({preventScroll:true});activate();});
  pad.addEventListener('keydown',e=>{if(e.key==='Enter'||e.code==='Space'){e.preventDefault();if(!e.repeat)activate();}});
  pad.addEventListener('keyup',e=>{if(e.key==='Enter'||e.code==='Space')e.preventDefault();});
  pad.addEventListener('click',e=>{if(e.detail===0)activate();});
  function pause(){if(state==='running'){cancelAnimationFrame(frame);prepare();feedback('Intento cancelado al salir de la página. No perdiste vidas ni puntos. Tocá para empezar de nuevo.');}}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('blur',pause);
  $('start').addEventListener('click',start);$('again').addEventListener('click',start);
  $('new-game').addEventListener('click',()=>{cancelAnimationFrame(frame);state='setup';$('settings').disabled=false;$('start').hidden=false;$('new-game').hidden=true;$('finish-actions').hidden=true;pad.disabled=true;pad.dataset.running='false';$('pad-caption').textContent='Armá una nueva partida';$('pad-action').textContent='Elegí tu configuración';feedback('Partida terminada. Tus récords se conservan.');options();$('mode').focus();});
  $('share').addEventListener('click',async()=>{const text=`Hice ${points} puntos y llegué al nivel ${level}/${config.length} en Clavá los 10 segundos de MilSitios (${config.difficulty}, ${config.target} s, ${config.lives} vidas). ¿Me ganás?`,url='https://milsitios.netlify.app/clava-los-10-segundos.html';try{if(navigator.share)await navigator.share({text,url});else if(navigator.clipboard){await navigator.clipboard.writeText(text+' '+url);$('share-status').textContent='¡Resultado copiado!';}else $('share-status').textContent=text+' '+url;}catch(e){if(e.name!=='AbortError')$('share-status').textContent=text+' '+url;}});
})();
