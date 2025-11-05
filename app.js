(() => {
  const fileInput = document.getElementById('file-input');
  const exportBtn = document.getElementById('export-all');
  const globalLocationInput = document.getElementById('global-location');
  const colorInput = document.getElementById('color');
  const sizeTimeInput = document.getElementById('size-time');
  const sizeSubInput = document.getElementById('size-sub');
  const sizeTimeVal = document.getElementById('size-time-val');
  const sizeSubVal = document.getElementById('size-sub-val');
  const shadowCheck = document.getElementById('shadow');
  const openSettingsBtn = document.getElementById('open-settings');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const previewImg = document.getElementById('preview-img');
  const overlayDiv = document.getElementById('overlay');
  const curTimeInput = document.getElementById('cur-time');
  const curDateInput = document.getElementById('cur-date');
  const curLocationInput = document.getElementById('cur-location');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings');
  const applyAllBtn = document.getElementById('apply-all');
  const globalDateInput = document.getElementById('global-date');
  const ocrBtn = document.getElementById('ocr-time');
  const posXInput = document.getElementById('pos-x');
  const posYInput = document.getElementById('pos-y');
  const alignSelect = document.getElementById('align');
  const lineGapInput = document.getElementById('line-gap');
  const opacityInput = document.getElementById('opacity');
  const posXVal = document.getElementById('pos-x-val');
  const posYVal = document.getElementById('pos-y-val');
  const lineGapVal = document.getElementById('line-gap-val');
  const opacityVal = document.getElementById('opacity-val');
  const photoIndicator = document.getElementById('photo-indicator');
  const photoNameSpan = document.getElementById('photo-name');
  let currentIndex = 0;

  const state = {
    items: [], // { id, file, url, meta:{time,date,location}, exifDate }
    style: {
      color: '#FFFFFF',
      sizeTime: 72,
      sizeSub: 28,
      shadow: true,
      fontFamily: 'Segoe UI, Noto Sans SC, Arial, sans-serif',
      offsetXPercent: 0,
      offsetYPercent: 0,
      align: 'center', // center | left | right
      lineGap: 1.2,
      opacity: 1.0
    }
  };

  function formatDateCN(d) {
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${year}年${month}月${day}日`;
  }
  function formatTimeHM(d) {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  function setStyleFromControls() {
    state.style.color = colorInput.value;
    state.style.sizeTime = Number(sizeTimeInput.value);
    state.style.sizeSub = Number(sizeSubInput.value);
    state.style.shadow = shadowCheck.checked;
    // 位置与间距
    if (posXInput) state.style.offsetXPercent = Number(posXInput.value);
    if (posYInput) state.style.offsetYPercent = Number(posYInput.value);
    if (alignSelect) state.style.align = alignSelect.value;
    if (lineGapInput) state.style.lineGap = Number(lineGapInput.value);
    if (opacityInput) state.style.opacity = Number(opacityInput.value);
    // 显示数值
    sizeTimeVal.textContent = String(state.style.sizeTime);
    sizeSubVal.textContent = String(state.style.sizeSub);
    if (posXVal) posXVal.textContent = String(state.style.offsetXPercent);
    if (posYVal) posYVal.textContent = String(state.style.offsetYPercent);
    if (lineGapVal) lineGapVal.textContent = String(state.style.lineGap.toFixed(2));
    if (opacityVal) opacityVal.textContent = String(state.style.opacity.toFixed(2));
    renderViewer();
  }

  colorInput.addEventListener('input', setStyleFromControls);
  sizeTimeInput.addEventListener('input', setStyleFromControls);
  sizeSubInput.addEventListener('input', setStyleFromControls);
  shadowCheck.addEventListener('change', setStyleFromControls);
  if (posXInput) posXInput.addEventListener('input', setStyleFromControls);
  if (posYInput) posYInput.addEventListener('input', setStyleFromControls);
  if (alignSelect) alignSelect.addEventListener('change', setStyleFromControls);
  if (lineGapInput) lineGapInput.addEventListener('input', setStyleFromControls);
  if (opacityInput) opacityInput.addEventListener('input', setStyleFromControls);

  globalLocationInput.addEventListener('input', () => {
    state.globalLocation = globalLocationInput.value.trim();
    renderViewer();
  });

  globalDateInput.addEventListener('input', () => {
    state.globalDate = globalDateInput.value.trim();
    renderViewer();
  });

  fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const url = URL.createObjectURL(file);
      let exifDate = null;
      try {
        const output = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
        const dt = output?.DateTimeOriginal || output?.CreateDate;
        if (dt) exifDate = new Date(dt);
      } catch (err) {
        console.warn('EXIF 解析失败:', err);
      }
      const fallback = new Date(file.lastModified || Date.now());
      const d = exifDate || fallback;
      state.items.push({
        id: crypto.randomUUID(),
        file,
        url,
        exifDate: d,
        meta: {
          time: formatTimeHM(d),
          date: '',
          location: ''
        }
      });
      autoOCRTime(state.items[state.items.length-1]);
    }
    renderViewer();
  });

  function renderViewer() {
    if (state.items.length === 0) {
      if (previewImg) previewImg.src = '';
      if (overlayDiv) overlayDiv.innerHTML = '<div class="wm-group" style="opacity:0.8"><div class="time" style="font-size:48px">请先上传图片</div><div class="meta" style="font-size:16px">支持批量上传，设置后逐张微调</div></div>';
      if (curTimeInput) curTimeInput.value = '';
      if (curDateInput) curDateInput.value = '';
    if (photoIndicator) photoIndicator.textContent = '0/0';
    if (photoNameSpan) photoNameSpan.textContent = '';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }
    const it = state.items[currentIndex];
    const locDefault = globalLocationInput.value.trim();
    previewImg.src = it.url;
    overlayDiv.style.color = state.style.color;
    overlayDiv.style.fontFamily = state.style.fontFamily;
    overlayDiv.style.opacity = state.style.opacity;

    const textAlign = state.style.align === 'left' ? 'left' : state.style.align === 'right' ? 'right' : 'center';
    const group = `
      <div class="wm-group" id="wm-group" style="text-align:${textAlign}">
        <div class="time" style="font-size:${state.style.sizeTime}px; ${state.style.shadow ? 'text-shadow: 0 2px 18px rgba(0,0,0,0.55);' : ''}">${it.meta.time}</div>
        <div class="meta" style="font-size:${state.style.sizeSub}px; margin-top:${(state.style.sizeTime * (state.style.lineGap - 1)).toFixed(0)}px; ${state.style.shadow ? 'text-shadow: 0 2px 10px rgba(0,0,0,0.45);' : ''}">
          <span class="date">${it.meta.date || globalDateInput.value.trim() || formatDateCN(it.exifDate)}</span>
          <span class="dot"></span>
          <span class="loc">${it.meta.location || globalLocationInput.value.trim() || ''}</span>
        </div>
      </div>`;
    overlayDiv.innerHTML = group;
    // 计算偏移（按当前显示尺寸的百分比）
    const w = previewImg.clientWidth || 0;
    const h = previewImg.clientHeight || 0;
    const dx = (state.style.offsetXPercent / 100) * w;
    const dy = (state.style.offsetYPercent / 100) * h;
    const wmGroup = document.getElementById('wm-group');
    if (wmGroup) wmGroup.style.transform = `translate(${dx}px, ${dy}px)`;

    curTimeInput.value = it.meta.time;
    curDateInput.value = it.meta.date;
    curLocationInput.value = it.meta.location;
  if (photoIndicator) photoIndicator.textContent = `${currentIndex+1}/${state.items.length}`;
  if (photoNameSpan) photoNameSpan.textContent = it.file?.name || '';
  prevBtn.disabled = state.items.length <= 1;
  nextBtn.disabled = state.items.length <= 1;
  }

  exportBtn.addEventListener('click', async () => {
    if (state.items.length === 0) return alert('请先上传图片');
    exportBtn.disabled = true;
    exportBtn.textContent = '正在导出...';
    try {
      const zip = new JSZip();
      for (const it of state.items) {
        const blob = await drawWithWatermark(it.file, {
          time: it.meta.time,
          date: (it.meta.date || globalDateInput.value.trim() || formatDateCN(it.exifDate)),
          location: (it.meta.location || globalLocationInput.value.trim()),
          style: { ...state.style, previewContainerW: document.getElementById('preview').clientWidth }
        });
        const name = (it.file.name || 'image').replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
        zip.file(`${name}_wm.jpg`, blob);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `watermarked_${Date.now()}.zip`);
    } catch (err) {
      console.error(err);
      alert('导出失败，请重试');
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = '一键全部导出';
    }
  });

  // 当前图片编辑（自动保存）
  function updateCurrent(k, val) {
    if (!state.items.length) return;
    const it = state.items[currentIndex];
    it.meta[k] = val;
    renderViewer();
  }
  curTimeInput.addEventListener('input', (e) => updateCurrent('time', e.target.value));
  curDateInput.addEventListener('input', (e) => updateCurrent('date', e.target.value));
  curLocationInput.addEventListener('input', (e) => updateCurrent('location', e.target.value));

  // 预览切换
  prevBtn.addEventListener('click', () => {
    if (!state.items.length) return;
    currentIndex = (currentIndex - 1 + state.items.length) % state.items.length;
    renderViewer();
  });
  nextBtn.addEventListener('click', () => {
    if (!state.items.length) return;
    currentIndex = (currentIndex + 1) % state.items.length;
    renderViewer();
  });

  // 键盘快捷操作：左右方向键切换图片
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { if (!prevBtn.disabled) prevBtn.click(); }
    if (e.key === 'ArrowRight') { if (!nextBtn.disabled) nextBtn.click(); }
  });

  // 设置面板：初始同步一次（不再使用弹窗）
  setStyleFromControls();
  applyAllBtn.addEventListener('click', () => {
    const d = globalDateInput.value.trim();
    const loc = globalLocationInput.value.trim();
    state.items.forEach(it => {
      if (d) it.meta.date = d;
      if (loc) it.meta.location = loc;
    });
    renderViewer();
  });

  // 识别时间（天色预估）
  ocrBtn.addEventListener('click', async () => {
    if (!state.items.length) return alert('请先上传图片');
    const it = state.items[currentIndex];
    await autoOCRTime(it);
  });

  async function autoOCRTime(it) {
    try {
      const img = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = it.url;
      });
      // 缩放到小画布取平均亮度
      const w = 256, h = 256;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = w; canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        // 感知亮度（线性近似）
        const luma = 0.2126*r + 0.7152*g + 0.0722*b; // 0-255
        sum += luma;
      }
      const avg = sum / (w*h);
      // 根据亮度范围估算时间段
      let candidates;
      if (avg >= 180) {
        candidates = [11,12,13,14]; // 正午/下午早段
      } else if (avg >= 150) {
        candidates = [9,10,15,16]; // 上午或下午
      } else if (avg >= 120) {
        candidates = [17,18,19]; // 傍晚
      } else if (avg >= 90) {
        candidates = [19,20,21]; // 晚上
      } else {
        candidates = [22,23,0,5,6]; // 深夜/清晨
      }
      const hour = candidates[Math.floor(Math.random()*candidates.length)];
      const minute = Math.floor(Math.random()*60);
      const pad = (n) => String(n).padStart(2,'0');
      it.meta.time = `${pad(hour)}:${pad(minute)}`;
      renderViewer();
    } catch (err) {
      // 任意随机时间作为兜底
      const hour = Math.floor(Math.random()*24);
      const minute = Math.floor(Math.random()*60);
      const pad = (n) => String(n).padStart(2,'0');
      it.meta.time = `${pad(hour)}:${pad(minute)}`;
      renderViewer();
    }
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    });
  }

  async function drawWithWatermark(file, { time, date, location, style }) {
    const img = await loadImageFromFile(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;

    // 绘制原图
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // 文本参数
    const color = style.color || '#FFFFFF';
    const fontFamily = style.fontFamily || 'Segoe UI, Noto Sans SC, Arial';
    const previewW = Math.min(Number(style.previewContainerW) || canvas.width, canvas.width);
    const scale = canvas.width / previewW;
    const sizeTime = (style.sizeTime || 72) * scale;
    const sizeSub = (style.sizeSub || 28) * scale;
    const useShadow = !!style.shadow;
    const opacity = Number(style.opacity ?? 1);

    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = opacity;

    if (useShadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 2;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }

    // 位置：基于居中并加偏移百分比
    const baseX = canvas.width / 2;
    const baseY = canvas.height * 0.45;
    const dx = (style.offsetXPercent / 100) * canvas.width;
    const dy = (style.offsetYPercent / 100) * canvas.height;
    const anchorX = baseX + dx;
    const anchorY = baseY + dy;

    // 绘制时间
    ctx.font = `600 ${sizeTime}px ${fontFamily}`;
    ctx.textAlign = style.align === 'left' ? 'left' : style.align === 'right' ? 'right' : 'center';
    ctx.fillText(time, anchorX, anchorY);

    // 次行：日期·点·地点
    ctx.font = `400 ${sizeSub}px ${fontFamily}`;
    const dateWidth = ctx.measureText(date).width;
    const locText = location || '';
    const locWidth = ctx.measureText(locText).width;
    const gap = sizeSub * 0.8; // 两侧间距
    const dotSize = Math.max(8 * scale, Math.floor(sizeSub * 0.35));
    const lineGapPx = (style.sizeTime || 72) * scale * (Number(style.lineGap ?? 1.2) - 1);
    const baseY2 = anchorY + (sizeTime * 1.0) + lineGapPx; // 行距调节

    if (style.align === 'center') {
      const totalWidth = dateWidth + gap + dotSize + gap + locWidth;
      const dateX = anchorX - totalWidth / 2 + dateWidth / 2;
      ctx.fillText(date, dateX, baseY2);
      const dotX = anchorX - totalWidth / 2 + dateWidth + gap + dotSize / 2;
      ctx.save();
      ctx.shadowColor = useShadow ? 'rgba(0,0,0,0.45)' : 'transparent';
      ctx.beginPath();
      ctx.fillStyle = '#ff2ea6';
      ctx.arc(dotX, baseY2, dotSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const locX = anchorX - totalWidth / 2 + dateWidth + gap + dotSize + gap + locWidth / 2;
      ctx.fillStyle = color;
      ctx.fillText(locText, locX, baseY2);
    } else if (style.align === 'left') {
      // 从 anchorX 作为左起点
      ctx.textAlign = 'left';
      const dateX = anchorX;
      ctx.fillText(date, dateX, baseY2);
      const dotX = anchorX + dateWidth + gap + dotSize / 2;
      ctx.save();
      ctx.shadowColor = useShadow ? 'rgba(0,0,0,0.45)' : 'transparent';
      ctx.beginPath();
      ctx.fillStyle = '#ff2ea6';
      ctx.arc(dotX, baseY2, dotSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const locX = anchorX + dateWidth + gap + dotSize + gap;
      ctx.fillStyle = color;
      ctx.fillText(locText, locX, baseY2);
    } else {
      // 右对齐：anchorX 作为右端点
      ctx.textAlign = 'right';
      const locX = anchorX;
      ctx.fillText(locText, locX, baseY2);
      const dotX = anchorX - locWidth - gap - dotSize / 2;
      ctx.save();
      ctx.shadowColor = useShadow ? 'rgba(0,0,0,0.45)' : 'transparent';
      ctx.beginPath();
      ctx.fillStyle = '#ff2ea6';
      ctx.arc(dotX, baseY2, dotSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const dateX = anchorX - locWidth - gap - dotSize - gap;
      ctx.fillStyle = color;
      ctx.fillText(date, dateX, baseY2);
    }

    // 输出 Blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    });
  }
})();
