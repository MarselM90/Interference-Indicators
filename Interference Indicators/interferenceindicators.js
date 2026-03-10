(function() {
  if (window.location.href.includes('setup') || 
      window.location.href.includes('wizard') || 
      window.location.href.includes('admin') ||
      window.location.href.includes('config')) {
    console.log('ACI/CCI plugin: off');
    return;
  }

  var CONFIG = {
    maxValue: 99,
    minDisplay: 0,
    barWidth: 50,
    borderRadius: 3,
    fontSize: 10,
    containerHeight: 1150,
    unLeft: 415,
    unTop: 98,
    mpLeft: 415,
    mpTop: 158,
    unMinWidth: -200,
    unMaxWidth: 1150,
    mpMinWidth: 0,
    mpMaxWidth: 1150
  };

  var lastUN = CONFIG.minDisplay;
  var lastMP = CONFIG.minDisplay;

  function extendStyle(element, styles) {
    for (var key in styles) {
      if (styles.hasOwnProperty(key)) element.style[key] = styles[key];
    }
  }

  document.addEventListener('DOMContentLoaded', function() {

    var unContainer = document.createElement('div');
    extendStyle(unContainer, {
      position: 'fixed',
      top: CONFIG.unTop + 'px',
      left: CONFIG.unLeft + 'px',
      width: CONFIG.containerHeight + 'px',
      height: CONFIG.barWidth + 'px',
      background: 'transparent',
      overflow: 'visible',
      pointerEvents: 'none',
      zIndex: '1'
    });
    document.body.appendChild(unContainer);

    var mpContainer = document.createElement('div');
    extendStyle(mpContainer, {
      position: 'fixed',
      top: CONFIG.mpTop + 'px',
      left: CONFIG.mpLeft + 'px',
      width: CONFIG.containerHeight + 'px',
      height: CONFIG.barWidth + 'px',
      background: 'transparent',
      overflow: 'visible',
      pointerEvents: 'none',
      zIndex: '1'
    });
    document.body.appendChild(mpContainer);

    var unCanvas = document.createElement('canvas');
    unCanvas.width = unContainer.offsetWidth;
    unCanvas.height = unContainer.offsetHeight;
    unContainer.appendChild(unCanvas);
    var unCtx = unCanvas.getContext('2d');

    var mpCanvas = document.createElement('canvas');
    mpCanvas.width = mpContainer.offsetWidth;
    mpCanvas.height = mpContainer.offsetHeight;
    mpContainer.appendChild(mpCanvas);
    var mpCtx = mpCanvas.getContext('2d');

    function drawRoundedBar(ctx, x, y, width, height, radius, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.fill();
      ctx.closePath();
    }

    function getButtonColor() {
      var btn = document.querySelector('button, .btn, .button');
      var color = '#FFA500'; // fallback portocaliu
      if (btn) {
        color = getComputedStyle(btn).backgroundColor || color;
        if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
          color = getComputedStyle(btn).color || '#FFA500';
        }
      }
      return color;
    }

    function drawHorizontalBar(ctx, value, invert, minW, maxW, container) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      var range = maxW - minW;
      var displayValue = invert ? CONFIG.maxValue - value : value;
      var scaledWidth = minW + (displayValue / CONFIG.maxValue) * range;
      if (scaledWidth > maxW) scaledWidth = maxW;
      if (scaledWidth < minW) scaledWidth = minW;

      var barColor = getButtonColor();
      drawRoundedBar(ctx, 0, 0, scaledWidth, CONFIG.barWidth, CONFIG.borderRadius, barColor);
    }

    function drawLabel(container, text) {
      var existingLabel = container.querySelector('.bar-label');
      if (existingLabel) container.removeChild(existingLabel);
      var label = document.createElement('div');
      label.className = 'bar-label';
      label.style.position = 'absolute';
      label.style.left = '-40px';
      label.style.top = '50%';
      label.style.transform = 'translateY(-50%)';
      label.style.width = '35px';
      label.style.textAlign = 'right';
      label.style.fontSize = CONFIG.fontSize + 'px';
      label.style.fontFamily = 'Arial, sans-serif';
      label.style.pointerEvents = 'none';
      label.style.textShadow = '1px 1px 2px black';
      label.textContent = text;

      // seteaza culoarea labelului la culoarea butonului
      label.style.color = getButtonColor();

      container.appendChild(label);
    }

    function render() {
      drawHorizontalBar(unCtx, lastUN, true, CONFIG.unMinWidth, CONFIG.unMaxWidth, unContainer);
      drawLabel(unContainer, 'ACI');
      drawHorizontalBar(mpCtx, lastMP, false, CONFIG.mpMinWidth, CONFIG.mpMaxWidth, mpContainer);
      drawLabel(mpContainer, 'CCI');
      requestAnimationFrame(render);
    }

    render();

    if (typeof socket !== 'undefined') {
      socket.addEventListener('message', function(event) {
        try {
          var data = JSON.parse(event.data);
          if (data.sigRaw) {
            var sigRawValues = data.sigRaw.split(',');
            if (sigRawValues.length >= 2) {
              var unValue = parseInt(sigRawValues[0].slice(2)) || 0;
              var mpValue = parseInt(sigRawValues[1]) || 0;
              if (typeof IS_TEF_RADIO !== 'undefined' && IS_TEF_RADIO) {
                mpValue = Math.max(0, Math.min(100, ((mpValue - 3) / (40 - 3)) * 100));
              }
              lastUN = Math.min(Math.max(CONFIG.minDisplay, unValue), CONFIG.maxValue);
              lastMP = Math.min(Math.max(CONFIG.minDisplay, mpValue), CONFIG.maxValue);
            }
          }
        } catch (e) {
          console.error('Error parsing socket data for ACI/CCI', e);
        }
      });
    }

  });
})();