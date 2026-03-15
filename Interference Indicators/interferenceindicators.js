(function(){

if(window.location.href.includes('setup')||
   window.location.href.includes('wizard')||
   window.location.href.includes('admin')||
   window.location.href.includes('config')){
   console.log('SDR Plugin: off');
   return;
}

const CONFIG={
  containerHeight:1120,
  barWidth:50,
  fontSize:10,
  mpLeft:415,
  mpTop:97,
  unLeft:415,
  unTop:157
};

let smoothUN = 0;
let smoothWAM = 0;

let minUN = Infinity;
let maxUN = -Infinity;
let minWAM = Infinity;
let maxWAM = -Infinity;

let historyUN = [];
let historyWAM = [];

const restoreCalibration = () => {
    const stored = localStorage.getItem('SDR_CALIBRATION');
    if(stored){
        try{
            const obj = JSON.parse(stored);
            minUN = obj.minUN ?? minUN;
            maxUN = obj.maxUN ?? maxUN;
            minWAM = obj.minWAM ?? minWAM;
            maxWAM = obj.maxWAM ?? maxWAM;
        }catch(e){
            console.warn('SDR plugin: calibration restore failed', e);
        }
    }
};

const saveCalibration = () => {
    const obj = { minUN, maxUN, minWAM, maxWAM };
    localStorage.setItem('SDR_CALIBRATION', JSON.stringify(obj));
};

function extendStyle(el,styles){
  for(let k in styles) el.style[k] = styles[k];
}

function getButtonColor(){
  const btn = document.querySelector('button,.btn,.button');
  let color = '#FFA500';
  if(btn){
    const style = getComputedStyle(btn);
    color = (style.backgroundColor &&
             style.backgroundColor!=='rgba(0, 0, 0, 0)' &&
             style.backgroundColor!=='transparent')
            ? style.backgroundColor : style.color || color;
  }
  return color;
}

function median(arr){
  const a = [...arr].sort((a,b)=>a-b);
  const mid = Math.floor(a.length/2);
  return arr.length%2 ? a[mid] : (a[mid-1]+a[mid])/2;
}

document.addEventListener('DOMContentLoaded',()=>{

  restoreCalibration(); 

  const mpContainer = document.createElement('div');
  extendStyle(mpContainer,{
    position:'fixed',
    top:CONFIG.mpTop+'px',
    left:CONFIG.mpLeft+'px',
    width:CONFIG.containerHeight+'px',
    height:CONFIG.barWidth+'px',
    pointerEvents:'none',
    zIndex:'1'
  });
  document.body.appendChild(mpContainer);

  const mpCanvas = document.createElement('canvas');
  mpCanvas.width = mpContainer.offsetWidth;
  mpCanvas.height = mpContainer.offsetHeight;
  mpContainer.appendChild(mpCanvas);
  const mpCtx = mpCanvas.getContext('2d');

  const unContainer = document.createElement('div');
  extendStyle(unContainer,{
    position:'fixed',
    top:CONFIG.unTop+'px',
    left:CONFIG.unLeft+'px',
    width:CONFIG.containerHeight+'px',
    height:CONFIG.barWidth+'px',
    pointerEvents:'none',
    zIndex:'1'
  });
  document.body.appendChild(unContainer);

  const unCanvas = document.createElement('canvas');
  unCanvas.width = unContainer.offsetWidth;
  unCanvas.height = unContainer.offsetHeight;
  unContainer.appendChild(unCanvas);
  const unCtx = unCanvas.getContext('2d');

  function drawBar(ctx,width,color){
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    ctx.fillStyle = color;
    ctx.fillRect(0,0,width,CONFIG.barWidth);
  }

  function drawLabel(container,text,color){
    let label = container.querySelector('.bar-label');
    if(!label){
      label = document.createElement('div');
      label.className='bar-label';
      container.appendChild(label);
    }
    extendStyle(label,{
      position:'absolute',
      left:'-40px',
      top:'50%',
      transform:'translateY(-50%)',
      width:'35px',
      textAlign:'right',
      fontSize:CONFIG.fontSize+'px',
      fontFamily:'Arial, sans-serif',
      fontWeight:'bold',
      textShadow:'1px 1px 2px black',
      pointerEvents:'none',
      color:color
    });
    label.textContent = text;
  }

  function render(){
    const color = getButtonColor();

    let wamRatio = 0;
    if(maxWAM > minWAM){
      wamRatio = (smoothWAM - minWAM)/(maxWAM - minWAM);
      wamRatio = Math.min(Math.max(0, wamRatio),1);
    }
    drawBar(mpCtx, wamRatio*CONFIG.containerHeight, color);
    drawLabel(mpContainer,'WAM', color);

    let unRatio = 0;
    if(maxUN > minUN){
      unRatio = 1 - (smoothUN - minUN)/(maxUN - minUN);
      unRatio = Math.min(Math.max(0, unRatio),1);
    }
    drawBar(unCtx, unRatio*CONFIG.containerHeight, color);
    drawLabel(unContainer,'USN', color);

    requestAnimationFrame(render);
  }

  render();

  if(typeof socket !== 'undefined'){
    socket.addEventListener('message',(event)=>{
      try{
        const data = JSON.parse(event.data);
        if(data.sigRaw){
          const vals = data.sigRaw.split(',');

          if(vals.length>=2){
          
            let unMatch = vals[0].match(/-?\d+(\.\d+)?/);
            let unRaw = unMatch ? parseFloat(unMatch[0]) : 0;
            historyUN.push(unRaw);
            if(historyUN.length>3) historyUN.shift();
            smoothUN = median(historyUN);

            if(smoothUN < minUN) minUN = smoothUN;
            if(smoothUN > maxUN) maxUN = smoothUN;

            let wamRaw = 0;
            if('wam' in data){
              wamRaw = parseFloat(data.wam) || 0;
            } else {
              wamRaw = parseFloat(vals[1]) || 0;
            }
            historyWAM.push(wamRaw);
            if(historyWAM.length>3) historyWAM.shift();
            smoothWAM = median(historyWAM);

            if(smoothWAM < minWAM) minWAM = smoothWAM;
            if(smoothWAM > maxWAM) maxWAM = smoothWAM;

            localStorage.setItem('SDR_CALIBRATION', JSON.stringify({minUN,maxUN,minWAM,maxWAM}));
          }
        }
      }catch(e){
        console.error('SDR plugin error', e);
      }
    });
  }

});
})();
