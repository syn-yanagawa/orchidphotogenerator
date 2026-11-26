# Botanical Plate Generator — 作業引き継ぎドキュメント

もう一台の Mac でそのまま開発・デザイン調整を引き継ぐための仕様書兼メモです。
新しい Mac 上の AI エージェントに作業を引き継ぐ際は、「`HANDOFF.md` を読んで続きの作業をして」と伝えるだけで同じ前提で作業できます。

---

## 1. プロジェクト概要

画像をアップロードし、5つのテキスト項目を入力すると、植物図鑑・標本プレート風の画像（4:5 高解像度）を生成・ダウンロードできるクライアントサイド Web アプリです。

- **リポジトリ**: `https://github.com/syn-yanagawa/orchidphotogenerator.git`
- **公開URL（GitHub Pages）**: `https://syn-yanagawa.github.io/orchidphotogenerator/`
- **実行形式**: ビルドツール・サーバー不要の純粋な HTML / CSS / JavaScript（`index.html` を直接ブラウザで開くだけでも動作）

---

## 2. ファイル構成

| ファイル | 役割 |
| --- | --- |
| `index.html` | 入力フォーム（画像アップロード・5テキスト項目・4テンプレート選択）とプレビュー／書き出しUI |
| `styles.css` | 2カラム制作ツールUI・レスポンシブスタイル（タブレット・スマホ対応） |
| `app.js` | HTML5 Canvas 2D API による高解像度描画エンジン、構図ドラッグ＆ズーム調整、PNG/JPEG 書き出し |
| `logo-data.js` | ブランドロゴ（`syn.`）の埋め込みData URL（ローカル `file://` 直開きでのCORS書き出しエラー防止） |
| `assets/syn-logo.png` | ブランドロゴ（`syn.`）原本画像（透過PNG） |
| `sample-image-data.js` | 初期プレビュー用サンプル写真（蘭）の埋め込みData URL（ローカル `file://` 直開きでのCORS書き出しエラー防止） |
| `assets/sample-orchid.jpg` | 初期プレビュー用サンプル写真（蘭）原本画像（JPEG） |
| `HANDOFF.md` | 本ドキュメント（引き継ぎ資料） |

---

## 3. 確定しているデザイン・機能仕様

### キャンバス・レイアウト仕様（オリジナルデザイン準拠）
- **出力解像度**: `1600 × 2000 px`（縦横比 **4:5**）
- **写真フレーム**:
  - 左余白 `80px`（5.0%）/ 右余白 `80px`（5.0%）→ 幅 `1440px`（90.0%）
  - 上余白 `80px`（4.0%）/ 高さ `1608px`（80.4%、下端 `1688px`・下部テキストのゆとりを確保）
  - `cover` 基準で自動フィット。アップロード後はズーム（100%〜300%）およびプレビュー上のドラッグで構図調整可能。
  - スマホでのページスクロールと両立するため、通常時は `#plateCanvas` を `touch-action: pan-y` にして縦スクロールを優先し、アップロード後の「位置調整: ON / OFF」トグルが ON のときのみタッチドラッグ（`touch-action: none`）を有効化（PC のマウスドラッグは常時有効）。
  - 画像未アップロード時はサンプル写真（`assets/sample-orchid.jpg`）に軽いブラー（`blur(10px)`）と薄い暗幕をかけて表示し、その上に `Upload a botanical photograph` / `画像をアップロードしてください` のガイドテキストを白文字＋ソフトシャドウで重ねて表示。
- **左上縦配置ラベル（分類）**:
  - `x = 47px`, `y = 58px`, `幅 = 64px`（写真の左端 `80px` をちょうど中心にまたぐ配置）
  - テキストは時計回りに 90 度回転して上から下へ描画。文字長に応じて帯の高さが自動伸縮（長すぎる場合はフォントサイズを自動縮小）。空欄時は帯自体を非表示。

### 5つのテキスト入力項目（「2. 種の情報」）＋ロゴ
※ 入力欄の見出しは英語、右側の小さい補足テキスト（`.field-note`）に日本語表記を配置。
1. **Taxonomy**（補足: 分類（科・亜科・族・亜族））: 左上縦帯（例: `Orchidaceae / Epidendroideae / Epidendreae / Laeliinae`）
2. **Species Name**（補足: 植物の学名）: 左下（`x = 80px`, `y = 1790px`）・**Bold Italic**（例: `Cattleya maxima`）
3. **Author & Year**（補足: 記載者と記載年）: 学名の右隣・**Regular**（例: `Lindl. 1833`）※ 学名＋記載者が幅 `1440px` を超える場合は自動で1行に縮小フィット
4. **Native to**（補足: 原産国）: 左下2行目（`x = 80px`, `y = 1864px`）・`Native to : `（Regular）＋ 入力テキスト（**Bold**）を自動整形（すでに `Native to:` を含む場合は重複させない）
5. **Date**（補足: 日付）: 下部中央（`x = 800px`, `y = 1946px`）・Regular。初期値として今日の日付（英語序数形式、例: `November 25th, 2026`）を自動入力（「今日の日付を入力」ボタンは削除済み）。
6. **ブランドロゴ（`syn.`）**: 日付のライン（`y = 1946px`）上で写真右端揃え（`x = 1520px` 右端）、常時表示（非表示トグルなし）。横幅は日付幅の約50%（基準 `110px`、範囲 `88〜130px`）。`s`・`n`・`.` のベースラインを日付ラインに揃え、**Ivory テンプレート時は黒（`#111111`）**、**Dark テンプレート時はオフホワイト（`#EDE8DF`）**に着色。

### 4種類のデザインテンプレート（配色 × 書体）
| テンプレートID | ボタン表示名 | 書体ラベル | 配色 | 書体 | サイズ補正 (`fontScale`) |
| --- | --- | --- | --- | --- | --- |
| `classic-ivory`（デフォルト） | Ivory | Times New Roman | 背景 `#F5F1F0` / 白帯 `#FFFFFF` | Times New Roman | `1.0` |
| `helvetica-ivory` | Ivory | Helvetica | 背景 `#F5F1F0` / 白帯 `#FFFFFF` | Helvetica | `0.92` |
| `herbarium-dark` | Dark | Times New Roman | 背景 `#141413` / 暗帯 `#1F1E1C` | Times New Roman | `1.0` |
| `helvetica-dark` | Dark | Helvetica | 背景 `#141413` / 暗帯 `#1F1E1C` | Helvetica | `0.92` |

### サイトUIデザイン仕様
- **ヘッダー**: PC・タブレットは3カラム構成（`grid-template-columns: 1fr auto 1fr`）。左に緑色の `syn.` ロゴ（`assets/syn-logo.png`・高さ `20px`）、中央にタイトル `Botanical Plate Generator`（`Times New Roman` Regular Italic・`0.98rem`・字間 `0.12em`）とサブタイトル `植物図鑑風画像ジェネレーター`（`0.56rem`・字間 `0.14em`）。モバイル（幅 `640px` 以下）ではロゴ左・タイトル＆サブタイトル右寄せ。
- **リセット導線**: 「2. 種の情報」見出しの右端に `初期サンプルに戻す` ボタン（青寄りグレー背景・直角）を配置（プレビュー下の出力サイズテキストは削除済み）。
- **配色・形状**: ページ背景は純白（`#ffffff`）。テキストボックス・ドロップゾーン・ボタン・テンプレートカード・プレビュー枠の角丸はすべて**直角（`0px`）**、縁のボーダーなし。各ボックス・テキストボックス内の背景色は青寄りのクールグレー（`#eef1f5`）。UI アクセントカラーはスレートチャコール系（`--accent: #2c3138` / `--accent-hover: #141413`）に統一し、緑色はヘッダーの `syn.` ロゴのみに限定。
- **テンプレートボタン**: 上段に `Ivory`（左: Times New Roman / 右: Helvetica）、下段に `Dark`（左: Times New Roman / 右: Helvetica）の2×2配置。スウォッチアイコン・書体名サブラベルなし、`0.84rem`・Regular・中央揃え（Times New Roman 字間 `0.08em` / Helvetica 字間 `0.065em`）。`Dark` の2ボタンはダーク背景（`#1a1918`）×オフホワイト文字（`#f5f1ea`）にカラー反転。選択中は白い余白を挟んだオフセット黒フレーム（`0 0 0 2px #ffffff, 0 0 0 3.5px #141413`）を表示。
- **サイト側フォント・余白**: 基本 UI は欧文 **Helvetica** ＋ 和文 **游ゴシック** の混植、テキストボックス内の学名（`.font-serif-italic` の Bold Italic）を除きサイト UI 側のウェイトはすべて **Regular（`400`）** に統一。欧文見出し・リンク・ボタン（`Taxonomy` 等の `.field-label`、`Kew POWO` / `OrchidRoots`、`Download` ボタン）は **Times New Roman Regular Italic** を適用（`.field-note` の日本語補足はゴシック体・立体を維持）。メイン領域（`.workspace`）はゆったりとした字間（`letter-spacing: 0.06em` 基準）・行間（`line-height: 1.85`）・広めの要素間余白を設定。
- **参考サイトリンク**: 「2. 種の情報」の下部に `参考サイト` 見出し＋横並びボタン（別タブ開き）を配置。
  - 左：**Kew POWO**（`https://powo.science.kew.org/`）
  - 右：**OrchidRoots**（`https://orchidroots.com/`）
- **フッター＆免責事項ポップアップ**: 游ゴシック Regular・`0.72rem` で `© 2026 Synonym` と「免責事項・著作権について」リンクを配置。クリックでサイト全体の明度を下げる暗幕オーバーレイ（`rgba(15, 16, 18, 0.56)`）の上に半透明の直角すりガラスボックスを表示（`×` ボタン・背景クリック・`Esc` キーで閉じる）。

### 出力機能
- **JPEG ダウンロードのみ**（品質 `0.94`、黒ボックス `#141413` 内に `Download` — `56px` 水平ボーダー — `JPEG・1600×2000px` を中央揃え・Times New Roman Regular Italic で配置）
- ファイル名は学名から自動生成（例: `Cattleya_maxima.jpg`）

---

## 4. 開発・運用上の注意点

1. **ビルド不要の構成を維持する**:
   - 外部ライブラリやビルドステップを増やさず、静的ファイルだけで完結させておくことで、ローカル直開き・GitHub Pages 公開の手軽さを維持できます。
2. **ブラウザ間の字間互換性**:
   - 左上縦帯のテキスト描画には `app.js` 内の自前ヘルパー `measureSpacedText()` / `drawSpacedText()` を使用しています（Safari / Chrome / iPadOS 間で `ctx.letterSpacing` の差異が出ないようにするため）。
3. **Helvetica のサイズ補正**:
   - Helvetica は Times New Roman より x-height・横幅が大きいため、`TEMPLATES` の `fontScale: 0.92` で視覚的なボリューム感を揃えています。
4. **コード規約**:
   - コード内のコメント・JSDoc はすべて**日本語**で記述する。
   - 変数名・関数名は分かりやすい**英語**で命名する（ローマ字禁止）。
5. **GitHub Pages の反映**:
   - `main` ブランチへ `git push` 後、反映まで約 30 秒〜1 分かかります。iPad / スマホで確認する際はキャッシュに注意して再読み込みしてください。
6. **運用ルール（AI エージェント向け）**:
   - ユーザーから「プルしてください」と指示されたら `git pull origin main` を実行する。
   - ユーザーから「コミット・プッシュ」と指示されたら、最新の変更内容を反映するよう `HANDOFF.md` も必ず更新した上でコミット・プッシュする。

---

## 5. もう一台の Mac でのセットアップ手順

### 初回クローン
```bash
git clone https://github.com/syn-yanagawa/orchidphotogenerator.git
cd orchidphotogenerator
```

### 作業前の同期（2回目以降）
```bash
git pull origin main
```

### ローカルでの動作確認
- Finder から `index.html` をダブルクリックしてブラウザで開くだけで確認できます。
- JS の構文チェック:
  ```bash
  node --check app.js
  ```

### 変更を GitHub Pages に反映する
```bash
git add index.html styles.css app.js HANDOFF.md
git commit -m "変更内容の要約"
git push origin main
```

---

## 6. 現在のステータス・次のステップ

- **現在の状態**:
  - 4テンプレート（Classic Ivory / Herbarium Dark × Times New Roman / Helvetica）実装済み
  - `syn.` ロゴ（日付ライン右端・黒/オフホワイト自動着色・常時表示）＆下部テキストのゆとりレイアウト調整済み
  - サイトUIを純白背景・直角ボーダーレス・青寄りグレー面（`#eef1f5`）・欧文 Helvetica ＋ 和文 游ゴシック に刷新済み
  - 「2. 種の情報」の見出し英語化（Taxonomy / Species Name / Author & Year / Native to / Date）＋日本語補足化、および参考サイトリンク（Kew POWO / OrchidRoots）設置済み
  - 画像未アップロード時のプレビューにサンプル蘭写真（軽いブラー＋ガイドテキスト重ね表示）を組み込み済み
  - UI 全体のレギュラー化・スレートチャコール統一・ヘッダー中央配置（モバイル右寄せ）・欧文 Times New Roman Regular Italic 化・ダウンロードボタン刷新・フッター（`© 2026 Synonym`）＆免責事項ポップアップ・スマホスクロール対策（「位置調整: ON / OFF」トグル）実装済み
  - GitHub Pages 公開・同期済み
- **次の予定**: 追加の細かいデザイン調整・機能追加があれば順次反映していくフェーズ。
