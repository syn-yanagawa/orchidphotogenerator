/**
 * Botanical Plate Generator — 植物図鑑画像ジェネレータ
 *
 * 4:5（1600×2000px）の高解像度キャンバス上に、写真と5つのテキスト項目
 * （分類ラベル・学名・記載者/年・原産国・日付）を Times New Roman で配置し、
 * PNG / JPEG 画像として書き出すクライアントサイドアプリケーション。
 */

(() => {
  'use strict';

  /** 出力キャンバスの固定解像度（4:5 高解像度） */
  const CANVAS_WIDTH = 1600;
  const CANVAS_HEIGHT = 2000;

  /** フォントファミリー定義 */
  const FONT_SERIF = '"Times New Roman", Times, serif';
  const FONT_SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

  /** 写真フレームの配置定義（下部テキストのゆとりを確保した4:5バランス） */
  const PHOTO_FRAME = {
    x: 80,      // 左余白 5.0%
    y: 80,      // 上余白 4.0%
    width: 1440, // 幅 90.0%（右余白も 5.0%）
    height: 1608 // 高さ 80.4%（下端 84.4%）
  };

  /** 初期サンプル値 */
  const DEFAULT_VALUES = {
    taxonomy: 'Orchidaceae / Epidendroideae / Epidendreae / Laeliinae',
    scientificName: 'Cattleya maxima',
    authorYear: 'Lindl. 1833',
    origin: 'Ecuador, Peru',
    date: 'November 20th, 2026',
    templateId: 'classic-ivory'
  };

  /** ベース配色定義（アイボリー / ダーク） */
  const PALETTE_IVORY = {
    background: '#F5F1F0',
    stripBg: '#FFFFFF',
    stripBorder: null,
    stripText: '#111111',
    scientificName: '#0A0A0A',
    authorYear: '#1A1A1A',
    originLabel: '#1A1A1A',
    originValue: '#0A0A0A',
    date: '#1A1A1A',
    photoBorder: null,
    logoTint: '#111111', // アイボリー背景では黒ロゴに統一
    placeholderBg: '#231E26',
    placeholderText: 'rgba(245, 241, 240, 0.65)'
  };

  const PALETTE_DARK = {
    background: '#141413',
    stripBg: '#1F1E1C',
    stripBorder: '#3B3935',
    stripText: '#EDE8DF',
    scientificName: '#F6F2EA',
    authorYear: '#C9C2B6',
    originLabel: '#C9C2B6',
    originValue: '#F2ECE2',
    date: '#A8A095',
    photoBorder: 'rgba(255, 255, 255, 0.14)',
    logoTint: '#EDE8DF', // ダーク背景では沈まないようオフホワイトに着色
    placeholderBg: '#232220',
    placeholderText: 'rgba(237, 232, 223, 0.55)'
  };

  /** デザインテンプレート定義（配色 × 書体） */
  const TEMPLATES = {
    'classic-ivory': {
      ...PALETTE_IVORY,
      fontFamily: FONT_SERIF,
      fontScale: 1
    },
    'herbarium-dark': {
      ...PALETTE_DARK,
      fontFamily: FONT_SERIF,
      fontScale: 1
    },
    'helvetica-ivory': {
      ...PALETTE_IVORY,
      fontFamily: FONT_SANS,
      fontScale: 0.92
    },
    'helvetica-dark': {
      ...PALETTE_DARK,
      fontFamily: FONT_SANS,
      fontScale: 0.92
    }
  };

  /** アプリケーション状態 */
  const state = {
    image: null,
    logoImage: null,
    fileName: '',
    zoom: 1,
    offsetX: 0, // キャンバス座標系での水平オフセット
    offsetY: 0, // キャンバス座標系での垂直オフセット
    templateId: DEFAULT_VALUES.templateId,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragOriginOffsetX: 0,
    dragOriginOffsetY: 0
  };

  /** DOM要素の参照 */
  const elements = {
    canvas: document.getElementById('plateCanvas'),
    dropZone: document.getElementById('dropZone'),
    imageInput: document.getElementById('imageInput'),
    fileStatusText: document.getElementById('fileStatusText'),
    imageControls: document.getElementById('imageControls'),
    zoomSlider: document.getElementById('zoomSlider'),
    zoomValue: document.getElementById('zoomValue'),
    resetCropButton: document.getElementById('resetCropButton'),
    taxonomyInput: document.getElementById('taxonomyInput'),
    scientificNameInput: document.getElementById('scientificNameInput'),
    authorYearInput: document.getElementById('authorYearInput'),
    originInput: document.getElementById('originInput'),
    dateInput: document.getElementById('dateInput'),
    resetButton: document.getElementById('resetButton'),
    templateButtons: Array.from(document.querySelectorAll('.template-card')),
    downloadPngButton: document.getElementById('downloadPngButton'),
    downloadJpgButton: document.getElementById('downloadJpgButton')
  };

  const ctx = elements.canvas.getContext('2d');

  /**
   * 任意の字間（letter-spacing）を適用した文字列幅を計測する
   * @param {CanvasRenderingContext2D} context - Canvasコンテキスト
   * @param {string} text - 計測対象の文字列
   * @param {number} letterSpacing - 文字間隔（px）
   * @returns {number} 描画幅（px）
   */
  function measureSpacedText(context, text, letterSpacing) {
    if (!text) return 0;
    const chars = Array.from(text);
    let totalWidth = 0;
    for (let i = 0; i < chars.length; i++) {
      totalWidth += context.measureText(chars[i]).width;
      if (i < chars.length - 1) {
        totalWidth += letterSpacing;
      }
    }
    return totalWidth;
  }

  /**
   * 任意の字間（letter-spacing）を適用して1文字ずつテキストを描画する
   * ブラウザ間の ctx.letterSpacing 実装差をなくすための互換描画関数
   * @param {CanvasRenderingContext2D} context - Canvasコンテキスト
   * @param {string} text - 描画する文字列
   * @param {number} startX - 開始X座標
   * @param {number} y - Y座標
   * @param {number} letterSpacing - 文字間隔（px）
   */
  function drawSpacedText(context, text, startX, y, letterSpacing) {
    const chars = Array.from(text);
    let currentX = startX;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      context.fillText(ch, currentX, y);
      currentX += context.measureText(ch).width + letterSpacing;
    }
  }

  /**
   * 画像オフセットが写真フレームから白い隙間を作らない範囲にクランプする
   */
  function clampImageOffset() {
    if (!state.image) return;
    const { drawWidth, drawHeight } = getScaledImageDimensions();
    const maxOffsetX = Math.max(0, (drawWidth - PHOTO_FRAME.width) / 2);
    const maxOffsetY = Math.max(0, (drawHeight - PHOTO_FRAME.height) / 2);
    state.offsetX = Math.min(maxOffsetX, Math.max(-maxOffsetX, state.offsetX));
    state.offsetY = Math.min(maxOffsetY, Math.max(-maxOffsetY, state.offsetY));
  }

  /**
   * 現在のズーム倍率に基づく画像の描画サイズ（cover基準）を計算する
   * @returns {{ drawWidth: number, drawHeight: number }}
   */
  function getScaledImageDimensions() {
    const img = state.image;
    const scaleX = PHOTO_FRAME.width / img.naturalWidth;
    const scaleY = PHOTO_FRAME.height / img.naturalHeight;
    const baseScale = Math.max(scaleX, scaleY);
    const finalScale = baseScale * state.zoom;
    return {
      drawWidth: img.naturalWidth * finalScale,
      drawHeight: img.naturalHeight * finalScale
    };
  }

  /**
   * 写真エリアを描画する（画像未選択時はプレースホルダーを表示）
   * @param {Object} theme - 現在のテンプレート定義
   */
  function drawPhotoArea(theme) {
    const { x, y, width, height } = PHOTO_FRAME;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    if (state.image) {
      clampImageOffset();
      const { drawWidth, drawHeight } = getScaledImageDimensions();
      const drawX = x + (width - drawWidth) / 2 + state.offsetX;
      const drawY = y + (height - drawHeight) / 2 + state.offsetY;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(state.image, drawX, drawY, drawWidth, drawHeight);
    } else {
      // 画像未アップロード時の落ち着いたプレースホルダー背景
      const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
      gradient.addColorStop(0, theme.placeholderBg);
      gradient.addColorStop(1, '#141117');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height);

      // 中央ガイドメッセージ
      ctx.fillStyle = theme.placeholderText;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `italic ${Math.round(48 * theme.fontScale)}px ${theme.fontFamily}`;
      ctx.fillText('Upload a botanical photograph', x + width / 2, y + height / 2 - 28);
      ctx.font = `${Math.round(28 * theme.fontScale)}px ${theme.fontFamily}`;
      ctx.fillText('左パネルから画像をアップロードしてください', x + width / 2, y + height / 2 + 34);
    }

    ctx.restore();

    // テンプレートに写真枠線がある場合は描画
    if (theme.photoBorder) {
      ctx.save();
      ctx.strokeStyle = theme.photoBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
      ctx.restore();
    }
  }

  /**
   * 左上の縦配置分類ラベル（白帯＋90度回転テキスト）を描画する
   * @param {Object} theme - 現在のテンプレート定義
   * @param {string} taxonomyText - 分類テキスト
   */
  function drawTaxonomyStrip(theme, taxonomyText) {
    const trimmed = taxonomyText.trim();
    if (!trimmed) return;

    const stripX = 47;      // 写真左端(80)をちょうど中心にまたぐ位置
    const stripY = 58;      // 写真上端(80)よりわずかに上から開始
    const stripWidth = 64;  // キャンバス幅の 4.0%
    const paddingY = 26;
    const maxStripHeight = PHOTO_FRAME.y + PHOTO_FRAME.height - stripY - 24;

    // フォントサイズを基本 31px（書体比率補正付き）とし、長文なら自動縮小して帯に収める
    let fontSize = Math.round(31 * theme.fontScale);
    let letterSpacing = 2.6;
    ctx.font = `400 ${fontSize}px ${theme.fontFamily}`;
    let textWidth = measureSpacedText(ctx, trimmed, letterSpacing);

    const maxTextWidth = maxStripHeight - paddingY * 2;
    if (textWidth > maxTextWidth && maxTextWidth > 0) {
      const ratio = maxTextWidth / textWidth;
      fontSize = Math.max(18, Math.floor(fontSize * ratio));
      letterSpacing = Math.max(0.8, letterSpacing * ratio);
      ctx.font = `400 ${fontSize}px ${theme.fontFamily}`;
      textWidth = measureSpacedText(ctx, trimmed, letterSpacing);
    }

    const stripHeight = Math.min(maxStripHeight, textWidth + paddingY * 2);

    ctx.save();

    // 縦帯の背景矩形
    ctx.fillStyle = theme.stripBg;
    ctx.fillRect(stripX, stripY, stripWidth, stripHeight);

    if (theme.stripBorder) {
      ctx.strokeStyle = theme.stripBorder;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(stripX + 0.75, stripY + 0.75, stripWidth - 1.5, stripHeight - 1.5);
    }

    // テキストを時計回りに90度回転して上から下へ描画
    ctx.translate(stripX + stripWidth / 2, stripY + paddingY);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = theme.stripText;
    ctx.font = `400 ${fontSize}px ${theme.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // 視覚的な垂直中央補正（書体のベースライン特性に合わせて微調整）
    drawSpacedText(ctx, trimmed, 0, 1, letterSpacing);

    ctx.restore();
  }

  /**
   * 下部のテキスト群（学名・記載者と記載年・原産国・日付）を描画する
   * @param {Object} theme - 現在のテンプレート定義
   * @returns {number} 描画された日付テキストの幅（px、未入力時は 0）
   */
  function drawBottomTypography(theme) {
    const scientificName = elements.scientificNameInput.value.trim();
    const authorYear = elements.authorYearInput.value.trim();
    const originRaw = elements.originInput.value.trim();
    const dateText = elements.dateInput.value.trim();

    const leftX = PHOTO_FRAME.x;
    const maxLineWidth = PHOTO_FRAME.width;
    let measuredDateWidth = 0;

    // --- 1. 学名（Bold Italic） + 記載者と記載年（Regular） ---
    if (scientificName || authorYear) {
      const baselineY = 1790;
      let sciFontSize = Math.round(74 * theme.fontScale);
      let authorFontSize = Math.round(40 * theme.fontScale);
      let gap = 26;

      // 1行に収まるように必要に応じて自動スケール調整
      const measureCombinedWidth = () => {
        let width = 0;
        if (scientificName) {
          ctx.font = `700 italic ${sciFontSize}px ${theme.fontFamily}`;
          width += ctx.measureText(scientificName).width;
        }
        if (scientificName && authorYear) {
          width += gap;
        }
        if (authorYear) {
          ctx.font = `400 ${authorFontSize}px ${theme.fontFamily}`;
          width += ctx.measureText(authorYear).width;
        }
        return width;
      };

      const totalWidth = measureCombinedWidth();
      if (totalWidth > maxLineWidth) {
        const scale = maxLineWidth / totalWidth;
        sciFontSize = Math.max(36, Math.floor(sciFontSize * scale));
        authorFontSize = Math.max(22, Math.floor(authorFontSize * scale));
        gap = Math.max(12, Math.floor(gap * scale));
      }

      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      let cursorX = leftX;
      if (scientificName) {
        ctx.font = `700 italic ${sciFontSize}px ${theme.fontFamily}`;
        ctx.fillStyle = theme.scientificName;
        ctx.fillText(scientificName, cursorX, baselineY);
        cursorX += ctx.measureText(scientificName).width + gap;
      }

      if (authorYear) {
        ctx.font = `400 ${authorFontSize}px ${theme.fontFamily}`;
        ctx.fillStyle = theme.authorYear;
        ctx.fillText(authorYear, cursorX, baselineY);
      }

      ctx.restore();
    }

    // --- 2. 原産国（Native to : Regular + 国名 Bold） ---
    if (originRaw) {
      const baselineY = 1864;
      const hasPrefix = /^native\s+to\s*:/i.test(originRaw);
      const prefixText = hasPrefix ? '' : 'Native to : ';
      const valueText = originRaw;

      let originFontSize = Math.round(33 * theme.fontScale);
      ctx.font = `400 ${originFontSize}px ${theme.fontFamily}`;
      const prefixWidthInitial = prefixText ? ctx.measureText(prefixText).width : 0;
      ctx.font = `700 ${originFontSize}px ${theme.fontFamily}`;
      const valueWidthInitial = ctx.measureText(valueText).width;

      if (prefixWidthInitial + valueWidthInitial > maxLineWidth) {
        const scale = maxLineWidth / (prefixWidthInitial + valueWidthInitial);
        originFontSize = Math.max(20, Math.floor(originFontSize * scale));
      }

      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      let cursorX = leftX;
      if (prefixText) {
        ctx.font = `400 ${originFontSize}px ${theme.fontFamily}`;
        ctx.fillStyle = theme.originLabel;
        ctx.fillText(prefixText, cursorX, baselineY);
        cursorX += ctx.measureText(prefixText).width;
      }

      ctx.font = `700 ${originFontSize}px ${theme.fontFamily}`;
      ctx.fillStyle = theme.originValue;
      ctx.fillText(valueText, cursorX, baselineY);
      ctx.restore();
    }

    // --- 3. 日付（下部中央） ---
    if (dateText) {
      const baselineY = 1946;
      ctx.save();
      ctx.font = `400 ${Math.round(25 * theme.fontScale)}px ${theme.fontFamily}`;
      ctx.fillStyle = theme.date;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      measuredDateWidth = ctx.measureText(dateText).width;
      ctx.fillText(dateText, CANVAS_WIDTH / 2, baselineY);
      ctx.restore();
    }

    return measuredDateWidth;
  }

  /**
   * 日付のライン上で写真の右端にブランドロゴ（syn.）を描画する
   * @param {Object} theme - 現在のテンプレート定義
   * @param {number} dateWidth - 日付テキストの描画幅（px）
   */
  function drawBrandLogo(theme, dateWidth) {
    if (!state.logoImage) return;

    const logo = state.logoImage;
    // 日付のラインに上品に収まるサイズ（日付幅の約50%、基準110px）
    const baseWidth = dateWidth > 0 ? dateWidth * 0.5 : 110;
    const targetWidth = Math.min(130, Math.max(88, Math.round(baseWidth)));
    const targetHeight = Math.round(targetWidth * (logo.naturalHeight / logo.naturalWidth));

    // 写真フレーム右端に揃え、ロゴの文字ベースライン（yのディセンダー除く約72%位置）を日付ライン(1946)に合わせる
    const drawX = PHOTO_FRAME.x + PHOTO_FRAME.width - targetWidth;
    const drawY = Math.round(1946 - targetHeight * 0.72);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (theme.logoTint) {
      // ダークテンプレート時はオフスクリーンCanvasで単色着色してから合成
      const offscreen = document.createElement('canvas');
      offscreen.width = targetWidth;
      offscreen.height = targetHeight;
      const offCtx = offscreen.getContext('2d');
      offCtx.imageSmoothingEnabled = true;
      offCtx.imageSmoothingQuality = 'high';
      offCtx.drawImage(logo, 0, 0, targetWidth, targetHeight);
      offCtx.globalCompositeOperation = 'source-in';
      offCtx.fillStyle = theme.logoTint;
      offCtx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(offscreen, drawX, drawY);
    } else {
      ctx.drawImage(logo, drawX, drawY, targetWidth, targetHeight);
    }

    ctx.restore();
  }

  /**
   * キャンバス全体を再描画するメインレンダリング関数
   */
  function renderPlate() {
    const theme = TEMPLATES[state.templateId] || TEMPLATES['classic-ivory'];

    // 背景塗りつぶし
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 写真エリア
    drawPhotoArea(theme);

    // 左上の縦配置分類ラベル
    drawTaxonomyStrip(theme, elements.taxonomyInput.value);

    // 下部の学名・記載者・原産国・日付
    const dateWidth = drawBottomTypography(theme);

    // 日付下のブランドロゴ
    drawBrandLogo(theme, dateWidth);
  }

  /**
   * アップロードされた画像ファイルを読み込み、プレビューへ反映する
   * @param {File} file - ユーザーが選択した画像ファイル
   */
  function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        state.image = img;
        state.fileName = file.name;
        state.zoom = 1;
        state.offsetX = 0;
        state.offsetY = 0;

        elements.fileStatusText.textContent = `選択中: ${file.name}`;
        elements.imageControls.hidden = false;
        elements.zoomSlider.value = '1';
        elements.zoomValue.textContent = '100%';
        elements.canvas.classList.add('is-draggable');

        renderPlate();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  /**
   * 今日の日付を英語序数付きフォーマット（例: November 22nd, 2026）で返す
   * @returns {string}
   */
  function formatTodayEnglish() {
    const now = new Date();
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const day = now.getDate();
    const suffix = getOrdinalSuffix(day);
    return `${months[now.getMonth()]} ${day}${suffix}, ${now.getFullYear()}`;
  }

  /**
   * 日付の英語序数接尾辞（st / nd / rd / th）を返す
   * @param {number} day - 日（1〜31）
   * @returns {string}
   */
  function getOrdinalSuffix(day) {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  /**
   * 学名から安全な出力ファイル名を生成する
   * @param {string} extension - 拡張子（png / jpg）
   * @returns {string}
   */
  function buildDownloadFileName(extension) {
    const rawName = elements.scientificNameInput.value.trim() || 'botanical_plate';
    const sanitized = rawName
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    return `${sanitized || 'botanical_plate'}.${extension}`;
  }

  /**
   * 現在のキャンバスを指定フォーマットでダウンロードする
   * @param {'image/png'|'image/jpeg'} mimeType - 出力MIMEタイプ
   * @param {string} extension - ファイル拡張子
   */
  function downloadPlate(mimeType, extension) {
    renderPlate();
    const quality = mimeType === 'image/jpeg' ? 0.94 : undefined;
    const dataUrl = elements.canvas.toDataURL(mimeType, quality);

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = buildDownloadFileName(extension);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * イベントリスナーを初期化する
   */
  function bindEvents() {
    // テキスト入力のリアルタイム反映
    [
      elements.taxonomyInput,
      elements.scientificNameInput,
      elements.authorYearInput,
      elements.originInput,
      elements.dateInput
    ].forEach((input) => {
      input.addEventListener('input', renderPlate);
    });

    // 画像ファイル選択（クリック & キーボード）
    elements.dropZone.addEventListener('click', () => elements.imageInput.click());
    elements.dropZone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        elements.imageInput.click();
      }
    });

    elements.imageInput.addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      handleImageFile(file);
    });

    // ドラッグ＆ドロップでの画像読み込み
    ['dragenter', 'dragover'].forEach((eventName) => {
      elements.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        elements.dropZone.classList.add('is-dragover');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      elements.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        elements.dropZone.classList.remove('is-dragover');
      });
    });

    elements.dropZone.addEventListener('drop', (event) => {
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      handleImageFile(file);
    });

    // ズームスライダー
    elements.zoomSlider.addEventListener('input', () => {
      state.zoom = parseFloat(elements.zoomSlider.value);
      elements.zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
      renderPlate();
    });

    // 構図リセット
    elements.resetCropButton.addEventListener('click', () => {
      state.zoom = 1;
      state.offsetX = 0;
      state.offsetY = 0;
      elements.zoomSlider.value = '1';
      elements.zoomValue.textContent = '100%';
      renderPlate();
    });

    // プレビューキャンバス上でのドラッグによる写真位置調整
    elements.canvas.addEventListener('pointerdown', (event) => {
      if (!state.image) return;
      state.isDragging = true;
      state.dragStartX = event.clientX;
      state.dragStartY = event.clientY;
      state.dragOriginOffsetX = state.offsetX;
      state.dragOriginOffsetY = state.offsetY;
      elements.canvas.classList.add('is-dragging');
      elements.canvas.setPointerCapture(event.pointerId);
    });

    elements.canvas.addEventListener('pointermove', (event) => {
      if (!state.isDragging || !state.image) return;
      const rect = elements.canvas.getBoundingClientRect();
      const scaleToCanvasX = CANVAS_WIDTH / rect.width;
      const scaleToCanvasY = CANVAS_HEIGHT / rect.height;

      const deltaX = (event.clientX - state.dragStartX) * scaleToCanvasX;
      const deltaY = (event.clientY - state.dragStartY) * scaleToCanvasY;

      state.offsetX = state.dragOriginOffsetX + deltaX;
      state.offsetY = state.dragOriginOffsetY + deltaY;
      renderPlate();
    });

    const endDrag = () => {
      if (!state.isDragging) return;
      state.isDragging = false;
      elements.canvas.classList.remove('is-dragging');
    };

    elements.canvas.addEventListener('pointerup', endDrag);
    elements.canvas.addEventListener('pointercancel', endDrag);

    // テンプレート切り替え
    elements.templateButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextTemplate = button.dataset.template;
        if (!nextTemplate || !TEMPLATES[nextTemplate]) return;

        state.templateId = nextTemplate;
        elements.templateButtons.forEach((btn) => {
          const isSelected = btn === button;
          btn.classList.toggle('is-active', isSelected);
          btn.setAttribute('aria-pressed', String(isSelected));
        });
        renderPlate();
      });
    });

    // サンプル値リセット
    elements.resetButton.addEventListener('click', () => {
      elements.taxonomyInput.value = DEFAULT_VALUES.taxonomy;
      elements.scientificNameInput.value = DEFAULT_VALUES.scientificName;
      elements.authorYearInput.value = DEFAULT_VALUES.authorYear;
      elements.originInput.value = DEFAULT_VALUES.origin;
      elements.dateInput.value = formatTodayEnglish();

      state.templateId = DEFAULT_VALUES.templateId;
      elements.templateButtons.forEach((btn) => {
        const isSelected = btn.dataset.template === DEFAULT_VALUES.templateId;
        btn.classList.toggle('is-active', isSelected);
        btn.setAttribute('aria-pressed', String(isSelected));
      });
      renderPlate();
    });

    // PNG / JPEG ダウンロード
    elements.downloadPngButton.addEventListener('click', () => {
      downloadPlate('image/png', 'png');
    });

    elements.downloadJpgButton.addEventListener('click', () => {
      downloadPlate('image/jpeg', 'jpg');
    });
  }

  /**
   * ブランドロゴ（syn.）画像を読み込む
   */
  function loadBrandLogo() {
    const logoSrc = window.SYN_LOGO_DATA_URL || 'assets/syn-logo.png';
    const img = new Image();
    img.onload = () => {
      state.logoImage = img;
      renderPlate();
    };
    img.src = logoSrc;
  }

  /** 初期化処理 */
  function init() {
    elements.dateInput.value = formatTodayEnglish();
    bindEvents();
    loadBrandLogo();
    renderPlate();
  }

  init();
})();
