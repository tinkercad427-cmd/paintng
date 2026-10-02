(function(){
  var W=900,H=560,cv=document.getElementById('cv'),ctx=cv.getContext('2d',{willReadFrequently:true});
  var TOOLS=[['pencil','✏️','Lápiz'],['brush','🖌️','Pincel suave'],['eraser','🧽','Borrador'],['spray','💨','Spray'],['line','╱','Línea'],['rect','▭','Rectángulo'],['ellipse','◯','Elipse'],['tri','△','Triángulo'],['bucket','🪣','Bote de pintura'],['pick','💧','Cuentagotas'],['text','T','Texto']];
  var COLORS=['#000000','#4d4d4d','#8c8c8c','#ffffff','#c0392b','#e74c3c','#e67e22','#f1c40f','#27ae60','#16a085','#2980b9','#8e44ad','#7b4a2a','#fd79a8','#a3e635','#22d3ee','#1e3a8a','#6d28d9','#f5deb3','#0f766e','#be123c','#facc15','#94a3b8','#fb923c'];
  var tool='pencil',color='#000000',size=4,alpha=1,fillOn=false,down=false,sx=0,sy=0,lx=0,ly=0,snap=null,undoS=[],redoS=[];
  var $=function(i){return document.getElementById(i)};
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);

  var tb=$('tools');
  TOOLS.forEach(function(t){var b=document.createElement('button');b.textContent=t[1];b.title=t[2];b.setAttribute('aria-label',t[2]);b.dataset.t=t[0];b.onclick=function(){setTool(t[0])};tb.appendChild(b)});
  var pal=$('pal');
  COLORS.forEach(function(c){var b=document.createElement('button');b.className='sw';b.style.background=c;b.title=c;b.setAttribute('aria-label','Color '+c);b.onclick=function(){setColor(c)};pal.appendChild(b)});

  function setTool(t){
    tool=t;
    [].forEach.call(tb.children,function(b){b.classList.toggle('on',b.dataset.t===t)});
    var tx=t==='text';$('txt').classList.toggle('hide',!tx);$('font').classList.toggle('hide',!tx);
    $('msg').textContent=({text:'Escribe el texto y haz clic en el lienzo',bucket:'Haz clic en una zona para rellenarla',pick:'Haz clic para copiar un color'})[t]||'Arrastra sobre el lienzo';
    cv.style.cursor=(t==='pick'||t==='bucket')?'copy':t==='text'?'text':'crosshair';
  }
  function setColor(c){color=c;$('col').value=c}
  $('col').oninput=function(e){color=e.target.value};
  $('size').oninput=function(e){size=+e.target.value;$('sv').textContent=size};
  $('opa').oninput=function(e){alpha=e.target.value/100};
  $('fillT').onclick=function(){fillOn=!fillOn;this.classList.toggle('on',fillOn)};

  function push(){
    undoS.push(ctx.getImageData(0,0,W,H));if(undoS.length>30)undoS.shift();
    redoS=[];upd();
  }
  function upd(){$('undo').disabled=!undoS.length;$('redo').disabled=!redoS.length}
  function undo(){if(!undoS.length)return;redoS.push(ctx.getImageData(0,0,W,H));ctx.putImageData(undoS.pop(),0,0);upd()}
  function redo(){if(!redoS.length)return;undoS.push(ctx.getImageData(0,0,W,H));ctx.putImageData(redoS.pop(),0,0);upd()}
  $('undo').onclick=undo;$('redo').onclick=redo;
  $('clear').onclick=function(){push();ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H)};
  document.addEventListener('keydown',function(e){
    if(e.target.tagName==='INPUT')return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}
    else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}
  });

  $('save').onclick=function(){
    cv.toBlob(function(blob){
      var a=document.createElement('a');
      a.href=URL.createObjectURL(blob);a.download='mini-paint.png';
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(function(){URL.revokeObjectURL(a.href)},1000);
      $('msg').textContent='Imagen guardada';
    },'image/png');
  };

  function pos(e){var r=cv.getBoundingClientRect();return[(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height]}
  function style(){ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=size;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowBlur=0}

  function shape(t,x1,y1,x2,y2){
    ctx.beginPath();
    if(t==='line'){ctx.moveTo(x1,y1);ctx.lineTo(x2,y2)}
    else if(t==='rect'){ctx.rect(x1,y1,x2-x1,y2-y1)}
    else if(t==='ellipse'){ctx.ellipse((x1+x2)/2,(y1+y2)/2,Math.abs(x2-x1)/2,Math.abs(y2-y1)/2,0,0,Math.PI*2)}
    else{ctx.moveTo((x1+x2)/2,y1);ctx.lineTo(x2,y2);ctx.lineTo(x1,y2);ctx.closePath()}
    if(fillOn&&t!=='line')ctx.fill();
    ctx.stroke();
  }

  function flood(x,y){
    x|=0;y|=0;
    var id=ctx.getImageData(0,0,W,H),d=id.data,i0=(y*W+x)*4,tr=d[i0],tg=d[i0+1],tb2=d[i0+2],ta=d[i0+3];
    var n=parseInt(color.slice(1),16),r=n>>16,g=(n>>8)&255,b=n&255,a=alpha;
    var tol=40;
    function near(i){return Math.abs(d[i]-tr)+Math.abs(d[i+1]-tg)+Math.abs(d[i+2]-tb2)+Math.abs(d[i+3]-ta)<=tol}
    if(Math.abs(r-tr)+Math.abs(g-tg)+Math.abs(b-tb2)<=tol&&ta===255&&a===1)return;
    var seen=new Uint8Array(W*H),st=[x,y];
    while(st.length){
      var py=st.pop(),px=st.pop(),p=py*W+px;
      if(px<0||py<0||px>=W||py>=H||seen[p])continue;
      var i=p*4;if(!near(i))continue;
      seen[p]=1;
      d[i]=Math.round(d[i]*(1-a)+r*a);d[i+1]=Math.round(d[i+1]*(1-a)+g*a);d[i+2]=Math.round(d[i+2]*(1-a)+b*a);d[i+3]=255;
      st.push(px+1,py,px-1,py,px,py+1,px,py-1);
    }
    ctx.putImageData(id,0,0);
  }

  function hex(v){return('0'+v.toString(16)).slice(-2)}

  cv.addEventListener('pointerdown',function(e){
    if(e.button>0)return;
    var p=pos(e),x=p[0],y=p[1];
    cv.setPointerCapture(e.pointerId);
    if(tool==='pick'){var d=ctx.getImageData(x|0,y|0,1,1).data;setColor('#'+hex(d[0])+hex(d[1])+hex(d[2]));return}
    push();
    if(tool==='bucket'){flood(x,y);return}
    if(tool==='text'){
      var t=$('txt').value;if(!t){$('msg').textContent='Escribe primero el texto en la barra';undoS.pop();upd();return}
      style();ctx.font=Math.max(10,size*4)+'px '+$('font').value;ctx.textBaseline='middle';ctx.fillText(t,x,y);return;
    }
    down=true;sx=lx=x;sy=ly=y;snap=ctx.getImageData(0,0,W,H);
    if(tool==='pencil'||tool==='eraser'||tool==='brush'){
      style();
      if(tool==='eraser'){ctx.globalAlpha=1;ctx.strokeStyle='#fff'}
      if(tool==='brush'){ctx.shadowBlur=size;ctx.shadowColor=color}
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+.01,y+.01);ctx.stroke();
    }
  });

  cv.addEventListener('pointermove',function(e){
    var p=pos(e),x=p[0],y=p[1];
    $('pos').textContent='x: '+(x|0)+', y: '+(y|0);
    if(!down)return;
    if(tool==='pencil'||tool==='eraser'||tool==='brush'){
      ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(x,y);ctx.stroke();lx=x;ly=y;
    }else if(tool==='spray'){
      style();ctx.globalAlpha=Math.min(alpha,.6);
      for(var i=0;i<14;i++){
        var a=Math.random()*6.283,r=Math.random()*size*2.2;
        ctx.fillRect(x+Math.cos(a)*r,y+Math.sin(a)*r,1.5,1.5);
      }
    }else{
      ctx.putImageData(snap,0,0);style();shape(tool,sx,sy,x,y);
    }
  });

  function end(){
    if(!down)return;down=false;snap=null;
    ctx.globalAlpha=1;ctx.shadowBlur=0;
  }
  cv.addEventListener('pointerup',end);
  cv.addEventListener('pointercancel',end);

  setTool('pencil');upd();
})();
